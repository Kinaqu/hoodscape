#!/usr/bin/env python3
"""Snapshot Robinhood Chain metrics from public DefiLlama APIs.

Writes:
  - data/snapshots/YYYY-MM-DD.json
  - data/snapshots/YYYY-MM-DD.md
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CHAIN = "Robinhood Chain"
CHAIN_ENC = urllib.parse.quote(CHAIN)
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "snapshots"


def get_json(url: str, timeout: int = 60):
    req = urllib.request.Request(url, headers={"User-Agent": "rh-llama-snapshot/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    chains = get_json("https://api.llama.fi/v2/chains")
    chain_row = next((c for c in chains if c.get("name") == CHAIN), None)

    hist = get_json(f"https://api.llama.fi/v2/historicalChainTvl/{CHAIN_ENC}")
    stables = get_json("https://stablecoins.llama.fi/stablecoinchains")
    stable_row = next((s for s in stables if s.get("name") == CHAIN), None)

    dexs = get_json(f"https://api.llama.fi/overview/dexs/{CHAIN_ENC}")
    try:
        fees = get_json(f"https://api.llama.fi/overview/fees/{CHAIN_ENC}")
    except Exception as e:
        fees = {"error": str(e)}

    protocols = get_json("https://api.llama.fi/protocols")
    rh_protocols = []
    for p in protocols:
        ctvl = p.get("chainTvls") or {}
        chains_list = p.get("chains") or []
        if CHAIN in ctvl or CHAIN in chains_list:
            rh_protocols.append(
                {
                    "name": p.get("name"),
                    "slug": p.get("slug"),
                    "category": p.get("category"),
                    "tvl_total": p.get("tvl"),
                    "tvl_rh": ctvl.get(CHAIN),
                    "twitter": p.get("twitter"),
                    "url": p.get("url"),
                }
            )
    rh_protocols.sort(key=lambda x: (x.get("tvl_rh") or 0), reverse=True)

    snapshot = {
        "as_of_utc": now_iso,
        "chain": CHAIN,
        "chain_id": (chain_row or {}).get("chainId"),
        "tvl": (chain_row or {}).get("tvl"),
        "tvl_history_latest": hist[-1] if hist else None,
        "stablecoins_circulating_usd": (stable_row or {})
        .get("totalCirculatingUSD", {})
        .get("peggedUSD"),
        "dex": {
            "total24h": dexs.get("total24h"),
            "total7d": dexs.get("total7d"),
            "total30d": dexs.get("total30d"),
            "change_1d": dexs.get("change_1d"),
            "change_7d": dexs.get("change_7d"),
            "protocol_count": len(dexs.get("protocols") or []),
        },
        "fees": {
            "total24h": fees.get("total24h") if isinstance(fees, dict) else None,
            "total7d": fees.get("total7d") if isinstance(fees, dict) else None,
            "error": fees.get("error") if isinstance(fees, dict) else None,
        },
        "protocols_on_chain_count": len(rh_protocols),
        "protocols_top": rh_protocols[:20],
        "sources": [
            "https://api.llama.fi/v2/chains",
            f"https://api.llama.fi/v2/historicalChainTvl/{CHAIN_ENC}",
            "https://stablecoins.llama.fi/stablecoinchains",
            f"https://api.llama.fi/overview/dexs/{CHAIN_ENC}",
            f"https://api.llama.fi/overview/fees/{CHAIN_ENC}",
            "https://api.llama.fi/protocols",
            "https://defillama.com/chain/robinhood-chain",
        ],
        "disclaimer": "NFA. Public DefiLlama metrics only. Not investment advice.",
    }

    json_path = OUT_DIR / f"{today}.json"
    md_path = OUT_DIR / f"{today}.md"
    json_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    def usd(n):
        if n is None:
            return "n/a"
        return f"${n:,.0f}"

    lines = [
        f"# Robinhood Chain snapshot — {today}",
        "",
        f"**As of (UTC):** {now_iso}",
        "",
        "> NFA. Public DefiLlama metrics only.",
        "",
        "## Headline",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Chain ID | {snapshot.get('chain_id')} |",
        f"| DeFi TVL | {usd(snapshot.get('tvl'))} |",
        f"| Stablecoins (pegged USD circ.) | {usd(snapshot.get('stablecoins_circulating_usd'))} |",
        f"| DEX vol 24h | {usd(snapshot['dex'].get('total24h'))} |",
        f"| DEX vol 7d | {usd(snapshot['dex'].get('total7d'))} |",
        f"| Fees 24h | {usd(snapshot['fees'].get('total24h'))} |",
        f"| Fees 7d | {usd(snapshot['fees'].get('total7d'))} |",
        f"| Protocols on chain (Llama) | {snapshot.get('protocols_on_chain_count')} |",
        "",
        "## Top protocols by RH TVL",
        "",
        "| Protocol | Category | TVL on RH | Twitter |",
        "|----------|----------|-----------|---------|",
    ]
    for p in snapshot["protocols_top"]:
        tw = f"@{p['twitter']}" if p.get("twitter") else ""
        lines.append(
            f"| {p.get('name')} | {p.get('category')} | {usd(p.get('tvl_rh'))} | {tw} |"
        )
    lines += ["", "## Sources", ""]
    for s in snapshot["sources"]:
        lines.append(f"- {s}")
    lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"TVL={snapshot.get('tvl')} DEX24h={snapshot['dex'].get('total24h')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
