import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** The sections' colours, saturated, from the illustrations' palette: each with a lighter tone of itself where the light falls. */
const TONES = {
  blurple: ["#5865f2", "#8c95ff"],
  coral: ["#ff6a55", "#ffa184"],
  mint: ["#1fc79c", "#7ce8c6"],
  sun: ["#ffc23d", "#ffe28f"],
} as const;

export type Tone = keyof typeof TONES;

/** A block of a section's colour, lit from its top corner, for the app to stand in, rise out of or break out of. */
export const lit = (tone: Tone): CSSProperties => ({
  background: `radial-gradient(120% 90% at 88% 0%, ${TONES[tone][1]} 0%, ${TONES[tone][0]} 60%)`,
});

/**
 * One clay object (public/objects), set where it means something in the
 * picture: a hand by the wave, a camera on top of the call. It sits over
 * whatever it's beside, so it's laid absolutely by the caller.
 */
export function Clay({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/objects/${name}.webp`}
      alt=""
      aria-hidden
      width={320}
      height={320}
      loading="lazy"
      decoding="async"
      style={style}
      className={cn("pointer-events-none absolute z-10 select-none drop-shadow-[0_18px_22px_rgb(0_0_0/0.16)]", className)}
    />
  );
}
