export const MAP_WIDTH_TILES = 48;
export const MAP_HEIGHT_TILES = 32;

/** Inside the office walls. Walkability is the client's job; the server only keeps people on the map. */
export function isInsideMap(x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 1 &&
    x < MAP_WIDTH_TILES - 1 &&
    y >= 1 &&
    y < MAP_HEIGHT_TILES - 1
  );
}
