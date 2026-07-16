#!/usr/bin/env python3
"""Audit entity related fields and mine text for edge candidates."""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "rh-entities.csv"
OUT_DIR = ROOT / "data" / "research"
OUT_JSON = OUT_DIR / "edge-audit.json"
OUT_MD = OUT_DIR / "edge-audit.md"

CONF_RANK = {"high": 0, "medium": 1, "low": 2}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "entity"


def parse_related(raw: str) -> list[str]:
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def load_entities() -> list[dict]:
    rows = []
    seen: dict[str, int] = {}
    with CSV_PATH.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            slug = slugify(name)
            if slug in seen:
                seen[slug] += 1
                slug = f"{slug}-{seen[slug]}"
            else:
                seen[slug] = 0
            rows.append(
                {
                    "name": name,
                    "slug": slug,
                    "layer": (row.get("layer") or "").strip(),
                    "category": (row.get("category") or "").strip(),
                    "status": (row.get("status") or "").strip(),
                    "confidence": (row.get("confidence") or "low").strip(),
                    "related_names": parse_related(row.get("related") or ""),
                    "about": (row.get("about") or "").replace("|", "\n"),
                    "summary": (row.get("summary") or "").strip(),
                    "sources": (row.get("sources") or "").strip(),
                }
            )
    return rows


def resolve_slugs(entities: list[dict]) -> dict[str, str]:
    by_name: dict[str, str] = {}
    for e in entities:
        by_name[e["name"].lower()] = e["slug"]
        by_name[e["slug"]] = e["slug"]
    return by_name


def simulate_auto_fill(entities: list[dict]) -> set[tuple[str, str]]:
    """Pairs that export_entities_json adds when manual related < 2."""
    by_layer: dict[str, list[dict]] = defaultdict(list)
    for e in entities:
        by_layer[e["layer"]].append(e)
    for layer in by_layer:
        by_layer[layer].sort(
            key=lambda x: (CONF_RANK.get(x["confidence"], 9), x["name"])
        )

    auto: set[tuple[str, str]] = set()
    for e in entities:
        manual = len(e["related_names"])
        if manual >= 2:
            continue
        need = 3 - manual
        for peer in by_layer.get(e["layer"], []):
            if peer["slug"] == e["slug"]:
                continue
            auto.add((e["slug"], peer["slug"]))
            need -= 1
            if need <= 0:
                break
    return auto


def mine_text_candidates(entities: list[dict], by_name: dict[str, str]) -> list[dict]:
    names = sorted((e["name"] for e in entities), key=len, reverse=True)
    out = []
    for e in entities:
        blob = f"{e['about']}\n{e['summary']}"
        if not blob.strip():
            continue
        found = []
        for name in names:
            if name == e["name"]:
                continue
            if re.search(rf"\b{re.escape(name)}\b", blob, re.I):
                slug = by_name.get(name.lower())
                if slug and slug != e["slug"]:
                    found.append({"name": name, "slug": slug})
        for hit in found:
            out.append(
                {
                    "from_slug": e["slug"],
                    "from_name": e["name"],
                    "to_slug": hit["slug"],
                    "to_name": hit["name"],
                    "source": "text_mining",
                    "snippet": blob[:240].replace("\n", " "),
                }
            )
    return out


def main() -> int:
    entities = load_entities()
    by_name = resolve_slugs(entities)
    auto_pairs = simulate_auto_fill(entities)

    manual_edges = []
    missing_targets = []
    for e in entities:
        for n in e["related_names"]:
            to_slug = by_name.get(n.lower())
            if not to_slug:
                missing_targets.append({"from": e["name"], "related_name": n})
                continue
            pair = (e["slug"], to_slug)
            manual_edges.append(
                {
                    "from_slug": e["slug"],
                    "from_name": e["name"],
                    "to_slug": to_slug,
                    "to_name": n,
                    "would_auto_fill": pair in auto_pairs,
                    "same_layer": next(
                        (x["layer"] for x in entities if x["slug"] == to_slug), ""
                    )
                    == e["layer"],
                }
            )

    text_candidates = mine_text_candidates(entities, by_name)

    asymmetric = []
    edge_set = {(m["from_slug"], m["to_slug"]) for m in manual_edges}
    for a, b in edge_set:
        if (b, a) not in edge_set:
            asymmetric.append({"from": a, "to": b})

    degree: dict[str, int] = defaultdict(int)
    for a, b in edge_set:
        degree[a] += 1
        degree[b] += 1
    orphans = [e for e in entities if degree[e["slug"]] < 2]

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "entity_count": len(entities),
        "manual_edge_count": len(manual_edges),
        "unique_directed_pairs": len(edge_set),
        "auto_fill_candidates": len(auto_pairs),
        "asymmetric_pairs": len(asymmetric),
        "missing_targets": missing_targets,
        "text_mining_candidates": len(text_candidates),
        "orphans_under_2_links": [
            {"slug": e["slug"], "name": e["name"], "degree": degree[e["slug"]]}
            for e in orphans
        ],
        "manual_edges": manual_edges,
        "text_candidates": text_candidates[:80],
        "asymmetric_sample": asymmetric[:30],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        "# Edge audit",
        "",
        f"Generated: {payload['generated_at_utc']}",
        "",
        f"- Entities: **{payload['entity_count']}**",
        f"- Manual related pairs (CSV): **{payload['unique_directed_pairs']}**",
        f"- Would be auto-filled by export (if related &lt; 2): **{payload['auto_fill_candidates']}**",
        f"- Asymmetric pairs: **{payload['asymmetric_pairs']}**",
        f"- Text mining candidates: **{payload['text_mining_candidates']}**",
        "",
        "## Orphans (degree &lt; 2)",
        "",
    ]
    for o in payload["orphans_under_2_links"][:15]:
        lines.append(f"- {o['name']} (`{o['slug']}`) — {o['degree']} links")
    if missing_targets:
        lines.extend(["", "## Missing related name targets", ""])
        for m in missing_targets:
            lines.append(f"- {m['from']} → `{m['related_name']}` (unresolved)")
    lines.append("")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")
    print(
        f"entities={payload['entity_count']} edges={payload['unique_directed_pairs']} "
        f"text_candidates={payload['text_mining_candidates']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())