import { paintShell } from "@shared/shell";
import { FLOOR } from "@shared/map";

/** The room builder sheet the walls and floors are painted from. */
const SHEET = "/tilesets/textures/Room_Builder_Office_32x32.png";

type Walls = ImageBitmap | HTMLCanvasElement;

let painting: Promise<Walls> | null = null;
let painted: Walls | null = null;

/**
 * The floor's walls and floors as one picture (shared-protocol shell.ts),
 * painted once a page: started with the floor's other files (floorWarmup),
 * while the office is still being read, so the scene finds it ready. Painted
 * in a worker where the browser has one that can draw, so the page isn't
 * held up starting the floor meanwhile; on the page itself otherwise.
 */
export function floorWalls(): Promise<Walls> {
  painting ??= (canPaintAway() ? paintAway().catch(paintHere) : paintHere()).then(
    (walls) => (painted = walls),
    (error) => {
      painting = null;
      throw error;
    },
  );
  return painting;
}

/** The picture, if it's painted by now. */
export const floorWallsNow = (): Walls | null => painted;

const canPaintAway = () => typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";

function paintAway(): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./floorWalls.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ImageBitmap | null>) => {
      worker.terminate();
      if (event.data) resolve(event.data);
      else reject(new Error("walls not painted"));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event);
    };
    worker.postMessage({ sheet: SHEET, shell: FLOOR.shell });
  });
}

async function paintHere(): Promise<HTMLCanvasElement> {
  const sheet = new Image();
  sheet.src = SHEET;
  await sheet.decode();
  const source = document.createElement("canvas");
  [source.width, source.height] = [sheet.width, sheet.height];
  const context = source.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(sheet, 0, 0);
  const pixels = paintShell(FLOOR.shell, { width: sheet.width, height: sheet.height, data: context.getImageData(0, 0, sheet.width, sheet.height).data });
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [pixels.width, pixels.height];
  canvas.getContext("2d")!.putImageData(new ImageData(pixels.data as Uint8ClampedArray<ArrayBuffer>, pixels.width, pixels.height), 0, 0);
  return canvas;
}
