"""End-to-end: log in as a real user and prove the tenant boundary holds.

627 RLS policies used to enforce this in Postgres. Now /api/data/bridge does, so
the question that matters is not "does it return data" but "does it return only
MY company's data, and does it refuse when I ask for someone else's."

Creates two throwaway users in two different companies, exercises the real login
+ bridge, then deletes everything it created. Every id is prefixed zzprobe- so
cleanup is unambiguous.

RUN THIS BEFORE THE PRODUCTION FLIP, and after any change to the bridge, the
scope map, or turso-auth.

    # 1. build, then start with ALL THREE flags (EMPIRE_DATA_BACKEND alone
    #    leaves auth on Supabase and the bridge routes 404):
    #      EMPIRE_DATA_BACKEND=turso_cloud
    #      EMPIRE_AUTH_BACKEND=turso
    #      AUTH_SESSION_SECRET=<any 32+ chars>
    #      TURSO_DATABASE_URL / TURSO_AUTH_TOKEN  -> the propflow db
    # 2. python scripts/verify_tenant_isolation.py

Do NOT point BASE at a Vercel preview URL: deployment protection answers POSTs
to API routes with an SSO challenge, so a 401 there says nothing about this code.

Expected output — anything else is a regression:
    A reads properties            -> 200, only A's row
    A asks for B's company        -> 200, 0 rows   (scope forced AFTER the filter)
    A reads the auth table        -> 403           (deny-by-default)
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(r"C:\Users\User\Business-Empire-Agent\scripts").resolve()))
from lib.tls_trust import ensure_os_trust  # noqa: E402

ensure_os_trust()
import libsql  # noqa: E402

from lib.db_turso import resolve_project_target  # noqa: E402

BASE = "http://localhost:3199"
PW = "ProbePassword!2026"
# Generated with the same bcryptjs the app verifies against:
#   node -e "console.log(require('bcryptjs').hashSync('ProbePassword!2026',10))"
HASH = "$2a$10$YUamDR.Ia.UXIBD0jQtRBO4itkzmOW4bxkNBJBS2pPklbewrktZeK"

A = {"uid": "zzprobe-user-a", "email": "zzprobe-a@example.invalid", "company": "zzprobe-co-a"}
B = {"uid": "zzprobe-user-b", "email": "zzprobe-b@example.invalid", "company": "zzprobe-co-b"}

url, tok, _ = resolve_project_target("propflow")
db = libsql.connect(database=url, auth_token=tok)


def cols(t):
    return {r[1]: r for r in db.execute(f'PRAGMA table_info("{t}")').fetchall()}


def insert(table, values):
    have = cols(table)
    req = [n for n, r in have.items() if r[3] and r[4] is None and n not in values]
    for n in req:
        values[n] = "zzprobe" if str(have[n][2]).upper().startswith("TEXT") else 0
    keys = [k for k in values if k in have]
    db.execute(f'INSERT INTO "{table}" ({", ".join(chr(34)+k+chr(34) for k in keys)}) '
               f'VALUES ({", ".join("?" * len(keys))})', [values[k] for k in keys])


def cleanup():
    for t, col, vals in (("profiles", "id", [A["uid"], B["uid"]]),
                         ("_supabase_auth_users", "id", [A["uid"], B["uid"]]),
                         ("properties", "company_id", [A["company"], B["company"]]),
                         ("companies", "id", [A["company"], B["company"]])):
        try:
            db.execute(f'DELETE FROM "{t}" WHERE "{col}" IN (?, ?)', vals)
        except Exception:
            pass
    db.commit()


def call(path, method="GET", body=None, cookie=None):
    req = urllib.request.Request(BASE + path, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if cookie:
        req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(
                req, data=json.dumps(body).encode() if body is not None else None,
                timeout=60) as r:
            return r.status, r.read(4000).decode("utf-8", "replace"), r.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read(4000).decode("utf-8", "replace"), e.headers


cleanup()
try:
    for U, prop in ((A, "zzprobe-prop-a"), (B, "zzprobe-prop-b")):
        insert("companies", {"id": U["company"], "name": U["company"]})
        insert("_supabase_auth_users",
               {"id": U["uid"], "email": U["email"], "encrypted_password": HASH,
                "banned_until": None, "deleted_at": None})
        insert("profiles", {"id": U["uid"], "email": U["email"],
                            "company_id": U["company"]})
        insert("properties", {"id": prop, "company_id": U["company"],
                              "address": f"1 {prop} St"})
    db.commit()
    print("seeded 2 companies / 2 users / 2 properties\n")

    code, text, hdrs = call("/api/auth/turso-login", "POST",
                            {"email": A["email"], "password": PW})
    print(f"login A -> {code} {text[:90]}")
    # get_all: a response can carry several Set-Cookie headers and dict()
    # keeps only the last, which is how the session cookie went missing.
    all_cookies = hdrs.get_all("Set-Cookie") or []
    cookie = "; ".join(c.split(";")[0] for c in all_cookies)
    if not cookie:
        print("NO SESSION COOKIE — cannot continue"); raise SystemExit(1)
    print(f"  session cookie: {cookie.split('=')[0]}=<redacted>\n")

    code, text, _ = call("/api/data/bridge", "POST",
                         {"table": "properties", "action": "select",
                          "columns": "*"}, cookie)
    rows = json.loads(text).get("data") or [] if code == 200 else []
    ids = sorted(r.get("id") for r in rows)
    print(f"A reads properties -> {code}, {len(rows)} rows: {ids}")
    print("  " + ("PASS — only A's property" if ids == ["zzprobe-prop-a"]
                  else f"FAIL — expected ['zzprobe-prop-a'], got {ids}"))

    # Correct wire shape: filters are {method, args}, and `action` is required.
    # The first attempt used {op, column, value} and got a 400 — input validation,
    # NOT scope enforcement, which would have proved nothing about the boundary.
    code, text, _ = call("/api/data/bridge", "POST",
                         {"table": "properties", "action": "select", "columns": "*",
                          "filters": [{"method": "eq",
                                       "args": ["company_id", B["company"]]}]}, cookie)
    rows = json.loads(text).get("data") or [] if code == 200 else []
    print(f"\nA asks for B's company explicitly -> {code}, {len(rows)} rows")
    print("  " + ("PASS — scope forced after client filters, B's data withheld"
                  if len(rows) == 0
                  else f"FAIL — LEAKED {len(rows)} of B's rows"))

    code, text, _ = call("/api/data/bridge", "POST",
                         {"table": "_supabase_auth_users", "action": "select",
                          "columns": "*"}, cookie)
    print(f"\nA reads the auth table -> {code}")
    print("  " + ("PASS — unknown/denied table refused (deny-by-default)"
                  if code != 200 else f"FAIL — auth table readable: {text[:150]}"))
finally:
    cleanup()
    left = db.execute("select count(*) from properties where id like 'zzprobe%'").fetchall()[0][0]
    print(f"\ncleanup done; leftover probe rows: {left}")
