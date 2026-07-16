import "./style.css";

const LAYERS = [
  { id: "all", label: "All" },
  { id: "official", label: "Official" },
  { id: "infra", label: "Infra" },
  { id: "defi", label: "DeFi" },
  { id: "launchpad", label: "Launchpads" },
  { id: "agents", label: "Agents" },
  { id: "media", label: "Media" },
  { id: "noise", label: "Noise" },
];

const SPLITS = [
  { wrong: "RH Chain = the app onchain", right: "App ≠ rails" },
  { wrong: "#2 DEX volume = RWA won", right: "Volume ≠ thesis" },
  { wrong: "Listed stock token = liquid", right: "Listed ≠ liquid" },
];

const state = {
  route: "map",
  entities: [],
  pulse: null,
  layer: "all",
  q: "",
  selected: null,
  loadError: null,
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

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "") || "map";
  const [page, slug] = hash.split("/");
  if (page === "entity" && slug) {
    state.route = "map";
    state.selected = state.entities.find((e) => e.slug === slug) || null;
    return;
  }
  state.route = ["map", "how", "submit", "sources"].includes(page) ? page : "map";
  if (page !== "entity") state.selected = null;
}

function navigate(path) {
  location.hash = `#/${path}`;
}

async function loadData() {
  try {
    const [entRes, pulseRes] = await Promise.all([
      fetch("/data/entities.json"),
      fetch("/data/pulse.json"),
    ]);
    if (!entRes.ok) throw new Error(`entities.json ${entRes.status}`);
    const ent = await entRes.json();
    state.entities = ent.entities || [];
    state.pulse = pulseRes.ok ? await pulseRes.json() : null;
    state.loadError = null;
  } catch (e) {
    state.loadError = e.message || String(e);
  }
}

function filtered() {
  const q = state.q.trim().toLowerCase();
  return state.entities.filter((e) => {
    if (state.layer !== "all" && e.layer !== state.layer) return false;
    if (!q) return true;
    const blob = [e.name, e.job, e.notes, e.category, e.twitter, e.layer]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
}

function shell(content) {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#/map">
          <div class="brand-mark">HS</div>
          <div>
            Hoodscape
            <span class="sub">Robinhood Chain landscape</span>
          </div>
        </a>
        <nav>
          <a href="#/map" class="${state.route === "map" ? "active" : ""}">Map</a>
          <a href="#/how" class="${state.route === "how" ? "active" : ""}">How to read</a>
          <a href="#/submit" class="${state.route === "submit" ? "active" : ""}">Submit</a>
          <a href="#/sources" class="${state.route === "sources" ? "active" : ""}">Sources</a>
        </nav>
      </div>
    </header>
    <main>${content}</main>
    <footer class="site-footer">
      NFA · Not investment advice · Listings are not endorsements ·
      Data: DefiLlama + curated registry ·
      <a href="https://defillama.com/chain/robinhood-chain" target="_blank" rel="noopener">DefiLlama</a>
    </footer>
    ${state.selected ? renderModal(state.selected) : ""}
  `;
}

function renderPulse() {
  const p = state.pulse || {};
  const cards = [
    { label: "TVL", value: formatUsd(p.tvl) },
    { label: "Stables", value: formatUsd(p.stablecoins) },
    { label: "DEX 24h", value: formatUsd(p.dex_24h) },
    { label: "DEX 7d", value: formatUsd(p.dex_7d) },
    { label: "Fees 24h", value: formatUsd(p.fees_24h) },
    { label: "Chain ID", value: p.chain_id ?? "4663" },
  ];
  return `
    <div class="pulse">
      ${cards
        .map(
          (c) => `
        <div class="pulse-card">
          <div class="label">${c.label}</div>
          <div class="value">${c.value}</div>
        </div>`
        )
        .join("")}
    </div>
    <p class="pulse-meta">
      As of ${escapeHtml(p.as_of_utc || "—")} · public DefiLlama metrics · volume ≠ RWA thesis
    </p>
  `;
}

function renderMap() {
  const list = filtered();
  return `
    <section class="hero">
      <h1>The Robinhood Chain landscape, mapped</h1>
      <p class="lead">
        Hoodscape is an orientation map: protocols, rails, and who does which job.
        Built for builders, writers, and anyone tired of CA spam.
      </p>
      <div class="badge-row">
        <span class="badge">${state.entities.length} entities</span>
        <span class="badge">7 layers</span>
        <span class="badge warn">NFA · not a watchlist</span>
      </div>
    </section>

    ${renderPulse()}

    <div class="splits">
      ${SPLITS.map(
        (s) => `
        <div class="split-card">
          <div class="wrong">${escapeHtml(s.wrong)}</div>
          <div class="right">${escapeHtml(s.right)}</div>
        </div>`
      ).join("")}
    </div>

    <div class="controls">
      <div class="search-wrap">
        <span class="icon">⌕</span>
        <input
          type="search"
          id="search"
          placeholder="Search name, job, twitter, category…"
          value="${escapeHtml(state.q)}"
          autocomplete="off"
        />
      </div>
      <div class="layer-pills" id="layers">
        ${LAYERS.map(
          (l) => `
          <button type="button" class="pill ${state.layer === l.id ? "active" : ""}" data-layer="${l.id}">
            ${l.label}
          </button>`
        ).join("")}
      </div>
    </div>

    <p class="results-meta">${list.length} shown${
      state.layer !== "all" ? ` · layer: ${state.layer}` : ""
    }${state.q ? ` · “${escapeHtml(state.q)}”` : ""}</p>

    ${
      list.length === 0
        ? `<div class="empty">No matches. Clear filters or try another layer.</div>`
        : `<div class="grid">
        ${list.map(renderCard).join("")}
      </div>`
    }
  `;
}

function renderCard(e) {
  const tvl =
    e.tvl_rh != null
      ? `<span>TVL ${formatUsd(e.tvl_rh)}</span>`
      : "";
  return `
    <button type="button" class="card" data-slug="${escapeHtml(e.slug)}">
      <div class="card-top">
        <h3>${escapeHtml(e.name)}</h3>
        <span class="layer-chip ${escapeHtml(e.layer)}">${escapeHtml(e.layer)}</span>
      </div>
      <p class="job">${escapeHtml(e.job || e.notes || "—")}</p>
      <div class="card-meta">
        <span class="conf ${escapeHtml(e.confidence)}">${escapeHtml(e.confidence)}</span>
        ${e.category ? `<span>${escapeHtml(e.category)}</span>` : ""}
        ${tvl}
      </div>
    </button>
  `;
}

function renderModal(e) {
  const links = [];
  if (e.website) {
    links.push(
      `<a class="btn primary" href="${escapeHtml(e.website)}" target="_blank" rel="noopener">Website / docs</a>`
    );
  }
  if (e.twitter) {
    const handle = e.twitter.replace("@", "");
    links.push(
      `<a class="btn" href="https://x.com/${escapeHtml(handle)}" target="_blank" rel="noopener">${escapeHtml(e.twitter)}</a>`
    );
  }
  return `
    <div class="modal-backdrop" id="modal-bg" role="dialog" aria-modal="true">
      <div class="modal">
        <button type="button" class="close" id="modal-close" aria-label="Close">×</button>
        <span class="layer-chip ${escapeHtml(e.layer)}">${escapeHtml(e.layer)}</span>
        <h2>${escapeHtml(e.name)}</h2>
        <p style="margin:0;color:var(--text-muted);font-size:0.95rem">${escapeHtml(e.job || "")}</p>
        <dl>
          <div>
            <dt>Category</dt>
            <dd>${escapeHtml(e.category || "—")}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd><span class="conf ${escapeHtml(e.confidence)}">${escapeHtml(e.confidence)}</span>
              · last checked ${escapeHtml(e.last_checked || "—")}</dd>
          </div>
          ${
            e.tvl_rh != null
              ? `<div><dt>TVL on RH (Llama)</dt><dd>${formatUsd(e.tvl_rh)}</dd></div>`
              : ""
          }
          <div>
            <dt>Notes</dt>
            <dd>${escapeHtml(e.notes || "—")}</dd>
          </div>
        </dl>
        <div class="links">
          ${links.join("") || "<span style='color:var(--text-dim);font-size:0.85rem'>No links yet</span>"}
        </div>
      </div>
    </div>
  `;
}

function renderHow() {
  return `
    <article class="page-prose">
      <h1>How to read this map</h1>
      <p>
        This is an <strong style="color:var(--text)">orientation directory</strong>, not a recommendations feed.
        Use it to answer: what exists, which job it does, and where to verify.
      </p>

      <h2>Three splits that save you from wrong analysis</h2>
      <table>
        <thead>
          <tr><th>Wrong belief</th><th>Useful split</th></tr>
        </thead>
        <tbody>
          <tr><td>Robinhood Chain = the brokerage app onchain</td><td><strong>App ≠ rails</strong> — KYC products vs permissionless L2</td></tr>
          <tr><td>#2 DEX volume means RWA product-market fit</td><td><strong>Volume ≠ thesis</strong> — memes can win leaderboards</td></tr>
          <tr><td>Stock token is listed so it is liquid</td><td><strong>Listed ≠ liquid</strong> — brochure depth fails at size</td></tr>
        </tbody>
      </table>

      <h2>Layers</h2>
      <ul>
        <li><strong style="color:var(--text)">Official</strong> — RH product surface (chain, wallet, earn, stock tokens)</li>
        <li><strong style="color:var(--text)">Infra</strong> — stack, RPC, oracles, bridges, compliance, security</li>
        <li><strong style="color:var(--text)">DeFi</strong> — lending, DEX, perps, yield, prediction, RWA apps</li>
        <li><strong style="color:var(--text)">Launchpads</strong> — permissionless token rails (mechanics, not runners)</li>
        <li><strong style="color:var(--text)">Agents</strong> — agent platforms / routing builders</li>
        <li><strong style="color:var(--text)">Media</strong> — research & data accounts worth tracking</li>
        <li><strong style="color:var(--text)">Noise</strong> — memes / gamified attention (sample only)</li>
      </ul>

      <h2>Confidence labels</h2>
      <ul>
        <li><strong style="color:var(--text)">high</strong> — official or multi-source / high TVL bluechip</li>
        <li><strong style="color:var(--text)">medium</strong> — clear presence, less documentation</li>
        <li><strong style="color:var(--text)">low</strong> — community / CT / small TVL — verify yourself</li>
      </ul>

      <h2>What this map does not do</h2>
      <ul>
        <li>No price targets, no “top gems”, no auto CA feed</li>
        <li>No claim of complete long-tail memecoin coverage</li>
        <li>No endorsement of any project listed</li>
      </ul>

      <p><a href="#/map">← Back to map</a></p>
    </article>
  `;
}

function renderSubmit() {
  return `
    <article class="page-prose">
      <h1>Submit a project</h1>
      <p>
        Building on Robinhood Chain? Request a listing for orientation — not a paid shill slot.
        We curate by <strong style="color:var(--text)">job</strong> (what you do), not by market cap.
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

          <label for="s-job">One-line job (what users hire you for) *</label>
          <input id="s-job" name="job" required maxlength="120" placeholder="e.g. Public AMM for RH Chain pairs" />

          <label for="s-url">Website or docs *</label>
          <input id="s-url" name="url" type="url" required placeholder="https://" />

          <label for="s-tw">Twitter / X</label>
          <input id="s-tw" name="twitter" placeholder="@handle" />

          <label for="s-notes">Notes (primary sources, chain proof)</label>
          <textarea id="s-notes" name="notes" placeholder="Contract explorer link, docs quote, day-1 partner status…"></textarea>

          <div class="actions">
            <button type="submit" class="btn primary">Open email draft</button>
            <button type="button" class="btn" id="copy-md">Copy as markdown</button>
          </div>
          <p class="form-note">
            Submits open your mail client with a structured draft.
            Manual review · no guarantee of listing · disclose affiliations.
          </p>
          <p class="form-note" id="form-status" hidden></p>
        </form>
      </div>

      <p style="margin-top:1.5rem"><a href="#/map">← Back to map</a></p>
    </article>
  `;
}

function renderSources() {
  const links = [
    ["Robinhood Chain", "https://robinhood.com/us/en/chain/"],
    ["Chain docs", "https://docs.robinhood.com/chain/"],
    ["Ecosystem directory", "https://robinhood.com/chain/ecosystem"],
    ["Stock Tokens", "https://robinhood.com/rhj/stocktokens"],
    ["Mainnet newsroom", "https://robinhood.com/us/en/newsroom/robinhood-accelerates-global-expansion-robinhood-chain-mainnet-stock-tokens-agentic-trading/"],
    ["DefiLlama — Robinhood Chain", "https://defillama.com/chain/robinhood-chain"],
    ["Arbitrum docs", "https://docs.arbitrum.io/"],
  ];
  return `
    <article class="page-prose">
      <h1>Sources</h1>
      <p>Start with primary links. CT maps and watchlists are leads only.</p>
      <h2>Primary</h2>
      <ul>
        ${links
          .map(
            ([label, href]) =>
              `<li><a href="${href}" target="_blank" rel="noopener">${escapeHtml(label)}</a></li>`
          )
          .join("")}
      </ul>
      <h2>This project’s research</h2>
      <ul>
        <li>Entity registry: curated CSV → <code style="font-family:var(--mono);font-size:0.85rem">entities.json</code></li>
        <li>Pulse metrics: DefiLlama public API snapshot</li>
        <li>Confidence labels are editorial, not ratings of quality or safety</li>
      </ul>
      <h2>Disclaimer</h2>
      <p>
        Not financial advice. Not affiliated with Robinhood Markets, Inc.
        Inclusion does not mean endorsement, partnership, or security review.
        Jurisdiction limits apply especially to Stock Tokens and Earn products.
      </p>
      <p><a href="#/map">← Back to map</a></p>
    </article>
  `;
}

function render() {
  const app = $("#app");
  if (state.loadError) {
    app.innerHTML = shell(
      `<div class="error">Failed to load data: ${escapeHtml(state.loadError)}. Run export script and serve with Vite.</div>`
    );
    return;
  }

  let body = "";
  if (state.route === "how") body = renderHow();
  else if (state.route === "submit") body = renderSubmit();
  else if (state.route === "sources") body = renderSources();
  else body = renderMap();

  app.innerHTML = shell(body);
  bindEvents();
}

function bindEvents() {
  const search = $("#search");
  if (search) {
    search.addEventListener("input", (e) => {
      state.q = e.target.value;
      // soft re-render map grid only would be nicer; full render is fine for MVP
      const pos = search.selectionStart;
      render();
      const again = $("#search");
      if (again) {
        again.focus();
        again.setSelectionRange(pos, pos);
      }
    });
  }

  $("#layers")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-layer]");
    if (!btn) return;
    state.layer = btn.dataset.layer;
    render();
  });

  document.querySelectorAll(".card[data-slug]").forEach((el) => {
    el.addEventListener("click", () => {
      const slug = el.dataset.slug;
      state.selected = state.entities.find((x) => x.slug === slug) || null;
      if (state.selected) navigate(`entity/${slug}`);
      render();
    });
  });

  $("#modal-bg")?.addEventListener("click", (e) => {
    if (e.target.id === "modal-bg" || e.target.id === "modal-close") {
      state.selected = null;
      navigate("map");
      render();
    }
  });

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && state.selected) {
        state.selected = null;
        navigate("map");
        render();
      }
    },
    { once: true }
  );

  const form = $("#submit-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const body = formatSubmission(data);
      const subject = encodeURIComponent(
        `[Hoodscape] List request: ${data.get("name")}`
      );
      const mailBody = encodeURIComponent(body);
      // mailto without fixed address — user fills
      window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
      const st = $("#form-status");
      if (st) {
        st.hidden = false;
        st.textContent = "Mail draft opened. Paste recipient or save the markdown copy.";
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

async function boot() {
  $("#app").innerHTML = `<div class="loading">Loading map…</div>`;
  await loadData();
  parseRoute();
  render();
  window.addEventListener("hashchange", () => {
    parseRoute();
    render();
  });
}

boot();
