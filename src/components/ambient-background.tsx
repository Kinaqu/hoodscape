import { useEffect, useRef, useState } from "react";
import { AsciiArt, POSTER_SRC } from "@/components/ui/d60-hero";

/**
 * Full-viewport ASCII layer — visible like the 21st.dev demo, with a light
 * scrim so foreground text stays readable. Pauses when the tab is hidden.
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
    const video = rootRef.current?.querySelector("video");
    if (!video || reduceMotion) return;

    void video.play().catch(() => {});

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduceMotion]);

  return (
    <div ref={rootRef} className="ambient-bg" aria-hidden>
      {reduceMotion ? (
        <img
          src={POSTER_SRC}
          alt=""
          className="ambient-bg__media"
          loading="eager"
          decoding="async"
        />
      ) : (
        <AsciiArt className="ambient-bg__media" />
      )}

      {/* Single scrim — keeps ASCII visible, text readable */}
      <div className="ambient-bg__scrim" />
      <div className="ambient-bg__vignette" />
    </div>
  );
}