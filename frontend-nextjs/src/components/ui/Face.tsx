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

const cache = new Map<string, string>();

/** Coral, orange, green, teal, cyan, blue, indigo, violet, pink (OKLCH hue). */
const BASE_HUES = [16, 48, 148, 176, 208, 242, 268, 300, 342];

/** Hues where a darker shade reads as olive or brown. */
const muddy = (h: number) => ((h % 360) + 360) % 360 > 72 && ((h % 360) + 360) % 360 < 132;

/** The layered gradients for one seed: three blooms over a base, and a highlight. */
export function faceBackground(seed: string): string {
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
  // OKLCH keeps every hue at the same brightness, so no face shouts louder.
  const color = (h: number, l: number, c: number) => `oklch(${l} ${c} ${Math.round((h + 360) % 360)})`;

  const x1 = between(14, 40);
  const y1 = between(10, 36);
  const x2 = between(60, 88);
  const y2 = between(62, 90);
  const x3 = between(18, 82);
  const y3 = between(50, 84);

  const background = [
    // The light catching the top of a sphere.
    `radial-gradient(circle at 30% 22%, rgb(255 255 255 / 0.38) 0%, rgb(255 255 255 / 0) 36%)`,
    `radial-gradient(circle at ${x1}% ${y1}%, ${color(hue, 0.8, 0.17)} 0%, transparent 60%)`,
    `radial-gradient(circle at ${x2}% ${y2}%, ${color(second, 0.6, 0.22)} 0%, transparent 64%)`,
    `radial-gradient(circle at ${x3}% ${y3}%, ${color(third, 0.7, 0.2)} 0%, transparent 56%)`,
    `linear-gradient(${Math.round(between(115, 165))}deg in oklch, ${color(hue, 0.74, 0.19)}, ${color(second, 0.56, 0.21)})`,
  ].join(", ");

  cache.set(seed, background);
  return background;
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
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: faceBackground(seed),
    // The shadow scales with the orb, so small ones stay crisp and big ones round.
    boxShadow: `inset ${-size * 0.06}px ${-size * 0.08}px ${size * 0.18}px rgb(0 0 0 / 0.22), inset ${
      size * 0.04
    }px ${size * 0.05}px ${size * 0.12}px rgb(255 255 255 / 0.28)`,
  };
  const dot = Math.max(8, Math.round(size * 0.3));

  return (
    <span className={cn("relative inline-flex shrink-0", className)} title={title} aria-hidden={title ? undefined : true}>
      <span className={cn("block", square ? "rounded-[30%]" : "rounded-full")} style={style} />
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
    <span className={cn("inline-flex items-center", className)}>
      {shown.map((seed, index) => (
        <span
          key={seed}
          className="rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]"
          style={{ marginInlineStart: index === 0 ? 0 : -size * 0.32 }}
        >
          <Face seed={seed} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="rounded-full bg-muted text-muted-foreground ring-2 ring-[var(--face-ring,var(--ui-card))] inline-flex items-center justify-center text-[10px] font-semibold tabular-nums"
          style={{ width: size, height: size, marginInlineStart: -size * 0.32 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
