import { needsCrossOrigin } from "@/lib/resolve-logo";

export type ImgState = HTMLImageElement | "loading" | "error";

export function loadNodeImage(
  nodeId: string,
  candidates: string[],
  cache: Map<string, ImgState>,
  onUpdate: () => void,
) {
  if (!candidates.length) {
    cache.set(nodeId, "error");
    onUpdate();
    return;
  }

  const existing = cache.get(nodeId);
  if (existing && existing !== "loading" && existing !== "error") return;
  if (existing === "loading") return;

  cache.set(nodeId, "loading");
  let idx = 0;

  const tryNext = () => {
    if (idx >= candidates.length) {
      cache.set(nodeId, "error");
      onUpdate();
      return;
    }

    const url = candidates[idx++];
    const img = new Image();
    if (needsCrossOrigin(url)) img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    img.onload = () => {
      cache.set(nodeId, img);
      onUpdate();
    };
    img.onerror = tryNext;
    img.src = url;
  };

  tryNext();
}