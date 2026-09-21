"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The header's two states. At the top of the page the bar is flat and as wide
 * as the page, over a hairline; once the page moves it lifts into a floating
 * pill, a little narrower, with the page fading out behind it. Everything else
 * is CSS keyed off `data-scrolled`.
 */
export function ScrollHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="group/header fixed inset-x-0 top-0 z-40 border-b border-border/70 transition-[padding,border-color] duration-300 ease-out data-[scrolled=true]:border-transparent data-[scrolled=true]:px-3 data-[scrolled=true]:pt-3 sm:data-[scrolled=true]:px-6 sm:data-[scrolled=true]:pt-4"
    >
      {/* The page fades out under the floating bar instead of cutting off at it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-background from-35% to-transparent opacity-0 transition-opacity duration-300 group-data-[scrolled=true]/header:opacity-100"
      />
      {children}
    </header>
  );
}
