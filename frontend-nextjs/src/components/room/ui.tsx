"use client";

import React from "react";

/**
 * One look for everything that floats over the floor: the header, the control
 * bar, the panels and the little bars that follow people around. Keeping the
 * surface, the button size and the type in one place is what stops the room
 * from drifting into five different styles.
 */

/** A panel resting on top of the room. */
export const surface =
  "bg-card/92 backdrop-blur-md border border-border shadow-float [--face-ring:var(--ui-card)]";

/** Anything with words in it: never shouted, never smaller than 12px. */
export const label = "text-[13px] font-medium";
export const quietLabel = "text-[12px] text-muted-foreground";

export type Tone = "quiet" | "on" | "alert" | "danger" | "dark";

const TONES: Record<Tone, string> = {
  quiet: "bg-card border-border text-foreground hover:bg-muted",
  on: "bg-ok border-ok text-white hover:opacity-90",
  alert: "bg-destructive/12 border-destructive/20 text-destructive hover:bg-destructive/18",
  danger: "bg-destructive border-destructive text-white hover:opacity-90",
  dark: "bg-foreground border-foreground text-background hover:bg-foreground/90",
};

const base =
  "cursor-pointer inline-flex items-center justify-center shrink-0 border transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40 disabled:cursor-not-allowed";

/** Two sizes: the bars you aim at, and the small ones that follow a person. */
const SIZES = { md: "w-10 h-10", sm: "w-8 h-8" };

/**
 * A round button with an icon in it, big enough for a thumb, so rows of them
 * line up without fiddling.
 */
export const RoomIconButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    title: string;
    tone?: Tone;
    size?: keyof typeof SIZES;
    /** A dot in the corner, for something that needs attention. */
    mark?: React.ReactNode;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title">
>(function RoomIconButton(
  { icon, title, tone = "quiet", size = "md", mark, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={title}
      aria-label={title}
      className={`${base} ${TONES[tone]} relative ${SIZES[size]} rounded-full ${className}`}
      {...rest}
    >
      {icon}
      {mark}
    </button>
  );
});

/** The same button with a word next to the icon, for the header. */
export const RoomButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    children: React.ReactNode;
    tone?: Tone;
    /** Hides the word on phones, where the icon is enough. */
    compact?: boolean;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function RoomButton({ icon, children, tone = "quiet", compact = true, className = "", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`${base} ${TONES[tone]} h-10 gap-2 rounded-full px-3 sm:px-4 ${label} ${className}`}
      {...rest}
    >
      {icon}
      <span className={compact ? "hidden sm:inline" : undefined}>{children}</span>
    </button>
  );
});

/** The link version of the same thing, for Leave. */
export function roomLinkClass(tone: Tone = "quiet") {
  return `${base} ${TONES[tone]} h-10 gap-2 rounded-full px-3 sm:px-4 ${label}`;
}

/** A hairline between groups of buttons. */
export const Divider = ({ className = "" }: { className?: string }) => (
  <span aria-hidden="true" className={`w-px h-6 bg-border shrink-0 ${className}`} />
);

/** The count badge on the chat button. */
export const Badge = ({ count }: { count: number }) => (
  <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-card">
    {count > 9 ? "9+" : count}
  </span>
);
