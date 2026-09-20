import React from "react";

/**
 * A handwritten note with an arrow, the way someone would scribble on a
 * printout to say "start here". Used sparingly on the landing page to point at
 * the thing worth trying first.
 */
export const Doodle: React.FC<{
  children: React.ReactNode;
  /** Which way the arrow curves away from the note. */
  arrow: "down-start" | "down-end" | "up-start";
  className?: string;
}> = ({ children, arrow, className = "" }) => (
  // The display class comes from the caller, so a note can be hidden on a phone.
  <span aria-hidden="true" className={`pointer-events-none select-none flex-col items-center ${className}`}>
    <span className="font-hand text-[1.35rem] md:text-[1.6rem] leading-none text-[var(--color-braun-text)] opacity-45 -rotate-3 whitespace-nowrap">
      {children}
    </span>
    <Arrow shape={arrow} />
  </span>
);

const PATHS: Record<string, { d: string; head: string; box: string }> = {
  // A curve that leaves the note and points down and to the left.
  "down-start": {
    d: "M62 6C50 26 34 36 14 44",
    head: "M14 44l14-3M14 44l6 12",
    box: "0 0 72 60",
  },
  "down-end": {
    d: "M10 6C22 26 38 36 58 44",
    head: "M58 44l-14-3M58 44l-6 12",
    box: "0 0 72 60",
  },
  // Points up and to the left, for a note that sits below what it means.
  "up-start": {
    d: "M62 54C50 34 34 24 14 16",
    head: "M14 16l14 3M14 16l6-12",
    box: "0 0 72 60",
  },
};

const Arrow: React.FC<{ shape: string }> = ({ shape }) => {
  const path = PATHS[shape] ?? PATHS["down-start"];
  return (
    <svg
      viewBox={path.box}
      className="w-16 h-12 md:w-[4.5rem] md:h-14 text-[var(--color-braun-text)] opacity-30 rtl:-scale-x-100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path.d} />
      <path d={path.head} />
    </svg>
  );
};
