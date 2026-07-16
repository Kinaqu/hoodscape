#!/usr/bin/env python3
"""Export data/rh-entities.csv → public/data for the site."""

from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "rh-entities.csv"
OUT_ENTITIES = ROOT / "data" / "entities.json"
SNAP_DIR = ROOT / "data" / "snapshots"
SITE_PUBLIC = ROOT / "public" / "data"


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "entity"


def load_csv() -> list[dict]:
    rows = []
    with CSV_PATH.open(encoding="utf-8") as f:
        for i, row in enumerate(csv.DictReader(f)):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            tw = (row.get("twitter") or "").strip()
            if tw and not tw.startswith("@"):
                tw = f"@{tw}"
            entity = {
                "id": f"e{i+1:03d}",
                "slug": slugify(name),
                "name": name,
                "type": (row.get("type") or "").strip(),
                "layer": (row.get("layer") or row.get("type") or "noise").strip(),
                "category": (row.get("category") or "").strip(),
                "twitter": tw,
                "website": (row.get("primary_url") or "").strip(),
                "job": (row.get("job_one_liner") or row.get("notes") or "").strip(),
                "notes": (row.get("notes") or "").strip(),
                "confidence": (row.get("confidence") or "low").strip(),
                "last_checked": (row.get("last_seen") or "").strip(),
                "tvl_rh": None,
                "tags": [],
            }
            for key in ("category", "type", "layer"):
                v = entity.get(key)
                if v and v not in entity["tags"]:
                    entity["tags"].append(v)
            rows.append(entity)
    seen = {}
    for e in rows:
        base = e["slug"]
        if base not in seen:
            seen[base] = 0
        else:
            seen[base] += 1
            e["slug"] = f"{base}-{seen[base]}"
    return rows


def load_latest_snapshot() -> dict | None:
    if not SNAP_DIR.exists():
        return None
    files = sorted(SNAP_DIR.glob("*.json"), reverse=True)
    if not files:
        return None
    return json.loads(files[0].read_text(encoding="utf-8"))


def merge_tvl(entities: list[dict], snapshot: dict | None) -> None:
    if not snapshot:
        return
    protos = snapshot.get("protocols_top") or []
    by_tw = {}
    by_name = {}
    for p in protos:
        tw = (p.get("twitter") or "").lower().lstrip("@")
        if tw:
            by_tw[tw] = p
        n = (p.get("name") or "").lower()
        by_name[n] = p
        base = re.sub(r"\s+v[2-4]$", "", n)
        base = base.replace(" blue", "").replace(" amm", "").replace(" fun", "")
        by_name[base] = p

    for e in entities:
        tw = e["twitter"].lower().lstrip("@")
        hit = by_tw.get(tw) if tw else None
        if not hit:
            n = e["name"].lower()
            hit = by_name.get(n)
            if not hit:
                for k, p in by_name.items():
                    if n in k or k in n:
                        hit = p
                        break
        if hit and hit.get("tvl_rh") is not None:
            e["tvl_rh"] = hit["tvl_rh"]


def build_pulse(snapshot: dict | None) -> dict:
    if not snapshot:
        return {
            "as_of_utc": None,
            "chain_id": 4663,
            "tvl": None,
            "stablecoins": None,
            "dex_24h": None,
            "dex_7d": None,
            "fees_24h": None,
            "protocol_count": None,
            "source": "missing snapshot — run scripts/rh_llama_snapshot.py",
        }
    return {
        "as_of_utc": snapshot.get("as_of_utc"),
        "chain_id": snapshot.get("chain_id") or 4663,
        "tvl": snapshot.get("tvl"),
        "stablecoins": snapshot.get("stablecoins_circulating_usd"),
        "dex_24h": (snapshot.get("dex") or {}).get("total24h"),
        "dex_7d": (snapshot.get("dex") or {}).get("total7d"),
        "fees_24h": (snapshot.get("fees") or {}).get("total24h"),
        "protocol_count": snapshot.get("protocols_on_chain_count"),
        "source": "https://defillama.com/chain/robinhood-chain",
    }


def main() -> int:
    entities = load_csv()
    snapshot = load_latest_snapshot()
    merge_tvl(entities, snapshot)
    pulse = build_pulse(snapshot)

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(entities),
        "layers": [
            "official",
            "infra",
            "defi",
            "launchpad",
            "agents",
            "media",
            "noise",
        ],
        "entities": entities,
        "disclaimer": "NFA. Orientation map only. Not investment advice. Listings are not endorsements.",
    }

    OUT_ENTITIES.parent.mkdir(parents=True, exist_ok=True)
    OUT_ENTITIES.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_ENTITIES} ({len(entities)} entities)")

    SITE_PUBLIC.mkdir(parents=True, exist_ok=True)
    (SITE_PUBLIC / "entities.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    (SITE_PUBLIC / "pulse.json").write_text(json.dumps(pulse, indent=2), encoding="utf-8")
    print(f"Wrote {SITE_PUBLIC / 'entities.json'}")
    print(f"Wrote {SITE_PUBLIC / 'pulse.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
