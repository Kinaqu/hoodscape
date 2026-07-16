import { useEffect, useRef, useState } from "react";
import { AsciiArt, POSTER_SRC } from "@/components/ui/d60-hero";
import { cn } from "@/lib/utils";

/**
 * Site-wide ambient ASCII layer — always present, low visual weight.
 * Pauses when tab is hidden; falls back to static poster when motion is reduced.
 */
export function AmbientBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const video = rootRef.current?.querySelector("video");
      if (!video || reduceMotion) return;
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        "select-none",
      )}
      aria-hidden
    >
      {reduceMotion ? (
        <img
          src={POSTER_SRC}
          alt=""
          className="h-full w-full object-cover opacity-[0.1] saturate-50"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <AsciiArt className="h-full w-full opacity-[0.14] saturate-[0.45] contrast-[0.92]" />
      )}

      {/* Blend into Hoodscape palette so motion stays subtle */}
      <div className="absolute inset-0 bg-[#0c1210]/78" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1210]/55 via-[#0c1210]/82 to-[#0c1210]/94" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_50%_18%,transparent_0%,#0c1210_70%)]" />
    </div>
  );
}