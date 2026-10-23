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
 * standing on the circle's lower edge, with your status as a dot kept inside
 * the circle's box so nothing around it clips it.
 */
export function CharacterBust({ character, presence, className }: { character: string; presence?: string | null; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-8 shrink-0", className)} aria-hidden>
      <span className="relative size-8 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_8%)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
        {/* The frame's feet 50px down: rows 14 to 46 of its 64, the head and shoulders. */}
        <PixelAvatar character={character} still width={32} style={{ left: "50%", top: 50 }} />
      </span>
      {presence && PRESENCE[presence] && (
        <span className={cn("absolute bottom-0 end-0 size-2.5 rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]", PRESENCE[presence])} />
      )}
    </span>
  );
}
