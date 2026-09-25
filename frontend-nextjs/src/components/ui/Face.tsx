import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * A person's face, drawn from their id and nothing else (docs/06-app-design.md).
 * No upload, no stored colour: the same id makes the same orb on every screen,
 * so everyone sees everyone the same way and there is nothing to keep or delete.
 */

/** FNV-1a, then mulberry32: a stable stream of numbers from any string. */
function stream(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Coral, orange, green, teal, cyan, blue, indigo, violet, pink (OKLCH hue). */
const BASE_HUES = [16, 48, 148, 176, 208, 242, 268, 300, 342];

/** Hues where a darker shade reads as olive or brown. */
const muddy = (h: number) => ((h % 360) + 360) % 360 > 72 && ((h % 360) + 360) % 360 < 132;

/** One seed's orb as numbers: three hues, where each bloom sits (in %), and the base's angle. */
interface Tones {
  hues: [number, number, number];
  at: [number, number, number, number, number, number];
  angle: number;
}

const cache = new Map<string, Tones>();

function tones(seed: string): Tones {
  const hit = cache.get(seed);
  if (hit) return hit;

  const next = stream(seed || "?");
  const between = (min: number, max: number) => min + next() * (max - min);

  // Base hues that stay clean as a sphere; the olive-yellow band turns muddy.
  const anchor = BASE_HUES[Math.floor(next() * BASE_HUES.length)];
  const hue = anchor + between(-8, 8);
  // Neighbours, not opposites: the orb should shift colour, not clash.
  let side = next() > 0.5 ? 1 : -1;
  const spread = between(30, 58);
  if (muddy(hue + side * spread)) side = -side;
  const second = hue + side * spread;
  const nudge = hue - side * between(14, 30);
  const third = muddy(nudge) ? hue : nudge;
  const wrap = (h: number) => Math.round((h + 360) % 360);

  const at = [between(14, 40), between(10, 36), between(60, 88), between(62, 90), between(18, 82), between(50, 84)].map(Math.round);
  const found: Tones = {
    hues: [wrap(hue), wrap(second), wrap(third)],
    at: at as Tones["at"],
    angle: Math.round(between(115, 165)),
  };
  cache.set(seed, found);
  return found;
}

/**
 * The layered gradients for one seed: three blooms over a base, and a
 * highlight. OKLCH keeps every hue at the same brightness, so no face shouts
 * louder. The same recipe is `.face-orb` in globals.css, which a Face uses so
 * a page of faces carries only their numbers.
 */
export function faceBackground(seed: string): string {
  const { hues, at, angle } = tones(seed);
  const [h1, h2, h3] = hues;
  return [
    // The light catching the top of a sphere.
    `radial-gradient(circle at 30% 22%, rgb(255 255 255 / 0.38) 0%, rgb(255 255 255 / 0) 36%)`,
    `radial-gradient(circle at ${at[0]}% ${at[1]}%, oklch(0.8 0.17 ${h1}) 0%, transparent 60%)`,
    `radial-gradient(circle at ${at[2]}% ${at[3]}%, oklch(0.6 0.22 ${h2}) 0%, transparent 64%)`,
    `radial-gradient(circle at ${at[4]}% ${at[5]}%, oklch(0.7 0.2 ${h3}) 0%, transparent 56%)`,
    `linear-gradient(${angle}deg in oklch, oklch(0.74 0.19 ${h1}), oklch(0.56 0.21 ${h2}))`,
  ].join(", ");
}

/** A face's numbers, for `.face-orb`. */
function faceVars(seed: string, size: number): CSSProperties {
  const { hues, at, angle } = tones(seed);
  return {
    "--fs": `${size}px`,
    "--f1": hues[0],
    "--f2": hues[1],
    "--f3": hues[2],
    "--p1": `${at[0]}% ${at[1]}%`,
    "--p2": `${at[2]}% ${at[3]}%`,
    "--p3": `${at[4]}% ${at[5]}%`,
    "--fa": `${angle}deg`,
  } as CSSProperties;
}

/** Where someone is: on the floor and free, busy, away, or in a call. Null is not here. */
export type Presence = "available" | "busy" | "away" | "in_call" | "offline" | null;

const PRESENCE: Record<Exclude<Presence, null>, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
  offline: "bg-faint",
};

export const Face = memo(function Face({
  seed,
  size = 32,
  presence = null,
  square = false,
  className,
  title,
}: {
  /** A user id (or office id): anything everyone agrees on and nobody changes. */
  seed: string;
  size?: number;
  presence?: Presence;
  /** Rounded square instead of a circle, for offices. */
  square?: boolean;
  className?: string;
  title?: string;
}) {
  const dot = Math.max(8, Math.round(size * 0.3));

  return (
    <span className={cn("relative inline-flex shrink-0 align-middle", className)} title={title} aria-hidden={title ? undefined : true}>
      <span className={cn("face-orb block", square ? "rounded-[30%]" : "rounded-full")} style={faceVars(seed, size)} />
      {presence && (
        <span
          className={cn("absolute rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]", PRESENCE[presence])}
          style={{ width: dot, height: dot, right: size * 0.02 - 1, bottom: size * 0.02 - 1 }}
        />
      )}
    </span>
  );
});

/** A row of overlapping faces, for "who is here" at a glance. */
export function FaceStack({
  seeds,
  size = 22,
  max = 4,
  className,
}: {
  seeds: string[];
  size?: number;
  max?: number;
  className?: string;
}) {
  const shown = seeds.slice(0, max);
  const extra = seeds.length - shown.length;
  return (
    <span className={cn("inline-flex shrink-0 items-center align-middle", className)}>
      {shown.map((seed, index) => (
        <span
          key={seed}
          className="flex shrink-0 rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]"
          style={{ width: size, height: size, marginInlineStart: index === 0 ? 0 : -size * 0.32 }}
        >
          <Face seed={seed} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground ring-2 ring-[var(--face-ring,var(--ui-card))]"
          style={{ width: size, height: size, marginInlineStart: -size * 0.32 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
