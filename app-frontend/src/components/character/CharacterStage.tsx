"use client";

import type { CSSProperties } from "react";
import { PixelAvatar, type AvatarDirection } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";

/**
 * Where a character is shown off the floor: a soft surface, lighter at the
 * top, with a shadow on the ground under their feet, and the character
 * standing on it in whole pixels (`scale` times the art). The creator's stage,
 * your card on the floor and your profile all show you on one, so you look
 * the same wherever you're shown.
 */
export function CharacterStage({
  character,
  scale = 2,
  ground = 12,
  direction,
  walking,
  still,
  className,
  style,
}: {
  character: string;
  /** Whole pixels: the art's size times this. */
  scale?: 1 | 2 | 3;
  /** How far above the stage's bottom edge the feet stand: pixels, or a share of its height ("18%"). */
  ground?: number | string;
  direction?: AvatarDirection;
  walking?: boolean;
  still?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const line = typeof ground === "number" ? `${ground}px` : ground;
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-2xl bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ui-muted)_45%,transparent),var(--ui-muted))] shadow-[inset_0_0_0_1px_var(--ui-border)]",
        className,
      )}
      style={style}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-black/25 blur-[2px]"
        style={{ bottom: line, width: 12 * scale + 8, height: 3 * scale + 2 }}
      />
      {/* The frame's feet: the art's last row is its feet, so the frame stands on the ground line. */}
      <PixelAvatar character={character} direction={direction} running={walking} still={still} width={32 * scale} style={{ left: "50%", top: `calc(100% - ${line})` }} />
    </span>
  );
}
