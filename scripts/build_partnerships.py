#!/usr/bin/env python3
"""Build data/partnerships.csv — mind-map edges with explicit partner announcements only."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDGES_PATH = ROOT / "data" / "edges.csv"
OUT_PATH = ROOT / "data" / "partnerships.csv"

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

OFFICIAL = {
    "robinhood-crypto",
    "robinhood-chain-docs",
    "robinhood-wallet",
    "robinhood-earn",
    "stock-tokens-official",
    "vlad-tenev",
}

PARTNERSHIP_TYPES = {
    "partner_named",
    "product_integration",
    "lending_stack",
    "official_stack",
    "infra_dependency",
}

# Evidence must come from an announcer naming a partner — not leaderboards / map adjacency.
VALID_EVIDENCE_HOSTS = (
    "robinhood.com",
    "docs.robinhood.com",
    "alchemy.com/blog",
    "allium.so/blog",
    "blockaid.io/blog",
    "chainalysis.com/blog",
    "prnewswire.com",
    "globaldollar.com/newsroom",
    "x.com/RobinhoodCrypto",
    "x.com/LayerZero_Core",
    "x.com/trmlabs",
    "linkedin.com/posts/fireblocks",
)

EXCLUDE_KEYS = {
    # Leaderboard / competition — not partnerships
    ("flap", "noxa-fun", "competitive"),
    ("flap", "pons", "competitive"),
    ("noxa-fun", "flap", "competitive"),
    ("noxa-fun", "pons", "competitive"),
    ("pons", "flap", "competitive"),
    ("pons", "noxa-fun", "competitive"),
    ("pons", "4-fun", "competitive"),
    ("4-fun", "flap", "competitive"),
    ("4-fun", "noxa-fun", "competitive"),
    ("4-fun", "pons", "competitive"),
    # Co-listed infra — RH partners with each, not with each other
    ("alchemy", "quicknode", "partner_named"),
    ("allium", "alchemy", "partner_named"),
    ("allium", "chainlink", "partner_named"),
    ("chainalysis", "alchemy", "partner_named"),
    ("chainalysis", "chainlink", "partner_named"),
    ("chainlink", "layerzero", "partner_named"),
    ("fireblocks", "alchemy", "partner_named"),
    ("fireblocks", "chainlink", "partner_named"),
    ("layerzero", "chainlink", "partner_named"),
    ("privy", "alchemy", "partner_named"),
    ("quicknode", "alchemy", "partner_named"),
    ("blockscout", "alchemy", "partner_named"),
    ("trm-labs", "blockaid", "partner_named"),
    ("ethena", "usdg-paxos", "partner_named"),
    ("pleiades", "rialto", "partner_named"),
    ("rialto", "pleiades", "partner_named"),
    ("rialto", "arcus", "partner_named"),
    # Text-mining / generic homepage evidence
    ("robinhood-crypto", "arbitrum", "partner_named"),
}

TESTNET = "https://robinhood.com/us/en/newsroom/robinhood-chain-launches-public-testnet/"
MAINNET = "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/"
CHAIN = "https://robinhood.com/us/en/chain/"
DOCS = "https://docs.robinhood.com/chain/"
CONNECTING = "https://docs.robinhood.com/chain/connecting/"
EARN = "https://robinhood.com/us/en/crypto/earn/"


def evidence_valid(raw: str) -> bool:
    raw = (raw or "").lower()
    if not raw.strip():
        return False
    return any(host in raw for host in VALID_EVIDENCE_HOSTS)


def row_key(row: dict) -> tuple[str, str, str]:
    return (row["from_slug"], row["to_slug"], row["type"])


def partnership_template(fr: str, to: str, announcer: str, partner: str) -> tuple[str, str]:
    """Rewrite generic seed copy into announcer-names-partner language."""
    label = "Official partner announcement"
    explanation = (
        f"{announcer} names {partner} as a partner in an official launch or integration announcement. "
        "Orientation only — not performance or security endorsement."
    )
    if fr in OFFICIAL:
        label = "RH names launch partner"
        explanation = (
            f"Robinhood ({announcer}) names {partner} as a day-1 / launch partner in official newsroom or product copy."
        )
    elif to in OFFICIAL:
        label = "Partner announces RH integration"
        explanation = (
            f"{announcer} publishes a partner announcement naming Robinhood Chain / {partner} integration."
        )
    return label, explanation


def curated_missing() -> list[dict]:
    """RH → partner edges from official announcements (not in filtered seed)."""
    today = "2026-07-16"
    rows = []

    def add(fr, to, typ, label, expl, evidence, conf="high", strength="strong"):
        rows.append(
            {
                "from_slug": fr,
                "to_slug": to,
                "type": typ,
                "label": label,
                "explanation": expl,
                "confidence": conf,
                "strength": strength,
                "directed": "true",
                "evidence_urls": evidence,
                "last_checked": today,
                "source": "partnerships",
                "reviewer_note": "official-announcement",
            }
        )

    # Testnet newsroom: RH names infra partners
    for slug, name in [
        ("alchemy", "Alchemy"),
        ("allium", "Allium"),
        ("chainlink", "Chainlink"),
        ("layerzero", "LayerZero"),
        ("trm-labs", "TRM Labs"),
    ]:
        add(
            "robinhood-chain-docs",
            slug,
            "partner_named",
            "RH names testnet partner",
            f"Robinhood testnet newsroom names {name} as an infrastructure partner integrating with Robinhood Chain.",
            f"{TESTNET}|Testnet newsroom|Robinhood announces {name} as testnet infrastructure partner",
        )

    # Connecting docs: RH recommends Alchemy + lists QuickNode
    add(
        "robinhood-chain-docs",
        "alchemy",
        "infra_dependency",
        "Recommended RPC partner",
        "Robinhood Chain docs name Alchemy as the recommended infrastructure provider for builders.",
        f"{CONNECTING}|Connecting docs|Docs recommend Alchemy for Robinhood Chain RPC",
    )
    add(
        "robinhood-chain-docs",
        "quicknode",
        "infra_dependency",
        "Supported RPC provider",
        "Robinhood Chain docs list QuickNode as a supported RPC provider for the network.",
        f"{CONNECTING}|Connecting docs|Docs list QuickNode as supported RPC provider",
    )

    # Mainnet newsroom trading / DeFi partners
    for slug, name in [
        ("uniswap", "Uniswap"),
        ("rialto", "Rialto"),
        ("morpho", "Morpho"),
    ]:
        add(
            "robinhood-crypto",
            slug,
            "partner_named",
            "RH names mainnet partner",
            f"Robinhood mainnet newsroom names {name} in the day-1 trading / ecosystem partner set.",
            f"{MAINNET}|Mainnet newsroom|Robinhood announces {name} in mainnet launch partner list",
        )

    add(
        "robinhood-wallet",
        "blockaid",
        "product_integration",
        "Security partner (Wallet)",
        "Blockaid announces real-time transaction protection for Robinhood Chain builders and Wallet-adjacent flows.",
        "https://www.blockaid.io/blog/blockaid-brings-real-time-transaction-protection-to-robinhood-chain|Blockaid blog|Blockaid announces Robinhood Chain security partnership",
    )

    add(
        "alchemy",
        "robinhood-chain-docs",
        "partner_named",
        "Alchemy × RH Chain",
        "Alchemy announces Robinhood Chain mainnet is live on Alchemy infrastructure.",
        "https://www.alchemy.com/blog/robinhood-chain-mainnet-is-live-on-alchemy|Alchemy blog|Alchemy announces Robinhood Chain mainnet on its platform",
    )

    add(
        "allium",
        "robinhood-chain-docs",
        "partner_named",
        "Allium × RH Chain",
        "Allium announces support for Robinhood Chain at launch.",
        "https://allium.so/blog/supporting-robinhood-chain-at-launch/|Allium blog|Allium announces Robinhood Chain data support at launch",
    )

    add(
        "chainlink",
        "robinhood-crypto",
        "partner_named",
        "Chainlink × RH Chain",
        "Chainlink press release: Robinhood Chain adopts Chainlink as official data and cross-chain oracle partner.",
        "https://www.prnewswire.com/news-releases/robinhood-chain-launches-and-adopts-chainlink-to-unlock-access-to-the-onchain-economy-for-millions-of-users-302816242.html|Chainlink PR|Chainlink announces Robinhood Chain oracle partnership",
    )

    add(
        "layerzero",
        "robinhood-crypto",
        "partner_named",
        "LayerZero × RH Chain",
        "LayerZero announces Robinhood Chain deployment / messaging support.",
        "https://x.com/LayerZero_Core/status/2072396480770674832|LayerZero post|LayerZero announces Robinhood Chain support",
    )

    return rows


def filter_edge(row: dict) -> bool:
    key = row_key(row)
    if key in EXCLUDE_KEYS:
        return False
    if row["type"] not in PARTNERSHIP_TYPES:
        return False
    if not evidence_valid(row.get("evidence_urls") or ""):
        return False
    fr, to = row["from_slug"], row["to_slug"]
    if fr in OFFICIAL or to in OFFICIAL:
        if row.get("source") == "text_mining" and row["type"] == "partner_named":
            return False
        return True
    # Partner → RH (or partner PR naming RH)
    if to in OFFICIAL or fr in OFFICIAL:
        return True
    return False


def main() -> int:
    if not EDGES_PATH.exists():
        print(f"Missing {EDGES_PATH}", file=sys.stderr)
        return 1

    kept: dict[tuple[str, str, str], dict] = {}

    for row in csv.DictReader(EDGES_PATH.open(encoding="utf-8")):
        if not filter_edge(row):
            continue
        fr, to = row["from_slug"], row["to_slug"]
        announcer = fr if fr in OFFICIAL else (fr if to in OFFICIAL else fr)
        partner = to if announcer == fr else fr
        if row["type"] in ("partner_named", "product_integration", "lending_stack"):
            label, explanation = partnership_template(fr, to, announcer, partner)
            if row.get("source") in ("x_digest", "partnerships") and row.get("label"):
                label = row["label"]
            if row.get("source") in ("x_digest", "partnerships") and row.get("explanation"):
                explanation = row["explanation"]
            row = {**row, "label": label, "explanation": explanation, "source": "partnerships"}
        else:
            row = {**row, "source": "partnerships"}
        kept[row_key(row)] = row

    for row in curated_missing():
        kept[row_key(row)] = row

    out_rows = sorted(kept.values(), key=lambda r: (r["from_slug"], r["to_slug"], r["type"]))
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out_rows)

    print(f"Wrote {OUT_PATH} ({len(out_rows)} partnership edges)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())