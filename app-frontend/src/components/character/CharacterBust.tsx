"use client";

import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";

const PRESENCE: Record<string, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
};

/**
 * Your character, head and shoulders, in a circle: you on the floor, where a
 * Face is you everywhere else. Drawn at the art's own size, a pixel to a pixel
 * (never scaled, which pixel art doesn't survive), with your status as a dot
 * over the circle's edge, as a Face has it. A bigger circle shows more of
 * the character rather than a bigger one: framed around `center` (a row of
 * the frame's 64: 34 is the face, 37 the neck), so it can sit further back.
 */
export function CharacterBust({
  character,
  presence,
  size = 32,
  center = 34,
  className,
}: {
  character: string;
  presence?: string | null;
  size?: number;
  center?: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      <span
        className="relative overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_8%)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: size, height: size }}
      >
        {/* The frame's feet this far down, so the row it's framed around sits in the circle's middle. */}
        <PixelAvatar character={character} still width={32} style={{ left: "50%", top: 64 - center + size / 2 }} />
      </span>
      {presence && PRESENCE[presence] && (
        <span
          className={cn("absolute rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]", PRESENCE[presence])}
          style={{ width: 10, height: 10, right: -1, bottom: -1 }}
        />
      )}
    </span>
  );
}
