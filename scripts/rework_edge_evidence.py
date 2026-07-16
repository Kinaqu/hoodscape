#!/usr/bin/env python3
"""Rework edge labels, explanations, and pair-specific evidence (with proves notes)."""

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

TOMWAN = "https://x.com/tomwanhh/status/2077686289541824987"
FLAP_BOARD = "https://flap.sh/robinhood/board?lang=en"
NOXA_X = "https://x.com/Noxa_Fi"
PONS_X = "https://x.com/ponsdotfamily"
FOUR_FUN = "https://4.fun/"
DEFIEDGE = "https://x.com/thedefiedge/status/2077709910591365630"
DEFILLAMA = "https://defillama.com/chain/robinhood-chain"
VIRTUALS_X = "https://x.com/virtuals_io"
HOODZ_X = "https://x.com/HOODZRH"
SLVR_X = "https://x.com/S_L_V_R_FUN"
CASHCAT_X = "https://x.com/cashcat_token"

# url|label|proves — third field shown in graph UI
REWORK: list[dict] = [
    # --- Launchpad competitive cluster ---
    {
        "from_slug": "flap",
        "to_slug": "noxa-fun",
        "type": "competitive",
        "label": "Rotating deploy leaders",
        "explanation": "Both run permissionless memecoin launch rails on RH Chain. Tom Wan's board shows NOXA #1 the prior week and Flap #2 on 15 Jul — same launchpad war, different snapshots. Deploy rank ≠ safety.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan deploy leaderboard|Names @Noxa_Fi #1 (prior week) and @flapdotsh #2 (15 Jul) in one launchpad-war thread; "
            f"{FLAP_BOARD}|Flap RH deploy board|Flap operates a Robinhood Chain token launch board; "
            f"{NOXA_X}|NOXA Fun|Launchpad account cited in the same deploy-rank coverage"
        ),
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "noxa-fun",
        "to_slug": "flap",
        "type": "competitive",
        "label": "Launchpad war — rank rotation",
        "explanation": "NOXA led Tom Wan's prior-week deploy board; Flap held #2 on 15 Jul while Pons took #1. Shows the same attention job with fast leaderboard flips.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan deploy leaderboard|Prior-week #1 NOXA vs 15 Jul #2 Flap in the same thread; "
            f"{NOXA_X}|NOXA Fun|RH launchpad rail in deploy-rank narrative; "
            f"{FLAP_BOARD}|Flap RH deploy board|Flap launch surface on Robinhood Chain"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "flap",
        "to_slug": "pons",
        "type": "competitive",
        "label": "Pons ahead on 15 Jul board",
        "explanation": "Tom Wan's 15 Jul snapshot ranks Pons #1 and Flap #2 by tokens deployed — direct head-to-head on the same leaderboard.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan 15 Jul board|Same snapshot: @ponsdotfamily #1, @flapdotsh #2; "
            f"{FLAP_BOARD}|Flap RH deploy board|Flap launch rail on RH Chain; "
            f"{PONS_X}|Pons|Launchpad that overtook Flap in that snapshot"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "pons",
        "to_slug": "flap",
        "type": "competitive",
        "label": "Pons flipped Flap on deploys (15 Jul)",
        "explanation": "@tomwanhh reported Pons overtook Flap in RH launchpad deploy counts on 15 Jul 2026. Competitive leaderboard only — not safety or quality ranking.",
        "tweet_url": f"{TOMWAN}|Tom Wan 15 Jul board|Post explicitly states Pons flipped Flap; shows Pons #1 and Flap #2",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "pons",
        "to_slug": "noxa-fun",
        "type": "competitive",
        "label": "Leaderboard handoff (NOXA → Pons)",
        "explanation": "Same Tom Wan thread: NOXA led the prior-week deploy board; Pons led 15 Jul. Both fight for the top launchpad slot on RH Chain.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan deploy leaderboard|Prior-week #1 @Noxa_Fi vs 15 Jul #1 @ponsdotfamily; "
            f"{NOXA_X}|NOXA Fun|Prior-week deploy leader; "
            f"{PONS_X}|Pons|15 Jul deploy leader"
        ),
        "confidence": "high",
        "strength": "strong",
    },
    {
        "from_slug": "noxa-fun",
        "to_slug": "pons",
        "type": "competitive",
        "label": "Deploy rank flipped (NOXA → Pons)",
        "explanation": "Tom Wan compares two snapshots: NOXA #1 one week earlier, Pons #1 on 15 Jul — same launchpad war with rotating winners.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan deploy leaderboard|Shows @Noxa_Fi leading prior week and @ponsdotfamily leading 15 Jul; "
            f"{NOXA_X}|NOXA Fun|Named #1 in prior-week board; "
            f"{PONS_X}|Pons|Named #1 in 15 Jul board"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "pons",
        "to_slug": "4-fun",
        "type": "competitive",
        "label": "Same launchpad job on RH",
        "explanation": "Pons and 4.fun both offer permissionless token launch rails on Robinhood Chain — competing for deploy attention, not a verified integration.",
        "tweet_url": (
            f"{FOUR_FUN}|4.fun|4.fun launchpad on RH Chain; "
            f"{PONS_X}|Pons|Pons launchpad on RH Chain"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "flap",
        "to_slug": "uniswap",
        "type": "liquidity_stack",
        "label": "Deploy → public AMM liquidity",
        "explanation": "Flap creates tokens on RH Chain; liquid trading often migrates to public AMMs like Uniswap. This is a liquidity path, not a day-1 partnership claim.",
        "tweet_url": (
            f"{FLAP_BOARD}|Flap RH deploy board|Where Flap tokens are created on RH Chain; "
            f"https://defillama.com/protocol/uniswap-v3|Uniswap on DefiLlama|Dominant public AMM on RH Chain for post-launch liquidity"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    # --- Tom Wan media_intel: pair-specific proof ---
    {
        "from_slug": "tom-wan",
        "to_slug": "flap",
        "type": "media_intel",
        "label": "Tracks Flap deploy rank",
        "explanation": "@tomwanhh names @flapdotsh as #2 on the 15 Jul RH launchpad deploy board.",
        "tweet_url": f"{TOMWAN}|Tom Wan deploy post|Names @flapdotsh #2 on 15 Jul leaderboard",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "tom-wan",
        "to_slug": "noxa-fun",
        "type": "media_intel",
        "label": "Tracks NOXA deploy rank",
        "explanation": "@tomwanhh names @Noxa_Fi as #1 on the prior-week RH launchpad deploy board in the same thread.",
        "tweet_url": f"{TOMWAN}|Tom Wan deploy post|Names @Noxa_Fi #1 on prior-week leaderboard",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "tom-wan",
        "to_slug": "pons",
        "type": "media_intel",
        "label": "Tracks Pons deploy rank",
        "explanation": "@tomwanhh reports Pons flipping Flap and lists @ponsdotfamily as #1 on 15 Jul.",
        "tweet_url": f"{TOMWAN}|Tom Wan deploy post|States Pons flipped Flap; shows @ponsdotfamily #1 on 15 Jul",
        "confidence": "medium",
        "strength": "moderate",
    },
    # --- Attention / ecosystem edges: honest claims ---
    {
        "from_slug": "cash-cat",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Meme attention near launch rails",
        "explanation": "Hoodscape groups Cash Cat (native meme) near NOXA (launchpad) because early meme attention often flows through deploy rails — not an official link.",
        "tweet_url": f"{DEFIEDGE}|DeFi Edge RH volume thread|Frames meme-heavy DEX volume vs launchpad activity on RH Chain",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "cash-cat",
        "to_slug": "noxa-fun",
        "type": "competitive",
        "label": "Meme attention via launch rails",
        "explanation": "Native memes like Cash Cat often ride launchpad distribution rails (NOXA-class pads) for early attention — does not imply official endorsement.",
        "tweet_url": f"{DEFIEDGE}|DeFi Edge RH volume thread|Uses native meme activity to explain RH DEX volume composition",
        "confidence": "low",
        "strength": "weak",
    },
    {
        "from_slug": "cash-cat",
        "to_slug": "uniswap",
        "type": "liquidity_stack",
        "label": "Meme trades on public AMM",
        "explanation": "High-visibility RH memes (Cash Cat-class) trade on public AMM venues — explains meme-heavy DEX volume, not a partnership.",
        "tweet_url": f"{DEFIEDGE}|DeFi Edge RH volume thread|Links native meme activity to headline DEX volume on RH Chain",
        "confidence": "medium",
        "strength": "weak",
    },
    {
        "from_slug": "hoodz",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Both live on RH Chain",
        "explanation": "HOODZ (gaming/attention) and NOXA (launchpad) are distinct apps on the same chain — Hoodscape map adjacency only.",
        "tweet_url": (
            f"{DEFILLAMA}|DefiLlama RH Chain|Chain dashboard listing RH-native protocols; "
            f"{HOODZ_X}|HOODZ|HOODZ project on RH Chain; "
            f"{NOXA_X}|NOXA Fun|NOXA launchpad on RH Chain"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "slvr",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Attention apps on RH Chain",
        "explanation": "SLVR (gamified attention) and NOXA (launchpad) coexist on RH Chain — map neighbors, not an integration.",
        "tweet_url": (
            f"{DEFILLAMA}|DefiLlama RH Chain|Lists RH-native apps side by side; "
            f"{SLVR_X}|SLVR|SLVR attention app; "
            f"{NOXA_X}|NOXA Fun|NOXA launchpad"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "slvr",
        "to_slug": "cash-cat",
        "type": "competitive",
        "label": "Attention-layer cluster",
        "explanation": "SLVR and Cash Cat are grouped as gamified/meme attention samples on RH Chain in the same volume-composition story.",
        "tweet_url": f"{DEFIEDGE}|DeFi Edge RH volume thread|Discusses native meme/gamified attention driving early RH DEX volume",
        "confidence": "low",
        "strength": "weak",
    },
    {
        "from_slug": "virtuals",
        "to_slug": "noxa-fun",
        "type": "ecosystem_directory",
        "label": "Agent + launch rails on RH",
        "explanation": "Virtuals (agent tokens) and NOXA (launchpad) both appear in early RH attention maps — Tom Wan's prior-week board even listed Virtuals #3 while NOXA was #1.",
        "tweet_url": (
            f"{TOMWAN}|Tom Wan deploy leaderboard|Prior-week board: NOXA #1 and @virtuals_io #3; "
            f"{VIRTUALS_X}|Virtuals|Agent launch platform on RH; "
            f"{NOXA_X}|NOXA Fun|Launchpad on RH"
        ),
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "swaphood",
        "to_slug": "robinswap",
        "type": "liquidity_stack",
        "label": "Adjacent native DEXs on RH",
        "explanation": "SwapHood and RobinSwap are separate native AMM venues on Robinhood Chain — compare depth per pool, not headline chain volume.",
        "tweet_url": f"{DEFILLAMA}|DefiLlama RH Chain|Lists SwapHood and RobinSwap as distinct DEX protocols on RH Chain",
        "confidence": "medium",
        "strength": "moderate",
    },
    {
        "from_slug": "swaphood",
        "to_slug": "sheriff-exchange",
        "type": "liquidity_stack",
        "label": "Adjacent native DEXs on RH",
        "explanation": "SwapHood and Sheriff Exchange occupy parallel native DEX jobs on RH Chain with separate TVL pools.",
        "tweet_url": f"{DEFILLAMA}|DefiLlama RH Chain|Lists SwapHood and Sheriff Exchange as separate RH DEX entries",
        "confidence": "medium",
        "strength": "moderate",
    },
]

ENTITY_SOURCES_FIX: dict[str, str] = {
    "Flap": (
        f"{FLAP_BOARD}|Flap RH deploy board; "
        f"{TOMWAN}|Tom Wan deploy leaderboard|15 Jul #2 in launchpad war thread"
    ),
    "Pons": (
        f"{PONS_X}|Pons launchpad; "
        f"{TOMWAN}|Tom Wan deploy leaderboard|15 Jul #1 in launchpad war thread"
    ),
    "NOXA Fun": f"{NOXA_X}|NOXA Fun|RH launchpad cited in deploy-rank coverage",
}


def patch_x_log() -> None:
    rows = list(csv.DictReader(X_LOG.open(encoding="utf-8")))
    by_key = {(r["from_slug"], r["to_slug"], r["type"]): r for r in rows}

    for edge in REWORK:
        key = (edge["from_slug"], edge["to_slug"], edge["type"])
        row = {
            "digest_date": "2026-07-16",
            "from_slug": edge["from_slug"],
            "to_slug": edge["to_slug"],
            "type": edge["type"],
            "label": edge["label"],
            "explanation": edge["explanation"],
            "tweet_url": edge["tweet_url"],
            "author_tier": "1",
            "confidence": edge["confidence"],
            "strength": edge["strength"],
            "reviewer_note": "pair-specific-evidence-2026-07-16",
        }
        by_key[key] = row

    out = sorted(by_key.values(), key=lambda r: (r["from_slug"], r["to_slug"], r["type"]))
    with X_LOG.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=X_FIELDS)
        w.writeheader()
        w.writerows(out)
    print(f"Reworked {len(REWORK)} edges in {X_LOG}")


def patch_entities() -> None:
    rows = list(csv.DictReader(ENTITIES.open(encoding="utf-8")))
    fieldnames = rows[0].keys() if rows else []
    for row in rows:
        name = (row.get("name") or "").strip()
        if name in ENTITY_SOURCES_FIX:
            row["sources"] = ENTITY_SOURCES_FIX[name]
    with ENTITIES.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    print(f"Updated entity sources for {len(ENTITY_SOURCES_FIX)} launchpads")


EDGES_PATH = ROOT / "data" / "edges.csv"

# Auto-seeded partner_named rows that misstate the relationship (liquidity_stack override exists).
DROP_EDGE_KEYS = {
    ("flap", "uniswap", "partner_named"),
    ("cash-cat", "uniswap", "partner_named"),
}


def drop_bad_edges() -> None:
    if not EDGES_PATH.exists():
        return
    rows = list(csv.DictReader(EDGES_PATH.open(encoding="utf-8")))
    fieldnames = rows[0].keys() if rows else []
    kept = [
        r
        for r in rows
        if (r["from_slug"], r["to_slug"], r["type"]) not in DROP_EDGE_KEYS
    ]
    removed = len(rows) - len(kept)
    with EDGES_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(kept)
    if removed:
        print(f"Dropped {removed} misleading edges from {EDGES_PATH}")


def main() -> int:
    import subprocess
    import sys

    patch_x_log()
    patch_entities()
    subprocess.run([sys.executable, str(ROOT / "scripts" / "seed_edges.py")], check=True)
    subprocess.run([sys.executable, str(ROOT / "scripts" / "merge_x_digest.py")], check=True)
    drop_bad_edges()
    subprocess.run([sys.executable, str(ROOT / "scripts" / "export_entities_json.py")], check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())