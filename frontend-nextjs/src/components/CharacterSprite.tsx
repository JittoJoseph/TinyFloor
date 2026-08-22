"use client";

import { useEffect, useRef } from "react";

const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 32;
const FRAME_COUNT = 6;
const FRAME_MS = 100;
const DIRECTION_START: Record<string, number> = {
  right: 0,
  up: 6,
  left: 12,
  down: 18,
};

export type SpriteState = "idle" | "run";
export type SpriteDirection = "right" | "up" | "left" | "down";

export function CharacterSprite({
  character,
  state = "idle",
  direction = "down",
  scale = 2.3,
  offsetY = -8,
}: {
  character: string;
  state?: SpriteState;
  direction?: SpriteDirection;
  scale?: number;
  offsetY?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.src =
      state === "run"
        ? `/characters/${character}_run_16x16.png`
        : `/characters/${character}_idle_anim_16x16.png`;

    const start = DIRECTION_START[direction] ?? DIRECTION_START.down;
    let frameRequest = 0;
    let cancelled = false;
    let lastFrame = -1;

    const draw = () => {
      if (cancelled) return;

      const frame = Math.floor(performance.now() / FRAME_MS) % FRAME_COUNT;
      if (frame !== lastFrame && img.complete && img.naturalWidth > 0) {
        lastFrame = frame;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          ((start + frame) % 24) * SPRITE_WIDTH,
          0,
          SPRITE_WIDTH,
          SPRITE_HEIGHT,
          0,
          offsetY,
          SPRITE_WIDTH * scale,
          SPRITE_HEIGHT * scale,
        );
      }

      frameRequest = requestAnimationFrame(draw);
    };

    frameRequest = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRequest);
    };
  }, [character, state, direction, scale, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_WIDTH * scale}
      height={SPRITE_HEIGHT * scale}
      className="pixel-art"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
