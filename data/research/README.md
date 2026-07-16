# Hoodscape graph research

## Workflow

```bash
npm run research:audit    # edge-audit.json + edge-audit.md
npm run research:seed     # regenerate data/edges.csv from CSV + text mining
npm run research:merge-x  # merge x-edge-log.csv → edges.csv (x_digest wins)
npm run research:graph    # seed + merge-x + export public/data/graph.json
```

## Files

| File | Role |
|------|------|
| [`EDGE_TYPES.md`](EDGE_TYPES.md) | Edge type dictionary |
| [`../edges.csv`](../edges.csv) | Source of truth (edit + re-seed) |
| [`x-edge-log.csv`](x-edge-log.csv) | Manual X digest findings |
| [`edge-audit.json`](edge-audit.json) | Baseline audit report |

## Adding edges from X (manual)

1. Run digest (see `NftResearch/rh-x-talk-digest.md` method).
2. Append row to `x-edge-log.csv`.
3. Copy verified rows into `edges.csv` with `source=x_digest`.
4. `npm run research:merge-x`
5. `npm run research:graph`

Digests live in [`digests/`](digests/) (2026-07-03, 07-10, 07-16).

## Mind map UI

`public/data/graph.json` feeds the future `#/graph` view. Edge hover uses `label` + `explanation` + `evidence`.