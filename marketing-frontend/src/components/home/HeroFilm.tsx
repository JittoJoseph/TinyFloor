"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const POSTER = "/hero/poster.webp";

/**
 * The app itself, in a short loop: the floor, the chat, and walking up to
 * someone for a call. Recorded from the real app (/video-demo?cut=readme) in
 * its dark theme, which sits well on either page. The first frame is the
 * poster, preloaded on every page that shows it, so the page paints before a
 * byte of video arrives. The video (about half a megabyte) is only attached
 * once the page has loaded, so on a slow phone it never competes with the
 * page itself; it is paused while off screen, and held on the poster for
 * anyone who asks for less motion.
 */
export function HeroFilm({ label, className }: { label: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = () => setPlaying(true);
    if (document.readyState === "complete") start();
    else addEventListener("load", start, { once: true });
    return () => removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || !playing) return;
    el.load();
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? el.play().catch(() => {}) : el.pause()));
    seen.observe(el);
    return () => seen.disconnect();
  }, [playing]);

  return (
    <>
      {/* React hoists this into the head: the poster is what the page paints first. */}
      <link rel="preload" as="image" href={POSTER} type="image/webp" fetchPriority="high" />
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        width={1920}
        height={1080}
        poster={POSTER}
        aria-label={label}
        className={cn("block aspect-[16/9] w-full bg-[#0f0f10] object-cover", className)}
      >
        {playing && (
          <>
            <source src="/hero/tour.av1.mp4" type='video/mp4; codecs="av01.0.08M.08"' />
            <source src="/hero/tour.h264.mp4" type="video/mp4" />
          </>
        )}
      </video>
    </>
  );
}
