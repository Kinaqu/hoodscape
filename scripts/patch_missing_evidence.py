#!/usr/bin/env python3
"""Patch empty edge evidence via x-edge-log (merge wins) + entity sources (seed fallback)."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
X_LOG = ROOT / "data" / "research" / "x-edge-log.csv"
ENTITIES = ROOT / "data" / "rh-entities.csv"

X_FIELDS = [
    "digest_date",
    "from_slug",
    "to_slug",
    "type",
    "label",
    "explanation",
    "tweet_url",
    "author_tier",
    "confidence",
    "strength",
    "reviewer_note",
]

# Evidence for edges that currently have empty evidence arrays in graph.json
EDGE_EVIDENCE: list[dict] = [
    {
        "from_slug": "alchemy",
        "to_slug": "quicknode",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "QuickNode is named as a day-1 or launch partner in narratives around Alchemy. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://docs.robinhood.com/chain/connecting/|Connecting docs;https://www.alchemy.com/blog/robinhood-chain-mainnet-is-live-on-alchemy|Alchemy blog",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "allium",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around Allium. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://allium.so/blog/supporting-robinhood-chain-at-launch/|Allium blog;https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "allium",
        "to_slug": "chainlink",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Chainlink is named as a day-1 or launch partner in narratives around Allium. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom;https://allium.so/blog/supporting-robinhood-chain-at-launch/|Allium blog",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "blockscout",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around Blockscout. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://docs.robinhood.com/chain/connecting/|Connecting docs",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "cash-cat",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Ecosystem map adjacency",
        "explanation": "Cash Cat and NOXA Fun are mapped together in the RH Chain landscape as related venues or rails. Verify primary sources before interacting.",
        "tweet_url": "https://x.com/thedefiedge/status/2077709910591365630|X post",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "chainalysis",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around Chainalysis. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://www.chainalysis.com/blog/robinhood-chain-automatic-token-support/|Chainalysis blog;https://docs.robinhood.com/chain/connecting/|Connecting docs",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "chainalysis",
        "to_slug": "chainlink",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Chainlink is named as a day-1 or launch partner in narratives around Chainalysis. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://www.chainalysis.com/blog/robinhood-chain-automatic-token-support/|Chainalysis blog;https://www.prnewswire.com/news-releases/robinhood-chain-launches-and-adopts-chainlink-to-unlock-access-to-the-onchain-economy-for-millions-of-users-302816242.html|Chainlink PR",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "chainlink",
        "to_slug": "layerzero",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "LayerZero is named as a day-1 or launch partner in narratives around Chainlink. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom;https://x.com/LayerZero_Core/status/2072396480770674832|LayerZero X post",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "ethena",
        "to_slug": "usdg-paxos",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "USDG / Paxos is named as a day-1 or launch partner in narratives around Ethena. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://globaldollar.com/newsroom/usdg-is-now-available-on-robinhood-chain-as-the-lending-asset-in-robinhood-s-new-earn-product|USDG newsroom;https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "fireblocks",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around Fireblocks. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://www.linkedin.com/posts/fireblocks_robinhood-chain-mainnet-is-live-fireblocks-activity-7478162146296762368-cVWP|Fireblocks post;https://docs.robinhood.com/chain/connecting/|Connecting docs",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "fireblocks",
        "to_slug": "chainlink",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Chainlink is named as a day-1 or launch partner in narratives around Fireblocks. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://www.linkedin.com/posts/fireblocks_robinhood-chain-mainnet-is-live-fireblocks-activity-7478162146296762368-cVWP|Fireblocks post;https://www.prnewswire.com/news-releases/robinhood-chain-launches-and-adopts-chainlink-to-unlock-access-to-the-onchain-economy-for-millions-of-users-302816242.html|Chainlink PR",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "flap",
        "to_slug": "noxa-fun",
        "type": "competitive",
        "label": "Same job — competing rails",
        "explanation": "Flap and NOXA Fun compete for the same attention job (e.g. launchpad deploy volume). Competitive ranking ≠ quality or safety.",
        "tweet_url": "https://x.com/tomwanhh/status/2077686289541824987|X post;https://flap.sh/robinhood/board?lang=en|Flap board",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "flap",
        "to_slug": "pons",
        "type": "competitive",
        "label": "Same job — competing rails",
        "explanation": "Flap and Pons compete for the same attention job (e.g. launchpad deploy volume). Competitive ranking ≠ quality or safety.",
        "tweet_url": "https://x.com/tomwanhh/status/2077686289541824987|X post;https://flap.sh/robinhood/board?lang=en|Flap board",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "hoodz",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Ecosystem map adjacency",
        "explanation": "HOODZ and NOXA Fun are mapped together in the RH Chain landscape as related venues or rails. Verify primary sources before interacting.",
        "tweet_url": "https://defillama.com/chain/robinhood-chain|DefiLlama",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "layerzero",
        "to_slug": "chainlink",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Chainlink is named as a day-1 or launch partner in narratives around LayerZero. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom;https://docs.layerzero.network/v2/deployments/chains/robinhood-testnet|LayerZero docs",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "lighter",
        "to_slug": "uniswap",
        "type": "partner_named",
        "label": "Day-1 / launch partner (text)",
        "explanation": "Uniswap is named as a day-1 or launch partner in narratives around Lighter. Partner naming is orientation only — not performance or security endorsement. Uniswap appears in Lighter about/summary copy.",
        "tweet_url": "https://cryptobriefing.com/lighter-robinhood-chain-perpetual-trading/|CryptoBriefing;https://uniswap.org/|Uniswap",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "pleiades",
        "to_slug": "rialto",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Rialto is named as a day-1 or launch partner in narratives around Pleiades. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "pons",
        "to_slug": "noxa-fun",
        "type": "competitive",
        "label": "Same job — competing rails",
        "explanation": "Pons and NOXA Fun compete for the same attention job (e.g. launchpad deploy volume). Competitive ranking ≠ quality or safety.",
        "tweet_url": "https://x.com/tomwanhh/status/2077686289541824987|X post",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "privy",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around Privy. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://docs.robinhood.com/chain/connecting/|Connecting docs;https://docs.robinhood.com/chain/|Chain docs",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "quicknode",
        "to_slug": "alchemy",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Alchemy is named as a day-1 or launch partner in narratives around QuickNode. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://docs.robinhood.com/chain/connecting/|Connecting docs;https://www.quicknode.com/builders-guide/best/top-10-robinhood-chain-rpc-providers|QuickNode guide",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "rialto",
        "to_slug": "arcus",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Arcus is named as a day-1 or launch partner in narratives around Rialto. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "rialto",
        "to_slug": "pleiades",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Pleiades is named as a day-1 or launch partner in narratives around Rialto. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "slvr",
        "to_slug": "cash-cat",
        "type": "competitive",
        "label": "Attention-layer cluster",
        "explanation": "SLVR and Cash Cat are grouped in Hoodscape noise layer as gamified/meme attention samples on RH Chain.",
        "tweet_url": "https://x.com/thedefiedge/status/2077709910591365630|X post",
        "confidence": "low",
        "strength": "weak",
    },
    {
        "from_slug": "slvr",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Ecosystem map adjacency",
        "explanation": "SLVR and NOXA Fun are mapped together in the RH Chain landscape as related venues or rails. Verify primary sources before interacting.",
        "tweet_url": "https://defillama.com/chain/robinhood-chain|DefiLlama",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "swaphood",
        "to_slug": "robinswap",
        "type": "liquidity_stack",
        "label": "Liquidity / routing layer",
        "explanation": "SwapHood and RobinSwap occupy adjacent liquidity jobs on RH Chain (public AMM, prop venue, or aggregation). Volume on one venue does not imply depth on the other.",
        "tweet_url": "https://defillama.com/chain/robinhood-chain|DefiLlama",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "swaphood",
        "to_slug": "sheriff-exchange",
        "type": "liquidity_stack",
        "label": "Liquidity / routing layer",
        "explanation": "SwapHood and Sheriff Exchange occupy adjacent liquidity jobs on RH Chain (public AMM, prop venue, or aggregation). Volume on one venue does not imply depth on the other.",
        "tweet_url": "https://defillama.com/chain/robinhood-chain|DefiLlama",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "trm-labs",
        "to_slug": "blockaid",
        "type": "partner_named",
        "label": "Day-1 / launch partner",
        "explanation": "Blockaid is named as a day-1 or launch partner in narratives around TRM Labs. Partner naming is orientation only — not performance or security endorsement.",
        "tweet_url": "https://x.com/trmlabs/status/2072447956993581330|TRM X post;https://www.blockaid.io/blog/blockaid-brings-real-time-transaction-protection-to-robinhood-chain|Blockaid blog",
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "virtuals",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Ecosystem map adjacency",
        "explanation": "Virtuals and NOXA Fun are mapped together in the RH Chain landscape as related venues or rails. Verify primary sources before interacting.",
        "tweet_url": "https://robinhood.com/us/en/chain/|Chain page;https://defillama.com/chain/robinhood-chain|DefiLlama",
        "confidence": "high",
        "strength": "strong",
    },
]

ENTITY_SOURCES: dict[str, str] = {
    "Alchemy": "https://docs.robinhood.com/chain/connecting/|Connecting docs;https://www.alchemy.com/blog/robinhood-chain-mainnet-is-live-on-alchemy|Alchemy blog",
    "Allium": "https://allium.so/blog/supporting-robinhood-chain-at-launch/|Allium blog;https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom",
    "Blockscout": "https://docs.robinhood.com/chain/connecting/|Connecting docs",
    "Chainalysis": "https://www.chainalysis.com/blog/robinhood-chain-automatic-token-support/|Chainalysis blog",
    "Chainlink": "https://www.prnewswire.com/news-releases/robinhood-chain-launches-and-adopts-chainlink-to-unlock-access-to-the-onchain-economy-for-millions-of-users-302816242.html|Chainlink PR;https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom",
    "LayerZero": "https://x.com/LayerZero_Core/status/2072396480770674832|LayerZero X post;https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom",
    "QuickNode": "https://docs.robinhood.com/chain/connecting/|Connecting docs;https://www.quicknode.com/builders-guide/best/top-10-robinhood-chain-rpc-providers|QuickNode guide",
    "Privy": "https://docs.robinhood.com/chain/connecting/|Connecting docs",
    "Fireblocks": "https://www.linkedin.com/posts/fireblocks_robinhood-chain-mainnet-is-live-fireblocks-activity-7478162146296762368-cVWP|Fireblocks post",
    "TRM Labs": "https://x.com/trmlabs/status/2072447956993581330|TRM X post;https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/|Testnet newsroom",
    "Ethena": "https://globaldollar.com/newsroom/usdg-is-now-available-on-robinhood-chain-as-the-lending-asset-in-robinhood-s-new-earn-product|USDG newsroom",
    "Flap": "https://x.com/tomwanhh/status/2077686289541824987|X post;https://flap.sh/robinhood/board?lang=en|Flap board",
    "Pons": "https://x.com/tomwanhh/status/2077686289541824987|X post",
    "Pleiades": "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
    "Rialto": "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/|Newsroom",
    "Lighter": "https://cryptobriefing.com/lighter-robinhood-chain-perpetual-trading/|CryptoBriefing;https://lighter.xyz/|Lighter",
    "SwapHood": "https://defillama.com/chain/robinhood-chain|DefiLlama",
    "SLVR": "https://x.com/thedefiedge/status/2077709910591365630|X post",
    "HOODZ": "https://defillama.com/chain/robinhood-chain|DefiLlama",
    "Virtuals": "https://robinhood.com/us/en/chain/|Chain page",
    "Cash Cat": "https://x.com/thedefiedge/status/2077709910591365630|X post",
}


def patch_x_log() -> int:
    rows = []
    with X_LOG.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    by_key = {
        (r["from_slug"], r["to_slug"], r["type"]): r
        for r in rows
    }
    updated = 0
    for edge in EDGE_EVIDENCE:
        key = (edge["from_slug"], edge["to_slug"], edge["type"])
        row = {
            "digest_date": "2026-07-16",
            "from_slug": edge["from_slug"],
            "to_slug": edge["to_slug"],
            "type": edge["type"],
            "label": edge["label"],
            "explanation": edge["explanation"],
            "tweet_url": edge["tweet_url"],
            "author_tier": "0",
            "confidence": edge["confidence"],
            "strength": edge["strength"],
            "reviewer_note": "evidence-audit-2026-07-16",
        }
        if key in by_key:
            by_key[key].update(row)
        else:
            by_key[key] = row
        updated += 1

    out_rows = sorted(by_key.values(), key=lambda r: (r["from_slug"], r["to_slug"], r["type"]))
    with X_LOG.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=X_FIELDS)
        w.writeheader()
        w.writerows(out_rows)

    print(f"Patched {X_LOG}: {updated} edge evidence rows")
    return updated


def patch_entities() -> int:
    rows = []
    with ENTITIES.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    patched = 0
    for row in rows:
        name = (row.get("name") or "").strip()
        if name not in ENTITY_SOURCES:
            continue
        if (row.get("sources") or "").strip():
            continue
        row["sources"] = ENTITY_SOURCES[name]
        patched += 1

    with ENTITIES.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"Patched {ENTITIES}: {patched} entity source fields")
    return patched


def main() -> int:
    patch_x_log()
    patch_entities()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())