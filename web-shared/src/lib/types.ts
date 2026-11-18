export const TILE_SIZE = 32;
/** Walking speed, in pixels a second: arrow keys and WASD, and a click a few steps away. */
export const MOVEMENT_SPEED = 120;
/** Running: a click further away than RUN_FROM_TILES, an errand across the floor, or WASD with Shift held. */
export const RUN_SPEED = 320;
/** A walk longer than this many tiles is run. */
export const RUN_FROM_TILES = 5;
/** How much quicker the legs go while running. */
export const RUN_STRIDE = 1.6;

export function pixelToTile(
  pixelX: number,
  pixelY: number,
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(pixelX / TILE_SIZE),
    tileY: Math.floor(pixelY / TILE_SIZE),
  };
}

export function tileToPixel(
  tileX: number,
  tileY: number,
): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export type Status = "available" | "busy" | "away" | "in_call" | "offline";

export type PlayerStatus = Status;
