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
 * Face is you everywhere else. Drawn at the art's own size, a pixel to a pixel,
 * its face in the middle of the circle, with your status as a dot over the
 * circle's edge, as a Face has it.
 */
export function CharacterBust({ character, presence, className }: { character: string; presence?: string | null; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-8 shrink-0", className)} aria-hidden>
      <span className="relative size-8 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_8%)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
        {/* The frame's feet 46px down: rows 18 to 50 of its 64, from the top of the hair to the shoulders. */}
        <PixelAvatar character={character} still width={32} style={{ left: "50%", top: 46 }} />
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
