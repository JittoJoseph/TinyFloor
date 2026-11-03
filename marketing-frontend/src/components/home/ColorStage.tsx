import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The stages' colours: saturated, one per section, from the illustrations' palette. */
const TONES = {
  blurple: "#5865f2",
  coral: "#ff6a55",
  mint: "#1fc79c",
  sun: "#ffc23d",
} as const;

/**
 * A product view set on a stage of colour, the way the big product sites
 * frame theirs: a saturated panel with large rounded corners, the app itself
 * on a card inside it, and one clay object (public/objects) hanging off a
 * corner. The colour is the section's; the app stays as the app draws it.
 */
export function ColorStage({
  tone,
  object,
  side = "end",
  className,
  card = "p-4 sm:p-6",
  children,
}: {
  tone: keyof typeof TONES;
  /** A clay object's name in public/objects, laid half over the stage's top corner. */
  object?: string;
  side?: "start" | "end";
  className?: string;
  /** The inner card's padding: none for a view that brings its own frame. */
  card?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative rounded-[36px] p-5 sm:p-10", className)} style={{ background: TONES[tone] }}>
      {object && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/objects/${object}.webp`}
          alt=""
          aria-hidden
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
          className={cn(
            "pointer-events-none absolute -top-12 z-10 w-24 select-none sm:-top-16 sm:w-32",
            side === "end" ? "-end-4 sm:-end-10" : "-start-4 sm:-start-10",
          )}
        />
      )}
      <div className={cn("relative rounded-[22px] bg-background shadow-[0_30px_60px_-24px_rgb(0_0_0/0.5)] [--face-ring:var(--ui-background)]", card)}>{children}</div>
    </div>
  );
}
