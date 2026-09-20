import React from "react";

/**
 * A handwritten note with an arrow, the way someone would scribble on a
 * printout to say "start here". The arrow sweeps out from under the note and
 * ends pointing at whatever the note is about; `flip` sends it the other way.
 */
export const Doodle: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** Point left instead of right, for a note that sits after its subject. */
  flip?: boolean;
}> = ({ children, className = "", flip = false }) => (
  // The display class comes from the caller, so a note can be hidden on a phone.
  <span aria-hidden="true" className={`pointer-events-none select-none items-center ${className}`}>
    <span className="font-hand text-[1.35rem] md:text-[1.55rem] leading-none text-[var(--color-braun-text)] opacity-50 -rotate-2 whitespace-nowrap">
      {children}
    </span>
    <Arrow flip={flip} />
  </span>
);

/**
 * One stroke and one head, with the head's barbs set along the curve's last
 * direction so the point lands where the line is going.
 */
const Arrow: React.FC<{ flip: boolean }> = ({ flip }) => (
  <svg
    viewBox="0 0 100 48"
    className={`w-[5.5rem] h-[2.6rem] md:w-24 md:h-11 text-[var(--color-braun-text)] opacity-40 ${
      flip ? "-scale-x-100" : ""
    } rtl:-scale-x-100`}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 11C26 43 62 46 92 30" />
    <path d="M86.2 39.3L92 30 81 29.6" />
  </svg>
);
