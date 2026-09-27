"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The app itself, in a short loop: the floor, the chat, and walking up to
 * someone for a call. Recorded from the real app (/video-demo?cut=readme) in
 * its dark theme, which sits well on either page. The first frame is the
 * poster, so the page paints before a byte of video arrives; the video is
 * about half a megabyte of static asset, paused while off screen, and held on
 * that first frame for anyone who asks for less motion.
 */
export function HeroFilm({ label, className }: { label: string; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.pause();
      return;
    }
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? el.play().catch(() => {}) : el.pause()));
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  return (
    <video
      ref={video}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      width={1920}
      height={1080}
      poster="/hero/poster.webp"
      aria-label={label}
      className={cn("block aspect-[16/9] w-full bg-[#0f0f10] object-cover", className)}
    >
      <source src="/hero/tour.av1.mp4" type='video/mp4; codecs="av01.0.08M.08"' />
      <source src="/hero/tour.h264.mp4" type="video/mp4" />
    </video>
  );
}
