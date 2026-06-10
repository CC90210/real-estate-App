"""PropFlow ↔ empire-harness canonical drift test (Fleet V3 wave-B adoption).

ADAPTIVE: scopes to whichever of the five known entry-point files actually exist
in this repo (a Next.js product carries only CLAUDE.md; an agent carries all five).
Makes "this repo's LOCKSTEP block drifted from the empire-harness canonical" a build
failure. Canonical vendored at .harness/LOCKSTEP_tool_discipline.md, pinned in
harness.lock. Upgrade path: bump empire-harness VERSION → re-vendor + re-pin → green.
"""
from __future__ import annotations
import hashlib
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWN_ENTRY_POINTS = ["CLAUDE.md", "GEMINI.md", "ANTIGRAVITY.md", "AGENTS.md", "OPENCODE.md"]
CANONICAL = ROOT / ".harness" / "LOCKSTEP_tool_discipline.md"
LOCK = ROOT / "harness.lock"
BLOCK_RE = re.compile(r"<!-- LOCKSTEP:tool_discipline -->.*?<!-- /LOCKSTEP:tool_discipline -->", re.DOTALL)


def _present_entry_points():
    return [n for n in KNOWN_ENTRY_POINTS if (ROOT / n).is_file()]


class TestHarnessCanonical(unittest.TestCase):
    def test_canonical_block_present(self):
        self.assertTrue(CANONICAL.is_file(), "vendored canonical LOCKSTEP block missing (.harness/)")

    def test_harness_lock_pins_canonical(self):
        self.assertTrue(LOCK.is_file(), "harness.lock missing — repo hasn't pinned empire-harness")
        lock = json.loads(LOCK.read_text(encoding="utf-8"))
        rel = ".harness/LOCKSTEP_tool_discipline.md"
        self.assertIn(rel, lock.get("files", {}), "harness.lock does not pin the canonical block")
        actual = hashlib.sha256(CANONICAL.read_bytes()).hexdigest()
        self.assertEqual(actual, lock["files"][rel],
                         "vendored canonical block was edited — re-sync from empire-harness, don't hand-edit")

    def test_at_least_one_entry_point_carries_the_block(self):
        present = _present_entry_points()
        self.assertTrue(present, "no entry-point file found (need at least CLAUDE.md)")
        carriers = [n for n in present if BLOCK_RE.search((ROOT / n).read_text(encoding="utf-8"))]
        self.assertTrue(carriers, f"none of {present} carry the LOCKSTEP block")

    def test_present_entry_points_match_canonical(self):
        canon = BLOCK_RE.search(CANONICAL.read_text(encoding="utf-8")).group(0)
        for name in _present_entry_points():
            text = (ROOT / name).read_text(encoding="utf-8")
            m = BLOCK_RE.search(text)
            if m is None:
                continue  # an entry point without the block is allowed only if another carries it
            self.assertEqual(m.group(0), canon,
                             f"{name} LOCKSTEP block drifted from the empire-harness canonical")


if __name__ == "__main__":
    unittest.main(verbosity=2)
