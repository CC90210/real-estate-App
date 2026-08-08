/** Cookie-verified identity for the browser client; DELETE signs out. */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, tursoAuthActive, verifySession } from "@/lib/supabase/turso-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!tursoAuthActive()) return NextResponse.json({ user: null }, { status: 404 });
  const session = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: session.sub, email: session.email } });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
