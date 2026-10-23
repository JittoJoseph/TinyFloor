"use client";

import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";
import { FloorPatch } from "./FloorPatch";

/**
 * A character on the office's floor, head to waist, at twice the art's size:
 * how you're shown where there's room for more than a circle (your card on
 * the floor, your profile). Whole pixels, so it's as crisp as the floor.
 */
export function CharacterPortrait({ character, className }: { character: string; className?: string }) {
  return (
    <span className={cn("relative block h-[4.5rem] w-16 shrink-0 overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]", className)}>
      <FloorPatch scale={2} material="plank-light" className="absolute inset-0 size-full" />
      {/* The frame's feet 106px down: its rows 11 to 47, at twice the size. */}
      <PixelAvatar character={character} width={64} style={{ left: "50%", top: 106 }} />
    </span>
  );
}
