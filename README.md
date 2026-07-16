# RH Chain Map

Orientation directory for **Robinhood Chain** — protocols, rails, and who does which job.

**Not financial advice. Not a watchlist. Listings are not endorsements.**  
**Not affiliated with Robinhood Markets, Inc.**

## Live

After deploy, link your Pages/Vercel URL here.

## Quick start

```bash
npm install
npm run data:full   # optional: refresh DefiLlama + export JSON
npm run dev
```

## Update entities

1. Edit `data/rh-entities.csv`
2. Run `npm run data` (or `npm run data:full` for fresh metrics)
3. Commit and push — redeploy

## Stack

- Vite static site (`src/`, `public/`)
- Curated registry: `data/rh-entities.csv`
- Metrics: DefiLlama public API via `scripts/rh_llama_snapshot.py`

## Deploy

### Cloudflare Pages / Vercel / Netlify

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Install | `npm install` |

No env vars required for v1.

```bash
npm run build
# upload dist/ or connect this repo to your host
```

### GitHub Pages (optional)

Use any static deploy action that runs `npm ci && npm run build` and publishes `dist/`.

## Pages

| Route | Content |
|-------|---------|
| `#/map` | Layers, search, cards, pulse metrics |
| `#/how` | App ≠ chain · volume ≠ thesis · listed ≠ liquid |
| `#/submit` | Project listing request (mailto + markdown) |
| `#/sources` | Primary links |

## License

Source available for portfolio / research use.  
Third-party names and trademarks belong to their owners.
