#!/usr/bin/env python3
"""Merge verified rows from x-edge-log.csv into edges.csv (x_digest wins on conflict)."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
X_LOG = ROOT / "data" / "research" / "x-edge-log.csv"
EDGES = ROOT / "data" / "edges.csv"

DROP_EDGE_KEYS = {
    ("flap", "uniswap", "partner_named"),
    ("cash-cat", "uniswap", "partner_named"),
}

EDGE_FIELDS = [
    "from_slug",
    "to_slug",
    "type",
    "label",
    "explanation",
    "confidence",
    "strength",
    "directed",
    "evidence_urls",
    "last_checked",
    "source",
    "reviewer_note",
]


def key(row: dict) -> tuple[str, str, str]:
    return (
        row["from_slug"].strip(),
        row["to_slug"].strip(),
        row["type"].strip(),
    )


def load_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main() -> int:
    existing = {key(r): r for r in load_csv(EDGES)}
    x_rows = load_csv(X_LOG)
    merged = 0
    added = 0

    for row in x_rows:
        fr = (row.get("from_slug") or "").strip()
        to = (row.get("to_slug") or "").strip()
        if not fr or not to:
            continue
        edge_type = (row.get("type") or "twitter_mention").strip()
        tweet = (row.get("tweet_url") or "").strip()
        evidence = tweet
        if evidence and "|" not in evidence:
            label = "X post" if "x.com/" in evidence else "Source"
            evidence = f"{evidence}|{label}"

        out = {
            "from_slug": fr,
            "to_slug": to,
            "type": edge_type,
            "label": (row.get("label") or "").strip(),
            "explanation": (row.get("explanation") or "").strip(),
            "confidence": (row.get("confidence") or "medium").strip(),
            "strength": (row.get("strength") or "moderate").strip(),
            "directed": "true",
            "evidence_urls": evidence,
            "last_checked": (row.get("digest_date") or "2026-07-16").strip(),
            "source": "x_digest",
            "reviewer_note": (row.get("reviewer_note") or "").strip(),
        }
        k = key(out)
        if k in existing:
            merged += 1
        else:
            added += 1
        existing[k] = out

    rows = sorted(existing.values(), key=lambda r: (r["from_slug"], r["to_slug"], r["type"]))
    rows = [
        r
        for r in rows
        if (r["from_slug"], r["to_slug"], r["type"]) not in DROP_EDGE_KEYS
    ]
    with EDGES.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=EDGE_FIELDS)
        w.writeheader()
        w.writerows(rows)

    print(f"Wrote {EDGES}: {len(rows)} edges (+{added} new, {merged} updated from x_digest)")
    return 0


if __name__ == "__main__":
    sys.exit(main())