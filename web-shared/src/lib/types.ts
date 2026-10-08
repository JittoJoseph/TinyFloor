export const TILE_SIZE = 32;
export const MOVEMENT_SPEED = 120;
export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

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

export function isValidTile(tileX: number, tileY: number): boolean {
  return (
    tileX >= 1 &&
    tileX < MAP_WIDTH_TILES - 1 &&
    tileY >= 1 &&
    tileY < MAP_HEIGHT_TILES - 1
  );
}

export type Status = "available" | "busy" | "away" | "in_call" | "offline";

export type PlayerStatus = Status;
