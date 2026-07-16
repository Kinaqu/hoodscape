"use client";

const VIDEO_SRC =
  "https://assets.21st.dev/ascii-recipes/videos/user_3GYHFar2zrRr79sK3wSzHGVOC0I/4b89c015-6b11-4816-b442-b125da0c8091.mp4";
const POSTER_SRC =
  "https://assets.21st.dev/ascii-recipes/thumbnails/user_3GYHFar2zrRr79sK3wSzHGVOC0I/eb38ebaf-a2ac-432d-bf49-2fc832ae9eeb.png";

// AsciiArt — "D60-hero", made with the 21st.dev ASCII editor and baked
// to its exact rendered output (looping video + poster). Zero dependencies:
// one <video> that fills its parent. Drop it behind or inside your content:
// <div className="relative h-96"><AsciiArt className="absolute inset-0" /></div>
// Remix the source recipe (styles, animation, palette) in the editor:
// https://21st.dev/community/ascii/editor?from=835f9c49-9087-4db1-a02d-62a0d38bff59
export function AsciiArt({ className }: { className?: string }) {
  return (
    <video
      className={className}
      src={VIDEO_SRC}
      poster={POSTER_SRC}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-label="D60-hero — animated ASCII art"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

export { POSTER_SRC, VIDEO_SRC };