/** Layer + category SVG icons (currentColor) */

export const LAYER_ICONS = {
  official: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  infra: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="6" cy="12" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="7" r="2.2" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="17" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 11.2L15.8 8.2M8.2 12.8L15.8 15.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  defi: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 8h8a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  launchpad: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15c-2 0-5 2.5-5 5h10c0-2.5-3-5-5-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 15V5l3 2.5M12 5L9 7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="1.2" fill="currentColor"/></svg>`,
  agents: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="8" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="9.5" cy="13" r="1.1" fill="currentColor"/><circle cx="14.5" cy="13" r="1.1" fill="currentColor"/><path d="M9 16.5h6M12 4v4M8 6h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  media: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 18V6l7 4v8l-7-4zM11 10l9-4v12l-9-4v-4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  noise: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 14c2-4 4-6 7-6s5 2 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 17c1.5-2.5 3-3.5 5-3.5s3.5 1 5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="8" r="1.3" fill="currentColor"/></svg>`,
};

export const GLYPH_ICONS = {
  seal: LAYER_ICONS.official,
  wallet: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M15 14h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  lend: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M7 8c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5-2.2 3.5-5 3.5S7 13.5 7 16s2.2 3.5 5 3.5 5-1.5 5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19V5M4 19h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 15l3-4 3 2 4-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  leverage: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19L12 5l7 14" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 14h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  odds: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="1.4" opacity=".5"/></svg>`,
  node: LAYER_ICONS.infra,
  bridge: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14c2.5-4 5.5-6 8-6s5.5 2 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4 14v5M20 14v5M12 8v11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  rocket: LAYER_ICONS.launchpad,
  bot: LAYER_ICONS.agents,
  signal: LAYER_ICONS.media,
  spark: LAYER_ICONS.noise,
};

export function layerIcon(layer) {
  return LAYER_ICONS[layer] || LAYER_ICONS.defi;
}

export function glyphIcon(glyph) {
  return GLYPH_ICONS[glyph] || GLYPH_ICONS.node;
}
