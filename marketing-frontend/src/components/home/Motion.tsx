"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * What makes the marketing pages' parts arrive as they scroll in: one
 * observer for the whole page, which marks each part it sees once
 * (`data-revealed`), and the CSS in globals.css does the rest. A part says
 * how it arrives with data attributes: `data-reveal` rises out of a blur (its
 * offset, scale and delay set by --rise-x, --rise-y, --rise-scale and --d),
 * `data-reveal-words` brings its words in one after another (Split), and
 * `data-reveal-laurel` grows the laurel's branches (Laurel). Everything is
 * already in the server's HTML; this only decides when it shows.
 */

const PARTS = "[data-reveal],[data-reveal-words],[data-reveal-laurel]";

export function Reveals() {
  // Each page brings its own parts, so look again after a navigation.
  const path = usePathname();
  useEffect(() => {
    const parts = document.querySelectorAll(`:is(${PARTS}):not([data-revealed])`);
    const show = (part: Element) => part.setAttribute("data-revealed", "");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      parts.forEach(show);
      return;
    }
    document.documentElement.classList.add("revealing");
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          seen.unobserve(entry.target);
        }
      },
      // The moment its top comes up over the bottom of the screen, so it is in
      // place by the time the eye gets to it.
      { rootMargin: "0px", threshold: 0 },
    );
    parts.forEach((part) => seen.observe(part));
    // The last parts of a page may never get that high: at the bottom, show what's left.
    const end = () => {
      if (innerHeight + scrollY < document.documentElement.scrollHeight - 4) return;
      parts.forEach(show);
      removeEventListener("scroll", end);
    };
    addEventListener("scroll", end, { passive: true });
    return () => {
      seen.disconnect();
      removeEventListener("scroll", end);
    };
  }, [path]);
  return null;
}
