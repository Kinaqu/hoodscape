import "./style.css";
import { layerIcon } from "./icons.js";
import { mountGraphView, unmountGraphView } from "./graph-mount.tsx";

const LAYER_META = [
  { id: "all", label: "All", desc: "Full landscape" },
  { id: "official", label: "Official", desc: "Wallet, Earn, stock tokens" },
  { id: "infra", label: "Infra", desc: "Stack, RPC, oracles, bridges" },
  { id: "defi", label: "DeFi", desc: "Lending, DEX, perps, yield" },
  { id: "launchpad", label: "Launchpads", desc: "Permissionless token rails" },
  { id: "agents", label: "Agents", desc: "Agent platforms & routing" },
  { id: "media", label: "Media", desc: "Research & data accounts" },
  { id: "noise", label: "Noise", desc: "Memes / attention (sample)" },
];

const LAYER_ORDER = [
  "official",
  "infra",
  "defi",
  "launchpad",
  "agents",
  "media",
  "noise",
];

const CONF_RANK = { high: 0, medium: 1, low: 2 };

const BRAND_MARK = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path d="M6 22 L12 10 L16 16 L20 8 L26 22" stroke="#3dba8c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="10" r="1.8" fill="#e6c35c"/>
  <circle cx="20" cy="8" r="1.8" fill="#e6c35c"/>
</svg>`;

const state = {
  route: "map",
  entities: [],
  pulse: null,
  graph: null,
  layer: "all",
  q: "",
  sort: "default",
  view: "grouped",
  conf: "all",
  selected: null,
  loadError: null,
  resultsKey: "",
  ignoreHash: false,
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusSlug(status) {
  return String(status || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

function catSlug(category) {
  return String(category || "other")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-") || "other";
}

function displayOf(e) {
  return e.display || {
    monogram: (e.name || "?").slice(0, 2).toUpperCase(),
    hue: 160,
    glyph: "node",
    logo_domain: "",
    avatar_kind: e.logo ? "logo" : "monogram",
    weight: "std",
  };
}

function avatarUrl(e) {
  const d = displayOf(e);
  if (e.logo) return e.logo;
  if (d.logo_domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d.logo_domain)}&sz=128`;
  }
  return "";
}

function avatarHtml(e, sizeClass = "") {
  const d = displayOf(e);
  const url = avatarUrl(e);
  const mono = escapeHtml(d.monogram || "?");
  const hue = d.hue ?? 160;
  const layer = escapeHtml(e.layer || "defi");
  if (url) {
    return `<div class="avatar ${sizeClass} layer-${layer}" style="--hue:${hue}">
      <img src="${escapeHtml(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"
        onerror="this.style.display='none';this.nextElementSibling.hidden=false" />
      <span class="mono" hidden>${mono}</span>
    </div>`;
  }
  return `<div class="avatar ${sizeClass} layer-${layer} is-mono" style="--hue:${hue}">
    <span class="mono">${mono}</span>
  </div>`;
}

function cardClasses(e) {
  const d = displayOf(e);
  return [
    "card",
    `skin-${e.layer || "defi"}`,
    `cat-${catSlug(e.category)}`,
    `status-${statusSlug(e.status)}`,
    `conf-${e.confidence || "low"}`,
    `weight-${d.weight || "std"}`,
  ].join(" ");
}

function shouldShowLayerChip() {
  return state.view === "flat" || state.layer !== "all";
}

function confIndicatorHtml(confidence) {
  const conf = escapeHtml(confidence || "low");
  return `<span class="conf-indicator ${conf}" title="Confidence: ${conf}">
    <span class="conf-dot" aria-hidden="true"></span>
    <span class="conf-label">${conf}</span>
  </span>`;
}


function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "") || "map";
  const [page, slug] = hash.split("/");
  if (page === "entity" && slug) {
    state.route = "map";
    state.selected = state.entities.find((e) => e.slug === slug) || null;
    return;
  }
  state.route = ["map", "graph", "how", "submit", "sources"].includes(page) ? page : "map";
  if (page !== "entity") state.selected = null;
}

function navigate(path) {
  location.hash = `#/${path}`;
}

async function loadData() {
  try {
    const [entRes, pulseRes, graphRes] = await Promise.all([
      fetch("/data/entities.json"),
      fetch("/data/pulse.json"),
      fetch("/data/graph.json"),
    ]);
    if (!entRes.ok) throw new Error(`entities.json ${entRes.status}`);
    const ent = await entRes.json();
    state.entities = ent.entities || [];
    state.pulse = pulseRes.ok ? await pulseRes.json() : null;
    state.graph = graphRes.ok ? await graphRes.json() : null;
    state.loadError = null;
  } catch (e) {
    state.loadError = e.message || String(e);
  }
}

function layerCounts() {
  const c = Object.fromEntries(LAYER_ORDER.map((l) => [l, 0]));
  for (const e of state.entities) {
    if (c[e.layer] != null) c[e.layer] += 1;
  }
  return c;
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = state.entities.filter((e) => {
    if (state.layer !== "all" && e.layer !== state.layer) return false;
    if (state.conf !== "all" && e.confidence !== state.conf) return false;
    if (!q) return true;
    const blob = [e.name, e.job, e.notes, e.category, e.twitter, e.layer]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });

  list = [...list];
  if (state.sort === "tvl") {
    list.sort((a, b) => (b.tvl_rh ?? -1) - (a.tvl_rh ?? -1));
  } else if (state.sort === "confidence") {
    list.sort(
      (a, b) =>
        (CONF_RANK[a.confidence] ?? 9) - (CONF_RANK[b.confidence] ?? 9) ||
        a.name.localeCompare(b.name)
    );
  } else if (state.sort === "az") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // default: layer order, then confidence, then name
    list.sort((a, b) => {
      const la = LAYER_ORDER.indexOf(a.layer);
      const lb = LAYER_ORDER.indexOf(b.layer);
      if (la !== lb) return la - lb;
      const ca = CONF_RANK[a.confidence] ?? 9;
      const cb = CONF_RANK[b.confidence] ?? 9;
      if (ca !== cb) return ca - cb;
      return a.name.localeCompare(b.name);
    });
  }
  return list;
}

function shell(content) {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#/map">
          <div class="brand-mark">${BRAND_MARK}</div>
          <div>
            Hoodscape
            <span class="sub">Robinhood Chain landscape</span>
          </div>
        </a>
        <nav>
          <a href="#/map" class="${state.route === "map" ? "active" : ""}">Map</a>
          <a href="#/graph" class="${state.route === "graph" ? "active" : ""}">Graph</a>
          <a href="#/how" class="${state.route === "how" ? "active" : ""}">How to read</a>
          <a href="#/sources" class="${state.route === "sources" ? "active" : ""}">Sources</a>
          <a href="#/submit" class="nav-cta ${state.route === "submit" ? "active" : ""}">Submit</a>
        </nav>
      </div>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      NFA · Not investment advice · Listings are not endorsements ·
      Not affiliated with Robinhood Markets, Inc. ·
      <a href="https://defillama.com/chain/robinhood-chain" target="_blank" rel="noopener">DefiLlama</a>
    </footer>
    <div id="panel-root"></div>
  `;
}

function renderPulse() {
  const p = state.pulse || {};
  const items = [
    { label: "TVL", value: formatUsd(p.tvl), primary: true },
    { label: "Stables", value: formatUsd(p.stablecoins) },
    { label: "DEX 24h", value: formatUsd(p.dex_24h), primary: true },
    { label: "DEX 7d", value: formatUsd(p.dex_7d) },
    { label: "Fees 24h", value: formatUsd(p.fees_24h) },
    { label: "Chain ID", value: String(p.chain_id ?? "4663") },
  ];
  return `
    <div class="pulse" aria-label="Chain metrics">
      ${items
        .map(
          (c) => `
        <div class="pulse-item ${c.primary ? "primary" : ""}">
          <div class="label">${c.label}</div>
          <div class="value">${c.value}</div>
        </div>`
        )
        .join("")}
    </div>
    <p class="pulse-meta">
      As of ${escapeHtml(p.as_of_utc || "—")} · DefiLlama public metrics · volume ≠ RWA thesis
    </p>
  `;
}

function renderLayerOverview() {
  const counts = layerCounts();
  const tiles = LAYER_META.filter((l) => l.id !== "all");
  return `
    <div class="layer-overview" id="layer-overview">
      <button type="button" class="layer-tile ${state.layer === "all" ? "active" : ""}" data-layer="all">
        <div class="tile-top">
          <span class="tile-name">All layers</span>
          <span class="tile-count">${state.entities.length}</span>
        </div>
        <p class="tile-desc">Full orientation map</p>
      </button>
      ${tiles
        .map(
          (l) => `
        <button type="button" class="layer-tile ${state.layer === l.id ? "active" : ""}" data-layer="${l.id}">
          <div class="tile-top">
            <span class="tile-name"><span class="tile-ico layer-tone-${l.id}">${layerIcon(l.id)}</span>${l.label}</span>
            <span class="tile-count">${counts[l.id] || 0}</span>
          </div>
          <p class="tile-desc">${escapeHtml(l.desc)}</p>
        </button>`
        )
        .join("")}
    </div>
  `;
}

function renderCard(e, i = 0) {
  const d = displayOf(e);
  const blurb = e.summary || e.job || e.notes || "—";
  const showLayer = shouldShowLayerChip();
  const layerChip = showLayer
    ? `<span class="layer-chip ${escapeHtml(e.layer)}"><span class="chip-ico">${layerIcon(e.layer)}</span>${escapeHtml(e.layer)}</span>`
    : "";
  const footerSignals = [
    e.category ? `<span class="card-signal">${escapeHtml(e.category)}</span>` : "",
    e.status ? `<span class="card-signal status-tag">${escapeHtml(e.status)}</span>` : "",
  ]
    .filter(Boolean)
    .join('<span class="card-signal-sep" aria-hidden="true">·</span>');
  const tvlValue =
    e.tvl_rh != null
      ? `<span class="tvl-badge">${formatUsd(e.tvl_rh)}</span>`
      : `<span class="tvl-badge is-empty" aria-hidden="true"></span>`;
  return `
    <button type="button" class="${cardClasses(e)}" data-slug="${escapeHtml(e.slug)}" style="--i:${i};--hue:${d.hue ?? 160}">
      <div class="card-accent"></div>
      <div class="card-main">
        ${avatarHtml(e)}
        <div class="card-body">
          <div class="card-top">
            <h3>${escapeHtml(e.name)}</h3>
            ${confIndicatorHtml(e.confidence)}
          </div>
          ${layerChip}
          <p class="job">${escapeHtml(blurb)}</p>
          <div class="card-footer">
            <div class="card-signals">${footerSignals || `<span class="card-signal is-muted">—</span>`}</div>
            <div class="card-tvl-slot">${tvlValue}</div>
          </div>
        </div>
      </div>
    </button>
  `;
}

function renderResults(list) {
  if (!list.length) {
    return `<div class="empty">No matches. Clear filters or pick another layer.</div>`;
  }

  if (state.view === "flat" || state.layer !== "all") {
    return `<div class="grid">${list.map((e, i) => renderCard(e, i)).join("")}</div>`;
  }

  // grouped
  const groups = {};
  for (const e of list) {
    (groups[e.layer] ||= []).push(e);
  }
  const meta = Object.fromEntries(LAYER_META.map((l) => [l.id, l]));
  let i = 0;
  return LAYER_ORDER.filter((l) => groups[l]?.length)
    .map((l, gi) => {
      const items = groups[l];
      const m = meta[l] || { label: l, desc: "" };
      const cards = items.map((e) => renderCard(e, i++)).join("");
      return `
        <section class="group" data-group="${l}" style="--i:${gi}">
          <div class="group-head">
            <span class="group-ico layer-tone-${l}">${layerIcon(l)}</span>
            <h2>${escapeHtml(m.label)}</h2>
            <span class="count">${items.length}</span>
            <span class="hint">${escapeHtml(m.desc || "")}</span>
          </div>
          <div class="grid">${cards}</div>
        </section>`;
    })
    .join("");
}

function renderMap() {
  const list = filtered();
  return `
    <section class="hero">
      <div class="hero-top">
        <div>
          <h1>The Robinhood Chain landscape, mapped</h1>
          <p class="lead">
            What exists, which job it does, where to verify — not a watchlist.
          </p>
        </div>
        <div class="badge-row">
          <span class="badge accent">${state.entities.length} entities</span>
          <span class="badge">7 layers</span>
          <span class="badge warn">NFA</span>
        </div>
      </div>
    </section>

    ${renderPulse()}
    ${renderLayerOverview()}

    <div class="map-stage">
      <div class="toolbar">
        <div class="search-wrap">
          <span class="icon">⌕</span>
          <input type="search" id="search" placeholder="Search name, job, twitter…" value="${escapeHtml(state.q)}" autocomplete="off" />
        </div>
        <select id="sort" aria-label="Sort">
          <option value="default" ${state.sort === "default" ? "selected" : ""}>Sort: default</option>
          <option value="tvl" ${state.sort === "tvl" ? "selected" : ""}>Sort: TVL</option>
          <option value="confidence" ${state.sort === "confidence" ? "selected" : ""}>Sort: confidence</option>
          <option value="az" ${state.sort === "az" ? "selected" : ""}>Sort: A–Z</option>
        </select>
        <select id="conf" aria-label="Confidence filter">
          <option value="all" ${state.conf === "all" ? "selected" : ""}>Confidence: all</option>
          <option value="high" ${state.conf === "high" ? "selected" : ""}>high only</option>
          <option value="medium" ${state.conf === "medium" ? "selected" : ""}>medium only</option>
          <option value="low" ${state.conf === "low" ? "selected" : ""}>low only</option>
        </select>
        <div class="view-toggle" id="view-toggle">
          <button type="button" data-view="grouped" class="${state.view === "grouped" ? "active" : ""}">Grouped</button>
          <button type="button" data-view="flat" class="${state.view === "flat" ? "active" : ""}">Flat</button>
        </div>
      </div>

      <p class="results-meta">${list.length} shown${
        state.layer !== "all" ? ` · ${state.layer}` : ""
      }${state.q ? ` · “${escapeHtml(state.q)}”` : ""}</p>

      <div id="results">${renderResults(list)}</div>
    </div>
  `;
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function renderPanel(e) {
  const links = [];
  if (e.website) {
    links.push(
      `<a class="btn primary" href="${escapeHtml(e.website)}" target="_blank" rel="noopener">Website / docs ↗</a>`
    );
  }
  if (e.twitter) {
    const handle = e.twitter.replace("@", "");
    links.push(
      `<a class="btn" href="https://x.com/${escapeHtml(handle)}" target="_blank" rel="noopener">${escapeHtml(e.twitter)} ↗</a>`
    );
  }
  for (const s of e.sources || []) {
    if (s.url && s.url !== e.website) {
      links.push(
        `<a class="btn" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label || s.url)} ↗</a>`
      );
    }
  }

  const aboutHtml = paragraphs(e.about)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const summary = e.summary || e.job || "";
  const related = e.related || [];

  return `
    <div class="modal-backdrop" id="modal-bg" role="dialog" aria-modal="true" aria-label="${escapeHtml(e.name)}">
      <div class="modal layer-${escapeHtml(e.layer)}">
        <button type="button" class="close" id="modal-close" aria-label="Close">×</button>
        <div class="panel-hero">
          ${avatarHtml(e, "lg")}
          <div class="panel-hero-text">
            <div class="modal-chips">
              <span class="layer-chip ${escapeHtml(e.layer)}"><span class="chip-ico">${layerIcon(e.layer)}</span>${escapeHtml(e.layer)}</span>
              ${e.status ? `<span class="status-pill">${escapeHtml(e.status)}</span>` : ""}
              <span class="conf ${escapeHtml(e.confidence)}">${escapeHtml(e.confidence)}</span>
            </div>
            <h2>${escapeHtml(e.name)}</h2>
          </div>
        </div>
        <p class="summary">${escapeHtml(summary)}</p>
        ${e.job && e.job !== summary ? `<p class="job-line">${escapeHtml(e.job)}</p>` : ""}

        ${
          aboutHtml
            ? `<div class="panel-section">
          <h3>What it is</h3>
          <div class="about-block">${aboutHtml}</div>
        </div>`
            : ""
        }

        <div class="panel-section">
          <h3>Trust</h3>
          <div class="panel-kv">
            <div><span class="k">Confidence</span><span class="v conf ${escapeHtml(e.confidence)}">${escapeHtml(e.confidence)}</span></div>
            <div><span class="k">Status</span><span class="v">${escapeHtml(e.status || "—")}</span></div>
            <div><span class="k">Last checked</span><span class="v">${escapeHtml(e.last_checked || "—")}</span></div>
            <div><span class="k">Category</span><span class="v">${escapeHtml(e.category || "—")}</span></div>
            ${
              e.tvl_rh != null
                ? `<div><span class="k">TVL on RH (Llama)</span><span class="v">${formatUsd(e.tvl_rh)}</span></div>`
                : ""
            }
          </div>
        </div>

        ${
          e.risks
            ? `<div class="panel-section">
          <h3>Risks / caveats</h3>
          <div class="risks-box">${escapeHtml(e.risks)}</div>
        </div>`
            : ""
        }

        ${
          e.notes && e.notes !== summary && e.notes !== e.about
            ? `<div class="panel-section">
          <h3>Notes</h3>
          <p>${escapeHtml(e.notes)}</p>
        </div>`
            : ""
        }

        <div class="panel-section">
          <h3>Links</h3>
          <div class="links" style="margin-top:0.35rem">
            ${links.join("") || `<span style="color:var(--text-dim);font-size:0.85rem">No primary links yet — verify before interacting.</span>`}
          </div>
        </div>

        ${
          related.length
            ? `<div class="panel-section">
          <h3>Related</h3>
          <div class="related-row">
            ${related
              .map(
                (r) =>
                  `<button type="button" class="related-chip" data-slug="${escapeHtml(r.slug)}">${escapeHtml(r.name)}</button>`
              )
              .join("")}
          </div>
        </div>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderHow() {
  return `
    <article class="page-prose">
      <h1>How to read Hoodscape</h1>
      <p class="lede">Orientation directory — not recommendations. Use it to answer: what exists, which job it does, where to verify.</p>

      <h2 style="font-size:1rem;margin:0 0 0.65rem;letter-spacing:-0.02em">Three splits</h2>
      <div class="guide-grid">
        <div class="guide-card">
          <div class="wrong">RH Chain = the brokerage app onchain</div>
          <div class="right">App ≠ rails</div>
          <p>KYC products and Wallet UX live on the app side. The chain is permissionless L2 rails anyone can deploy on.</p>
        </div>
        <div class="guide-card">
          <div class="wrong">#2 DEX volume = RWA product-market fit</div>
          <div class="right">Volume ≠ thesis</div>
          <p>Memes and launchpads can win leaderboards. Residual composition after incentives is the real test.</p>
        </div>
        <div class="guide-card">
          <div class="wrong">Stock token listed = liquid</div>
          <div class="right">Listed ≠ liquid</div>
          <p>Brochure listings fail at size. Check depth and sellability, not ticker presence.</p>
        </div>
      </div>

      <h2 style="font-size:1rem;margin:0 0 0.65rem;letter-spacing:-0.02em">Layers</h2>
      <ul class="layer-list">
        ${LAYER_META.filter((l) => l.id !== "all")
          .map(
            (l) => `
          <li>
            <span class="dot ${l.id}"></span>
            <div><strong>${l.label}</strong><span>${escapeHtml(l.desc)}</span></div>
          </li>`
          )
          .join("")}
      </ul>

      <h2 style="font-size:1rem;margin:0 0 0.5rem;letter-spacing:-0.02em">Confidence</h2>
      <p style="color:var(--text-muted);font-size:0.92rem">
        <strong style="color:var(--text)">high</strong> — official or multi-source / high TVL ·
        <strong style="color:var(--text)">medium</strong> — clear presence ·
        <strong style="color:var(--text)">low</strong> — community / CT / small — verify yourself
      </p>

      <h2 style="font-size:1rem;margin:1.25rem 0 0.5rem;letter-spacing:-0.02em">What this is not</h2>
      <p style="color:var(--text-muted);font-size:0.92rem">
        No price targets, no “top gems”, no auto CA feed, no complete memecoin coverage, no endorsements.
      </p>

      <a class="back-link" href="#/map">← Back to map</a>
    </article>
  `;
}

function renderSubmit() {
  return `
    <article class="page-prose">
      <h1>Submit a project</h1>
      <p class="lede">
        Building on Robinhood Chain? Request a listing for orientation — not a paid shill slot.
        We curate by <strong style="color:var(--text)">job</strong>, not market cap.
      </p>

      <div class="submit-box">
        <form id="submit-form">
          <label for="s-name">Project name *</label>
          <input id="s-name" name="name" required placeholder="e.g. Acme DEX" />

          <label for="s-layer">Layer *</label>
          <select id="s-layer" name="layer" required>
            <option value="defi">DeFi</option>
            <option value="infra">Infra</option>
            <option value="launchpad">Launchpad</option>
            <option value="agents">Agents</option>
            <option value="official">Official / product</option>
            <option value="media">Media / data</option>
            <option value="noise">Other / noise</option>
          </select>

          <label for="s-job">One-line job *</label>
          <input id="s-job" name="job" required maxlength="120" placeholder="e.g. Public AMM for RH Chain pairs" />

          <label for="s-url">Website or docs *</label>
          <input id="s-url" name="url" type="url" required placeholder="https://" />

          <label for="s-tw">Twitter / X</label>
          <input id="s-tw" name="twitter" placeholder="@handle" />

          <label for="s-notes">Notes (primary sources, chain proof)</label>
          <textarea id="s-notes" name="notes" placeholder="Explorer link, docs quote, day-1 partner status…"></textarea>

          <div class="actions">
            <button type="submit" class="btn primary">Open email draft</button>
            <button type="button" class="btn" id="copy-md">Copy as markdown</button>
          </div>
          <p class="form-note">
            Opens your mail client with a structured draft. Manual review · no guarantee of listing · disclose affiliations.
          </p>
          <p class="form-note ok" id="form-status" hidden></p>
        </form>
      </div>

      <a class="back-link" href="#/map">← Back to map</a>
    </article>
  `;
}

function renderGraph() {
  if (!state.graph?.nodes?.length) {
    return `
      <article class="page-prose">
        <h1>Ecosystem graph</h1>
        <p class="lede">Graph data not loaded. Run <code>npm run research:graph</code> and refresh.</p>
        <a class="back-link" href="#/map">← Back to map</a>
      </article>
    `;
  }
  return `
    <section class="hero graph-hero">
      <div class="hero-top">
        <div>
          <h1>Ecosystem graph</h1>
          <p class="lead">
            How projects connect — partnerships, infra, liquidity, intel. Orientation only, not endorsements.
          </p>
        </div>
        <div class="badge-row">
          <span class="badge accent">${state.graph.node_count ?? state.graph.nodes.length} nodes</span>
          <span class="badge">${state.graph.edge_count ?? state.graph.edges.length} edges</span>
          <span class="badge warn">NFA</span>
        </div>
      </div>
    </section>
    <div class="map-stage graph-stage">
      <div id="graph-mount"></div>
    </div>
  `;
}

function renderSources() {
  const primary = [
    ["Robinhood Chain", "https://robinhood.com/us/en/chain/"],
    ["Chain docs", "https://docs.robinhood.com/chain/"],
    ["Ecosystem directory", "https://robinhood.com/chain/ecosystem"],
    ["Stock Tokens", "https://robinhood.com/rhj/stocktokens"],
    ["Mainnet newsroom", "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/"],
    ["DefiLlama — RH Chain", "https://defillama.com/chain/robinhood-chain"],
    ["Arbitrum docs", "https://docs.arbitrum.io/"],
  ];
  return `
    <article class="page-prose">
      <h1>Sources</h1>
      <p class="lede">Start with primary links. CT maps and watchlists are leads only.</p>

      <div class="two-col">
        <div class="source-col">
          <h2>Primary</h2>
          <ul>
            ${primary
              .map(
                ([label, href]) =>
                  `<li><a href="${href}" target="_blank" rel="noopener">${escapeHtml(label)}</a></li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="source-col leads">
          <h2>Leads only (secondary)</h2>
          <ul>
            <li>CT ecosystem maps & watchlists</li>
            <li>Launchpad deploy rankings on X</li>
            <li>Unaudited community claims</li>
            <li>Hoodscape confidence labels (editorial)</li>
          </ul>
        </div>
      </div>

      <p style="color:var(--text-muted);font-size:0.9rem">
        Not financial advice. Not affiliated with Robinhood Markets, Inc.
        Inclusion does not mean endorsement, partnership, or security review.
        Jurisdiction limits apply especially to Stock Tokens and Earn.
      </p>

      <a class="back-link" href="#/map">← Back to map</a>
    </article>
  `;
}

function resultsKey() {
  return [state.route, state.layer, state.sort, state.conf, state.q, state.view].join("|");
}

let graphMounted = false;
let lastRenderedRoute = null;

function updateNavActive() {
  document.querySelectorAll(".site-header nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const page = href.replace(/^#\/?/, "").split("/")[0];
    a.classList.toggle("active", page === state.route);
  });
}

function setHash(path) {
  const next = `#/${path}`;
  if (location.hash === next) return;
  state.ignoreHash = true;
  location.hash = next;
}

function mapDomReady() {
  return Boolean($("#panel-root") && ( $("#results") || $(".layer-overview") || state.route !== "map" ));
}

function bindPanelEvents() {
  $("#modal-bg")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-bg" || e.target.id === "modal-close") {
      closeEntity();
    }
  });
  document.querySelectorAll("#panel-root .related-chip[data-slug]").forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openEntity(el.dataset.slug);
    });
  });
}

function mountPanel(entity) {
  const root = $("#panel-root");
  if (!root) return;
  if (!entity) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = renderPanel(entity);
  bindPanelEvents();
}

function render(options = {}) {
  const { animateResults = true } = options;
  const app = $("#app");
  if (state.loadError) {
    app.innerHTML = shell(
      `<div class="error">Failed to load data: ${escapeHtml(state.loadError)}. Run <code>npm run data</code> and serve with Vite.</div>`
    );
    return;
  }

  const prevRoute = lastRenderedRoute;
  if (prevRoute === "graph" && state.route === "graph" && graphMounted) {
    updateNavActive();
    if (state.selected) mountPanel(state.selected);
    else mountPanel(null);
    return;
  }

  if (prevRoute === "graph" && state.route !== "graph") {
    unmountGraphView();
    graphMounted = false;
  }

  let body = "";
  if (state.route === "how") body = renderHow();
  else if (state.route === "submit") body = renderSubmit();
  else if (state.route === "sources") body = renderSources();
  else if (state.route === "graph") body = renderGraph();
  else body = renderMap();

  // Preserve scroll when re-rendering map filters
  const prevScroll = window.scrollY;

  app.innerHTML = shell(body);
  bindEvents();

  const key = resultsKey();
  const results = $("#results");
  if (results && animateResults && key !== state.resultsKey && state.route === "map") {
    state.resultsKey = key;
    results.classList.remove("is-entering");
    void results.offsetWidth;
    results.classList.add("is-entering");
    window.setTimeout(() => results.classList.remove("is-entering"), 900);
  } else {
    state.resultsKey = key;
  }

  if (state.selected) mountPanel(state.selected);
  else mountPanel(null);

  if (state.route === "graph") {
    const mount = $("#graph-mount");
    if (mount && state.graph) {
      mountGraphView(mount, {
        graph: state.graph,
        onNodeClick: (slug) => openEntity(slug),
      });
      graphMounted = true;
    }
  }

  lastRenderedRoute = state.route;

  if (state.route === "map") {
    window.scrollTo(0, prevScroll);
  }
}

function openEntity(slug) {
  const ent = state.entities.find((x) => x.slug === slug) || null;
  if (!ent) return;
  state.selected = ent;

  if (state.route === "graph") {
    mountPanel(ent);
    return;
  }

  state.route = "map";
  setHash(`entity/${slug}`);

  // Map already painted → panel only (no full remount / no stagger)
  if ($("#panel-root") && ($("#results") || $(".layer-overview"))) {
    mountPanel(ent);
    return;
  }
  // First paint (deep link)
  render({ animateResults: false });
}

function closeEntity() {
  if (!state.selected && !$("#panel-root")?.innerHTML) return;
  state.selected = null;
  if (state.route === "graph") {
    mountPanel(null);
    return;
  }
  setHash("map");
  mountPanel(null);
}

function bindEvents() {
  const search = $("#search");
  if (search) {
    search.addEventListener("input", (e) => {
      state.q = e.target.value;
      const pos = search.selectionStart;
      render();
      const again = $("#search");
      if (again) {
        again.focus();
        again.setSelectionRange(pos, pos);
      }
    });
  }

  $("#layer-overview")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-layer]");
    if (!btn) return;
    state.layer = btn.dataset.layer;
    render();
  });

  $("#sort")?.addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });

  $("#conf")?.addEventListener("change", (e) => {
    state.conf = e.target.value;
    render();
  });

  $("#view-toggle")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (!btn) return;
    state.view = btn.dataset.view;
    render();
  });

  document.querySelectorAll(".card[data-slug]").forEach((el) => {
    el.addEventListener("click", () => openEntity(el.dataset.slug));
  });

  const form = $("#submit-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const body = formatSubmission(data);
      const subject = encodeURIComponent(
        `[Hoodscape] List request: ${data.get("name")}`
      );
      window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
      const st = $("#form-status");
      if (st) {
        st.hidden = false;
        st.textContent = "Mail draft opened. Paste recipient or use Copy markdown.";
      }
    });

    $("#copy-md")?.addEventListener("click", async () => {
      const data = new FormData(form);
      const body = formatSubmission(data);
      try {
        await navigator.clipboard.writeText(body);
        const st = $("#form-status");
        if (st) {
          st.hidden = false;
          st.textContent = "Copied markdown to clipboard.";
        }
      } catch {
        alert(body);
      }
    });
  }
}

function formatSubmission(data) {
  return [
    "## Hoodscape — listing request",
    "",
    `- **Name:** ${data.get("name")}`,
    `- **Layer:** ${data.get("layer")}`,
    `- **Job:** ${data.get("job")}`,
    `- **URL:** ${data.get("url")}`,
    `- **Twitter:** ${data.get("twitter") || "—"}`,
    "",
    "### Notes",
    data.get("notes") || "—",
    "",
    "_Manual review. NFA. Not an endorsement request for promotion._",
  ].join("\n");
}

function onHashChange() {
  if (state.ignoreHash) {
    state.ignoreHash = false;
    return;
  }

  const prevRoute = state.route;
  const prevSlug = state.selected?.slug || null;
  parseRoute();

  // Soft transitions when map DOM already exists
  const mapAlive = Boolean($(".layer-overview") || $("#results"));

  if (state.route === "graph" && prevRoute === "graph") {
    const nextSlug = state.selected?.slug || null;
    if (nextSlug !== prevSlug) {
      if (state.selected) mountPanel(state.selected);
      else mountPanel(null);
    }
    return;
  }

  if (mapAlive && state.route === "map") {
    const nextSlug = state.selected?.slug || null;
    if (nextSlug && nextSlug !== prevSlug) {
      mountPanel(state.selected);
      return;
    }
    if (!nextSlug && prevSlug) {
      mountPanel(null);
      return;
    }
    // same map state from hash (e.g. #/map while already map)
    if (prevRoute === "map") return;
  }

  render();
}

export async function boot() {
  $("#app").innerHTML = `<div class="loading">Loading Hoodscape…</div>`;
  await loadData();
  parseRoute();
  render({ animateResults: true });
  window.addEventListener("hashchange", onHashChange);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.selected) closeEntity();
  });
}
