// The office's walls and floors (shared-protocol/src/shell.ts, the one drawing
// the app uses too), and the lab's own way of drawing them into a canvas.
import { paintShell } from "../../shared-protocol/src/shell.ts";

export { TILE, WALLS, FLOORS, cells, paintShell, wallSolids, paint } from "../../shared-protocol/src/shell.ts";

export const ROOM_BUILDER = "/app/tilesets/textures/Room_Builder_Office_32x32.png";

/** Draws the shell into a new canvas, the size of the floor. */
export async function renderShell(shell, loadImage) {
  const sheet = await loadImage(ROOM_BUILDER);
  const source = document.createElement("canvas");
  source.width = sheet.width;
  source.height = sheet.height;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(sheet, 0, 0);
  const { width, height, data } = paintShell(shell, { width: sheet.width, height: sheet.height, data: sctx.getImageData(0, 0, sheet.width, sheet.height).data });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}
