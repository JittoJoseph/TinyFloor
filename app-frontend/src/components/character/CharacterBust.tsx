"use client";

import { PixelAvatar } from "web-shared/components/PixelAvatar";
import { cn } from "web-shared/lib/utils";

/** How big the character is drawn, of the art's own size, and the row of its frame the circle centres on. */
const ZOOM = 0.72;
const CENTER = 30;

const PRESENCE: Record<string, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
};

/** How round its corners are, of its size: 10px on the dock's 36px keys, so it sits among them as one of them. */
const CORNER = 0.28;

/**
 * Your character's head in a rounded square, with room round it: you on the
 * floor, where a Face is you everywhere else, shaped like the dock's own keys,
 * with your status as a dot over its corner. Drawn smaller than the art (`zoom` of it),
 * so a hat fits and the face isn't pressed against the edge; smoothly, since
 * pixel art shrunk by a fraction loses rows unevenly the hard way. Framed
 * around `center`, a row of the frame's 64 (about 30 is the eyes, so what's
 * on the head shows too).
 */
export function CharacterBust({
  character,
  presence,
  size = 32,
  center = CENTER,
  zoom = ZOOM,
  corner = CORNER,
  alive = false,
  className,
}: {
  character: string;
  presence?: string | null;
  size?: number;
  center?: number;
  zoom?: number;
  /** How round its corners are, of its size, where the dock's own keys don't set it. */
  corner?: number;
  /** Breathing, as someone sitting at their desk does on the floor (a long still, then a breath), rather than a still picture. */
  alive?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size, borderRadius: Math.round(size * corner) }} aria-hidden>
      <span
        className="relative overflow-hidden rounded-[inherit] [corner-shape:inherit] bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_8%)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: size, height: size }}
      >
        {/* The frame's feet this far down, so the row it's framed around sits in the circle's middle. */}
        <PixelAvatar
          character={character}
          still={!alive}
          sitting={alive}
          width={32 * zoom}
          style={{ left: "50%", top: (64 - center) * zoom + size / 2, ...(zoom < 1 ? { imageRendering: "auto" } : {}) }}
        />
      </span>
      {presence && PRESENCE[presence] && (
        <span
          className={cn("absolute rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]", PRESENCE[presence])}
          style={{ width: 10, height: 10, right: -2, bottom: -2 }}
        />
      )}
    </span>
  );
}
