# Hoodscape edge types

Source of truth for mind-map link labels and hover explanations.

## Fields (`data/edges.csv`)

| Field | Required | Description |
|-------|----------|-------------|
| `from_slug` | yes | Source entity slug |
| `to_slug` | yes | Target entity slug |
| `type` | yes | One of the types below |
| `label` | yes | Short line on the edge (≤60 chars) |
| `explanation` | yes | 1–3 sentences for hover tooltip |
| `confidence` | yes | `high` / `medium` / `low` |
| `strength` | yes | `strong` / `moderate` / `weak` (line weight in graph) |
| `directed` | yes | `true` / `false` |
| `evidence_urls` | yes* | `url\|label;url\|label` (*except `shared_category` low) |
| `last_checked` | yes | ISO date |
| `source` | yes | `csv_manual` / `text_mining` / `primary` / `x_digest` |
| `reviewer_note` | no | Internal QA note |

## Types

### `official_stack`
Official Robinhood products sharing the same product surface.

**Example label:** `Same official product family`  
**Default confidence:** high

### `infra_dependency`
Chain or app depends on infrastructure (L2 stack, RPC, oracle, bridge).

**Example label:** `Built on Arbitrum Orbit stack`  
**Default confidence:** high

### `product_integration`
User-facing integration (wallet routes to DEX, Earn uses lending protocol).

**Example label:** `Earn routes USDG lend via Morpho`  
**Default confidence:** high / medium

### `ecosystem_directory`
Listed together on official ecosystem / docs surfaces.

**Example label:** `Named in ecosystem directory`  
**Default confidence:** high

### `partner_named`
Named in newsroom, launch, or day-1 partner copy.

**Example label:** `Day-1 partner (newsroom)`  
**Default confidence:** high

### `lending_stack`
Curators, stables, or yield partners in the same credit/yield stack.

**Example label:** `Earn / Morpho partner stack`  
**Default confidence:** high / medium

### `liquidity_stack`
AMM, prop venue, aggregator, or routing layer relationships.

**Example label:** `Public AMM + prop venue pair`  
**Default confidence:** medium

### `competitive`
Same job, competing for attention (launchpads, native DEXs).

**Example label:** `Launchpad deploy competition`  
**Default confidence:** medium

### `twitter_mention`
CT or official X post links two accounts (manual digest only).

**Example label:** `CT maps cluster (lead)`  
**Default confidence:** medium / low

### `media_intel`
Research / intel accounts cross-cite each other or anchor metrics (secondary).

**Example label:** `Research cluster cross-cite`  
**Default confidence:** low / medium

### `shared_category`
Weak same-category adjacency — hide by default in mind map.

**Example label:** `Same layer / category`  
**Default confidence:** low

## Mind map defaults

- Show: `confidence` in `high`, `medium`
- Hide: `shared_category`, `source=auto_layer_fill`
- Edge hover: `label` + `explanation` + evidence links

## NFA

Edges describe orientation and cited relationships — not endorsements, partnerships for investment, or safety reviews.