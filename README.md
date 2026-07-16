# Hoodscape

Orientation map of the **Robinhood Chain** landscape — protocols, rails, and who does which job.

**Not financial advice. Not a watchlist. Listings are not endorsements.**  
**Not affiliated with Robinhood Markets, Inc.**

## Features

- **Layer overview** — 7 tiles (official → noise) with live counts
- **Pulse strip** — TVL, stables, DEX volume, fees (DefiLlama)
- **Browse** — grouped by layer or flat grid
- **Sort / filter** — TVL, confidence, A–Z, search
- **Entity panel** — job, trust labels, links
- **How to read** — App ≠ rails · volume ≠ thesis · listed ≠ liquid
- **Submit** — listing request (mailto + markdown)

## Quick start

```bash
npm install
npm run data:full   # optional: refresh DefiLlama + export JSON
npm run dev
```

## Update entities

1. Edit `data/rh-entities.csv`
2. Run `npm run data` (or `npm run data:full`)
3. Commit and push — redeploy

## Deploy

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Install | `npm install` |

Repo: https://github.com/Kinaqu/rh-chain-map

## License

Source available for portfolio / research use.  
Third-party names and trademarks belong to their owners.
