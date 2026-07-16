#!/usr/bin/env python3
"""Seed data/edges.csv from rh-entities.csv manual related + text mining."""

from __future__ import annotations

import csv
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "rh-entities.csv"
OUT_PATH = ROOT / "data" / "edges.csv"

FIELDS = [
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

OFFICIAL_SLUGS = {
    "robinhood-crypto",
    "robinhood-chain-docs",
    "robinhood-wallet",
    "robinhood-earn",
    "stock-tokens-official",
    "vlad-tenev",
}

EARN_STACK = {
    "morpho",
    "usdg-paxos",
    "spark",
    "ethena",
    "steakhouse",
    "maple",
}

LAUNCHPAD_SLUGS = {
    "noxa-fun",
    "pons",
    "flap",
    "4-fun",
    "sentry-launcher",
    "robinswap",
}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "entity"


def parse_related(raw: str) -> list[str]:
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def parse_sources(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    parts = []
    for chunk in raw.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "|" in chunk:
            parts.append(chunk)
        else:
            parts.append(f"{chunk}|Source")
    return ";".join(parts)


def infer_type(fr: dict, to: dict, fr_slug: str, to_slug: str) -> str:
    if fr_slug in OFFICIAL_SLUGS and to_slug in OFFICIAL_SLUGS:
        return "official_stack"
    if fr_slug == "robinhood-earn" and to_slug in EARN_STACK:
        return "lending_stack"
    if to_slug == "robinhood-earn" and fr_slug in EARN_STACK:
        return "lending_stack"
    if (fr.get("status") or "") == "day-1 partner" or (to.get("status") or "") == "day-1 partner":
        return "partner_named"
    if fr["layer"] == "infra" or to["layer"] == "infra":
        if fr["layer"] == "official" or to["layer"] == "official":
            return "infra_dependency"
        if fr_slug == "arbitrum" or to_slug == "arbitrum":
            return "infra_dependency"
    if fr_slug in LAUNCHPAD_SLUGS and to_slug in LAUNCHPAD_SLUGS:
        return "competitive"
    if fr["category"] in ("dex", "prop_amm", "aggregator") and to["category"] in (
        "dex",
        "prop_amm",
        "aggregator",
    ):
        return "liquidity_stack"
    if fr["layer"] == "official" or to["layer"] == "official":
        return "product_integration"
    if fr["layer"] == to["layer"]:
        return "shared_category"
    return "ecosystem_directory"


def infer_confidence(edge_type: str, fr: dict, to: dict) -> str:
    if edge_type in ("official_stack", "infra_dependency", "partner_named", "lending_stack"):
        return "high"
    if edge_type == "ecosystem_directory" and fr.get("_text_only"):
        return "medium"
    if edge_type == "shared_category":
        return "low"
    base = min(
        {"high": 0, "medium": 1, "low": 2}.get(fr.get("confidence"), 2),
        {"high": 0, "medium": 1, "low": 2}.get(to.get("confidence"), 2),
    )
    return {0: "high", 1: "medium", 2: "low"}[base]


def infer_strength(confidence: str, edge_type: str) -> str:
    if confidence == "high" and edge_type != "shared_category":
        return "strong"
    if confidence == "medium":
        return "moderate"
    return "weak"


def make_label(edge_type: str, fr: dict, to: dict) -> str:
    labels = {
        "official_stack": "Official product family",
        "infra_dependency": "Infrastructure dependency",
        "product_integration": "Product / UX integration",
        "ecosystem_directory": "Ecosystem map adjacency",
        "partner_named": "Day-1 / launch partner",
        "lending_stack": "Earn / lending stack",
        "liquidity_stack": "Liquidity / routing layer",
        "competitive": "Same job — competing rails",

        "shared_category": "Same layer (weak)",
    }
    return labels.get(edge_type, "Related entity")


def make_explanation(edge_type: str, fr: dict, to: dict) -> str:
    a, b = fr["name"], to["name"]
    templates = {
        "official_stack": f"{a} and {b} are official Robinhood Chain product surfaces in the same stack — verify each product's eligibility and docs separately.",
        "infra_dependency": f"{a} is linked to {b} as infrastructure the chain or apps rely on (RPC, oracle, L2 stack, bridge, or security). Infra presence is not an app safety review.",
        "product_integration": f"{a} is oriented as integrating with or routing through {b} in official or high-signal ecosystem copy. Confirm live deployments before assuming user exposure.",
        "partner_named": f"{b} is named as a day-1 or launch partner in narratives around {a}. Partner naming is orientation only — not performance or security endorsement.",
        "lending_stack": f"{a} and {b} sit in the Robinhood Earn / USDG / Morpho lending story on RH Chain. Yield, curator, and market parameters change — read primary docs.",
        "liquidity_stack": f"{a} and {b} occupy adjacent liquidity jobs on RH Chain (public AMM, prop venue, or aggregation). Volume on one venue does not imply depth on the other.",
        "competitive": f"{a} and {b} compete for the same attention job (e.g. launchpad deploy volume). Competitive ranking ≠ quality or safety.",

        "shared_category": f"{a} and {b} share a landscape category — weak adjacency for orientation, not a verified integration.",
        "ecosystem_directory": f"{a} and {b} are mapped together in the RH Chain landscape as related venues or rails. Verify primary sources before interacting.",
    }
    return templates.get(edge_type, templates["ecosystem_directory"])


def load_rows() -> list[dict]:
    rows = []
    seen_slugs: dict[str, int] = {}
    with CSV_PATH.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("name") or "").strip()
            if not name:
                continue
            slug = slugify(name)
            if slug in seen_slugs:
                seen_slugs[slug] += 1
                slug = f"{slug}-{seen_slugs[slug]}"
            else:
                seen_slugs[slug] = 0
            rows.append(
                {
                    "name": name,
                    "slug": slug,
                    "layer": (row.get("layer") or "").strip(),
                    "category": (row.get("category") or "").strip(),
                    "status": (row.get("status") or "").strip(),
                    "confidence": (row.get("confidence") or "low").strip(),
                    "related_names": parse_related(row.get("related") or ""),
                    "about": (row.get("about") or "").replace("|", " "),
                    "summary": (row.get("summary") or "").strip(),
                    "sources": parse_sources(row.get("sources") or ""),
                    "last_seen": (row.get("last_seen") or str(date.today())).strip(),
                }
            )
    return rows


def main() -> int:
    entities = load_rows()
    by_name = {e["name"].lower(): e for e in entities}
    by_slug = {e["slug"]: e for e in entities}

    edges: dict[tuple[str, str, str], dict] = {}
    today = str(date.today())

    for fr in entities:
        for rel_name in fr["related_names"]:
            to = by_name.get(rel_name.lower())
            if not to or to["slug"] == fr["slug"]:
                continue
            edge_type = infer_type(fr, to, fr["slug"], to["slug"])
            conf = infer_confidence(edge_type, fr, to)
            if edge_type == "shared_category" and conf == "low":
                continue
            key = (fr["slug"], to["slug"], edge_type)
            evidence = fr["sources"] or to["sources"]
            edges[key] = {
                "from_slug": fr["slug"],
                "to_slug": to["slug"],
                "type": edge_type,
                "label": make_label(edge_type, fr, to),
                "explanation": make_explanation(edge_type, fr, to),
                "confidence": conf,
                "strength": infer_strength(conf, edge_type),
                "directed": "true",
                "evidence_urls": evidence,
                "last_checked": fr["last_seen"] or today,
                "source": "csv_manual",
                "reviewer_note": "",
            }

    names = sorted((e["name"] for e in entities), key=len, reverse=True)
    for fr in entities:
        blob = f"{fr['about']} {fr['summary']}"
        for name in names:
            if name == fr["name"]:
                continue
            if not re.search(rf"\b{re.escape(name)}\b", blob, re.I):
                continue
            to = by_name.get(name.lower())
            if not to or to["slug"] == fr["slug"]:
                continue
            if any(
                e["to_slug"] == to["slug"]
                for e in edges.values()
                if e["from_slug"] == fr["slug"]
            ):
                continue
            fr_copy = {**fr, "_text_only": True}
            edge_type = infer_type(fr_copy, to, fr["slug"], to["slug"])
            if edge_type == "shared_category":
                continue
            key = (fr["slug"], to["slug"], edge_type)
            if key in edges:
                continue
            conf = infer_confidence(edge_type, fr_copy, to)
            edges[key] = {
                "from_slug": fr["slug"],
                "to_slug": to["slug"],
                "type": edge_type,
                "label": make_label(edge_type, fr, to) + " (text)",
                "explanation": make_explanation(edge_type, fr, to)
                + f" {to['name']} appears in {fr['name']} about/summary copy.",
                "confidence": conf,
                "strength": infer_strength(conf, edge_type),
                "directed": "true",
                "evidence_urls": fr["sources"],
                "last_checked": fr["last_seen"] or today,
                "source": "text_mining",
                "reviewer_note": "auto from about/summary",
            }

    rows_out = sorted(
        edges.values(),
        key=lambda r: (r["from_slug"], r["to_slug"], r["type"]),
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows_out)

    print(f"Wrote {OUT_PATH} ({len(rows_out)} edges)")
    by_type: dict[str, int] = {}
    for r in rows_out:
        by_type[r["type"]] = by_type.get(r["type"], 0) + 1
    print("by_type", by_type)
    return 0


if __name__ == "__main__":
    sys.exit(main())