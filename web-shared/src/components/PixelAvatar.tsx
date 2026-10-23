"use client";

import React, { useEffect, useRef } from "react";
import { statusColor } from "@/lib/status";
import { FRAME_H, FRAME_W, characterSheet, drawFrame, drawnSheet, frameOf, seatedStep, type Facing } from "@/lib/characterSheet";

export type AvatarDirection = Facing;

interface PixelAvatarProps {
  character: string;
  direction?: AvatarDirection;
  running?: boolean;
  /** Seated, facing `direction`: one pose. */
  sitting?: boolean;
  /** Standing still on one frame, rather than breathing. */
  still?: boolean;
  /**
   * How wide its frame is drawn (32 of the art's pixels). In whole pixels a
   * multiple of 32 keeps every pixel the same size; a size from its container
   * (cqw) follows the container instead.
   */
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/** Every character on the page steps together, ten times a second, as on the floor. */
const STEP_MS = 100;
const steppers = new Set<(step: number) => void>();
let step = 0;
let timer: ReturnType<typeof setInterval> | undefined;
function onStep(listener: (step: number) => void): () => void {
  steppers.add(listener);
  timer ??= setInterval(() => {
    step++;
    steppers.forEach((one) => one(step));
  }, STEP_MS);
  return () => {
    steppers.delete(listener);
    if (!steppers.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * A character, standing at its feet: `style` places that point (left, top),
 * and it rises from there. Drawn from its sheet (lib/characterSheet) onto a
 * canvas at the art's own size, scaled up in whole pixels.
 */
export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  character,
  direction = "down",
  running = false,
  sitting = false,
  still = false,
  width = 32,
  className = "",
  style,
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    let live = true;
    // Standing still: one frame, drawn from its layers, without a sheet.
    if (still && !sitting) {
      void drawFrame(context, character, frameOf(running ? "walk" : "idle", direction), () => live).catch(() => {});
      return () => {
        live = false;
      };
    }
    let sheet = drawnSheet(character);
    let at = step;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const moves = !still && !reduce;
    // Seated people each breathe in their own time, not in step with the whole room.
    const offset = Math.floor(Math.random() * 20);
    const paint = () => {
      context.clearRect(0, 0, FRAME_W, FRAME_H);
      if (!sheet) return;
      const frame = sitting ? frameOf("sit", direction, moves ? seatedStep(at + offset) : 0) : frameOf(running ? "walk" : "idle", direction, moves ? at : 0);
      context.drawImage(sheet, frame * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    };
    paint();
    if (!sheet) {
      characterSheet(character)
        .then((drawn) => {
          if (!live) return;
          sheet = drawn;
          paint();
        })
        .catch(() => {});
    }
    const stop = moves
      ? onStep((now) => {
          at = now;
          paint();
        })
      : undefined;
    return () => {
      live = false;
      stop?.();
    };
  }, [character, direction, running, sitting, still]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      width={FRAME_W}
      height={FRAME_H}
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-full [image-rendering:pixelated] ${className}`}
      style={{ ...style, width: typeof width === "number" ? `${width}px` : width, aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
    />
  );
};

const length = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

/**
 * The plate reads off the character it belongs to, so a floor that scales with
 * its container keeps the same proportions on a phone as on a desktop. Every
 * part of it is in em, and 34px wide, the usual character, gives the 13px plate
 * these screens were drawn with.
 */
export const Nameplate: React.FC<{
  name: string;
  status?: string;
  offset?: number | string;
  size?: number | string;
}> = ({ name, status = "available", offset = 62, size = 34 }) => (
  <span
    className="absolute left-0 -translate-x-1/2 flex items-center gap-[0.45em] rounded-full bg-[#1f2937]/85 border border-[#374151]/60 px-[0.6em] py-[0.25em] font-pixel leading-none text-white whitespace-nowrap"
    style={{
      bottom: length(offset),
      fontSize: `max(8px, calc(${length(size)} * 0.38))`,
    }}
  >
    <span
      className="w-[0.55em] h-[0.55em] rounded-full"
      style={{ backgroundColor: statusColor(status) }}
    />
    {name}
  </span>
);
