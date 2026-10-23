"use client";

import { useEffect, useRef } from "react";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { FLOORS } from "@shared/shell";

const TILE = 32;
/** The room builder sheet's tiles are numbered from 1, sixteen to a row; a floor's plain tile is its base and 18. */
const tileAt = (material: string) => {
  const i = (FLOORS[material] ?? FLOORS.plank) + 18 - 1;
  return [(i % 16) * TILE, Math.floor(i / 16) * TILE] as const;
};

/**
 * A patch of the office's own floor, drawn from the room builder sheet the
 * floor is drawn from, `scale` of the floor's pixels to a screen pixel: what
 * a character stands on where they're shown off the floor.
 */
export function FloorPatch({ scale = 2, material = "plank", className }: { scale?: number; material?: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const sheet = new Image();
    let alive = true;
    const paint = () => {
      const { width, height } = element.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      const context = element.getContext("2d");
      if (!context || !sheet.complete || !sheet.naturalWidth) return;
      context.imageSmoothingEnabled = false;
      const size = TILE * scale * ratio;
      const [sx, sy] = tileAt(material);
      // Tiles from the middle out, so the patch is centred whatever its size.
      const ox = (element.width / 2) % size - size;
      const oy = (element.height / 2) % size - size;
      for (let y = oy; y < element.height; y += size) {
        for (let x = ox; x < element.width; x += size) context.drawImage(sheet, sx, sy, TILE, TILE, Math.round(x), Math.round(y), Math.round(size), Math.round(size));
      }
    };
    sheet.onload = () => alive && paint();
    sheet.src = FLOOR_FILES.roomBuilder;
    const observer = new ResizeObserver(paint);
    observer.observe(element);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [scale, material]);

  return <canvas ref={canvas} aria-hidden className={className} />;
}
