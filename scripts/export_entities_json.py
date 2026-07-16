#!/usr/bin/env python3
"""Export data/rh-entities.csv → public/data for the site."""

from __future__ import annotations

import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "rh-entities.csv"
EDGES_PATH = ROOT / "data" / "edges.csv"
PARTNERSHIPS_PATH = ROOT / "data" / "partnerships.csv"
OUT_ENTITIES = ROOT / "data" / "entities.json"
SNAP_DIR = ROOT / "data" / "snapshots"
SITE_PUBLIC = ROOT / "public" / "data"

GLYPH_BY_CATEGORY = {
    "official": "seal",
    "docs": "seal",
    "wallet": "wallet",
    "wallet_infra": "wallet",
    "lending": "lend",
    "curator": "lend",
    "yield": "lend",
    "yield_aggregator": "lend",
    "stablecoin": "lend",
    "rwa": "chart",
    "dex": "swap",
    "prop_amm": "swap",
    "aggregator": "swap",
    "perps": "leverage",
    "prediction": "odds",
    "oracle": "node",
    "rpc": "node",
    "explorer": "node",
    "infra": "node",
    "data": "signal",
    "bridge": "bridge",
    "compliance": "shield",
    "security": "shield",
    "custody": "shield",
    "launchpad": "rocket",
    "agent": "bot",
    "meme": "spark",
    "gamified": "spark",
    "gaming": "spark",
}

HERO_SLUGS = {
    "robinhood-crypto",
    "robinhood-wallet",
    "robinhood-earn",
    "stock-tokens-official",
    "arbitrum",
    "chainlink",
    "alchemy",
    "layerzero",
    "blockaid",
    "uniswap",
    "morpho",
    "1inch",
    "arcus",
    "noxa-fun",
    "defillama-rh-chain",
    "usdg-paxos",
}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "entity"


def parse_sources(raw: str) -> list[dict]:
    out = []
    raw = (raw or "").strip()
    if not raw:
        return out
    for part in raw.split(";"):
        part = part.strip()
        if not part:
            continue
        if "|" in part:
            url, label = part.split("|", 1)
            out.append({"url": url.strip(), "label": label.strip() or url.strip()})
        else:
            out.append({"url": part, "label": part})
    return out


def parse_related(raw: str) -> list[str]:
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def domain_from_url(url: str) -> str:
    if not url:
        return ""
    try:
        u = url if "://" in url else "https://" + url
        d = urlparse(u).netloc.lower()
        return d[4:] if d.startswith("www.") else d
    except Exception:
        return ""


def monogram(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9 ]+", " ", name).strip()
    parts = [p for p in cleaned.split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        p = parts[0]
        return (p[:2] if len(p) > 1 else p[:1]).upper()
    return (parts[0][0] + parts[1][0]).upper()


def hue_from_slug(slug: str) -> int:
    h = 0
    for ch in slug:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h % 360


def weight_for(slug: str, layer: str, confidence: str, tvl) -> str:
    if slug in HERO_SLUGS:
        return "hero"
    if tvl and tvl >= 1_000_000:
        return "hero"
    if confidence == "low" or layer in ("noise", "media"):
        return "quiet"
    return "std"


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
            notes = (row.get("notes") or "").strip()
            job = (row.get("job_one_liner") or notes or "").strip()
            summary = (row.get("summary") or job or notes).strip()
            about = (row.get("about") or "").strip().replace("|", "\n\n")
            website = (row.get("primary_url") or "").strip()
            logo = (row.get("logo") or "").strip()
            domain = domain_from_url(website)
            if not domain and logo and "domain=" in logo:
                m = re.search(r"domain=([^&]+)", logo)
                if m:
                    domain = m.group(1)
            slug = slugify(name)
            category = (row.get("category") or "").strip()
            layer = (row.get("layer") or row.get("type") or "noise").strip()
            confidence = (row.get("confidence") or "low").strip()
            status = (row.get("status") or "").strip()
            glyph = GLYPH_BY_CATEGORY.get(category, "node")
            if layer == "media" and category == "data":
                glyph = "signal"
            if layer == "noise":
                glyph = GLYPH_BY_CATEGORY.get(category, "spark")

            entity = {
                "id": f"e{i+1:03d}",
                "slug": slug,
                "name": name,
                "type": (row.get("type") or "").strip(),
                "layer": layer,
                "category": category,
                "twitter": tw,
                "website": website,
                "logo": logo,
                "job": job,
                "notes": notes,
                "summary": summary,
                "about": about,
                "status": status,
                "related_names": parse_related(row.get("related") or ""),
                "risks": (row.get("risks") or "").strip(),
                "sources": parse_sources(row.get("sources") or ""),
                "confidence": confidence,
                "last_checked": (row.get("last_seen") or "").strip(),
                "tvl_rh": None,
                "tags": [],
                "display": {
                    "monogram": monogram(name),
                    "hue": hue_from_slug(slug),
                    "glyph": glyph,
                    "logo_domain": domain,
                    "avatar_kind": "logo" if logo else ("favicon" if domain else "monogram"),
                    "weight": "std",  # filled after tvl merge
                },
            }
            for key in ("category", "type", "layer", "status"):
                v = entity.get(key)
                if v and v not in entity["tags"]:
                    entity["tags"].append(v)
            rows.append(entity)

    seen: dict[str, int] = {}
    for e in rows:
        base = e["slug"]
        if base not in seen:
            seen[base] = 0
        else:
            seen[base] += 1
            e["slug"] = f"{base}-{seen[base]}"
            e["display"]["hue"] = hue_from_slug(e["slug"])

    by_name = {e["name"].lower(): e["slug"] for e in rows}
    by_layer: dict[str, list] = {}
    conf_rank = {"high": 0, "medium": 1, "low": 2}
    for e in rows:
        by_layer.setdefault(e["layer"], []).append(e)
    for layer, items in by_layer.items():
        items.sort(key=lambda x: (conf_rank.get(x.get("confidence"), 9), x["name"]))

    for e in rows:
        related = []
        seen_s = set()
        for n in e.pop("related_names", []):
            slug = by_name.get(n.lower())
            if slug and slug != e["slug"] and slug not in seen_s:
                related.append({"name": n, "slug": slug})
                seen_s.add(slug)
        if len(related) < 2:
            for peer in by_layer.get(e["layer"], []):
                if peer["slug"] == e["slug"] or peer["slug"] in seen_s:
                    continue
                related.append({"name": peer["name"], "slug": peer["slug"]})
                seen_s.add(peer["slug"])
                if len(related) >= 3:
                    break
        e["related"] = related
    return rows


def load_latest_snapshot() -> dict | None:
    if not SNAP_DIR.exists():
        return None
    files = sorted(SNAP_DIR.glob("*.json"), reverse=True)
    if not files:
        return None
    return json.loads(files[0].read_text(encoding="utf-8"))


# Hoodscape entity slug → DefiLlama protocol slug(s). Multiple slugs are summed.
TVL_LLAMA_SLUGS: dict[str, list[str]] = {
    "morpho": ["morpho-blue"],
    "uniswap": ["uniswap-v2", "uniswap-v3", "uniswap-v4"],
    "arcus": ["arcus-perps"],
    "spark": ["spark-savings", "spark-liquidity-layer"],
    "noxa-fun": ["noxa-fun"],
    "swaphood": ["swaphood-v2", "swaphood-v3"],
    "curve": ["curve-dex"],
    "sheriff-exchange": ["sheriff-v2", "sheriff-v3"],
    "pancakeswap": ["pancakeswap-amm-v3", "pancakeswap-amm"],
    "meridian-predict": ["meridian-predict"],
    "dexfi-aggregator": ["dexfi-aggregator"],
    "slvr": ["slvr"],
    "symbiosis": ["symbiosis"],
    "sentry": ["sentry"],
    "robinswap": ["robinswap-v2", "robinswap-v3"],
    "aeon-protocol": ["aeon-protocol"],
    "based-alpha": ["based-alpha"],
    "hoodit": ["hoodit"],
    "frothswap": ["frothswap"],
    "hoodbets": ["hoodbets"],
    "robinfun": ["robinfun"],
    "hoodz": ["hoodz"],
    "ymym-meme": ["ymym.meme"],
    "hoodpump": ["hoodpump"],
    "arrowpad": ["arrowpad"],
}


def sum_tvl_for_slugs(by_slug: dict[str, dict], slugs: list[str]) -> float | None:
    total = 0.0
    found = False
    for slug in slugs:
        row = by_slug.get(slug)
        if not row:
            continue
        val = row.get("tvl_rh")
        if val is None:
            continue
        total += float(val)
        found = True
    return total if found else None


def merge_tvl(entities: list[dict], snapshot: dict | None) -> None:
    if not snapshot:
        for e in entities:
            e["display"]["weight"] = weight_for(
                e["slug"], e["layer"], e["confidence"], None
            )
        return

    protos = snapshot.get("protocols_all") or snapshot.get("protocols_top") or []
    by_slug = {p["slug"]: p for p in protos if p.get("slug")}
    by_tw: dict[str, dict] = {}
    by_name: dict[str, dict] = {}
    for p in protos:
        tw = (p.get("twitter") or "").lower().lstrip("@")
        if tw and tw not in by_tw:
            by_tw[tw] = p
        n = (p.get("name") or "").lower()
        if n and n not in by_name:
            by_name[n] = p

    for e in entities:
        slug = e["slug"]
        tvl = sum_tvl_for_slugs(by_slug, TVL_LLAMA_SLUGS.get(slug, []))
        if tvl is None:
            tw = e["twitter"].lower().lstrip("@")
            hit = by_tw.get(tw) if tw else None
            if not hit:
                n = e["name"].lower()
                hit = by_name.get(n)
            if hit and hit.get("tvl_rh") is not None:
                tvl = float(hit["tvl_rh"])
        if tvl is not None and tvl > 0:
            e["tvl_rh"] = tvl
            e["tvl_source"] = "defillama"
            e["tvl_as_of_utc"] = snapshot.get("as_of_utc")
        e["display"]["weight"] = weight_for(
            e["slug"], e["layer"], e["confidence"], e.get("tvl_rh")
        )


def parse_evidence_urls(raw: str) -> list[dict]:
    out = []
    raw = (raw or "").strip()
    if not raw:
        return out
    for part in raw.split(";"):
        part = part.strip()
        if not part:
            continue
        if "|" in part:
            pieces = [p.strip() for p in part.split("|")]
            url = pieces[0]
            label = pieces[1] if len(pieces) > 1 else url
            item: dict = {"url": url, "label": label or url}
            if len(pieces) > 2 and pieces[2]:
                item["proves"] = pieces[2]
            out.append(item)
        else:
            out.append({"url": part, "label": part})
    return out


def load_edges(entities: list[dict]) -> list[dict]:
    path = PARTNERSHIPS_PATH if PARTNERSHIPS_PATH.exists() else EDGES_PATH
    if not path.exists():
        return []
    slugs = {e["slug"] for e in entities}
    edges = []
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fr = (row.get("from_slug") or "").strip()
            to = (row.get("to_slug") or "").strip()
            if not fr or not to or fr not in slugs or to not in slugs:
                continue
            edges.append(
                {
                    "from": fr,
                    "to": to,
                    "type": (row.get("type") or "").strip(),
                    "label": (row.get("label") or "").strip(),
                    "explanation": (row.get("explanation") or "").strip(),
                    "confidence": (row.get("confidence") or "low").strip(),
                    "strength": (row.get("strength") or "weak").strip(),
                    "directed": (row.get("directed") or "true").strip().lower() == "true",
                    "evidence": parse_evidence_urls(row.get("evidence_urls") or ""),
                    "last_checked": (row.get("last_checked") or "").strip(),
                    "source": (row.get("source") or "").strip(),
                }
            )
    return edges


def build_graph(entities: list[dict], edges: list[dict]) -> dict:
    nodes = [
        {
            "id": e["slug"],
            "name": e["name"],
            "layer": e["layer"],
            "confidence": e.get("confidence"),
            "category": e.get("category"),
            "weight": (e.get("display") or {}).get("weight", "std"),
        }
        for e in entities
    ]
    return {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "edge_types": sorted({e["type"] for e in edges if e.get("type")}),
        "nodes": nodes,
        "edges": edges,
        "disclaimer": "NFA. Graph shows verified partner announcements only — not competition, map adjacency, or co-mentions.",
    }


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
    edges = load_edges(entities)
    graph = build_graph(entities, edges)
    graph_path = SITE_PUBLIC / "graph.json"
    graph_path.write_text(json.dumps(graph, indent=2), encoding="utf-8")
    (ROOT / "data" / "graph.json").write_text(json.dumps(graph, indent=2), encoding="utf-8")
    print(f"Wrote {SITE_PUBLIC / 'entities.json'}")
    print(f"Wrote {SITE_PUBLIC / 'pulse.json'}")
    print(f"Wrote {graph_path} ({len(edges)} edges)")
    kinds = {}
    for e in entities:
        k = e["display"]["avatar_kind"]
        kinds[k] = kinds.get(k, 0) + 1
    print("avatar_kind", kinds)
    return 0


if __name__ == "__main__":
    sys.exit(main())
