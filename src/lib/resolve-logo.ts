import type { GraphEntity } from "@/types/graph";

function addUnique(urls: string[], url?: string) {
  if (url && !urls.includes(url)) urls.push(url);
}

function hostFromUrl(raw?: string) {
  if (!raw) return "";
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Ordered fallbacks — entity logo first, then site favicons. */
export function logoCandidates(entity: GraphEntity): string[] {
  const d = entity.display || {};
  const urls: string[] = [];

  addUnique(urls, entity.logo);

  const domain = d.logo_domain || hostFromUrl(entity.website);
  if (domain) {
    addUnique(urls, `https://icons.duckduckgo.com/ip3/${domain}.ico`);
    addUnique(
      urls,
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
    );
    addUnique(
      urls,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    );
  }

  return urls;
}

export function needsCrossOrigin(url: string) {
  return /twimg\.com|twitter\.com/i.test(url);
}