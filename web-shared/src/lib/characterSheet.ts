import { CHARACTER_CATALOG, characterLayers, characterOrDefault } from "@shared/character";

/**
 * Every character drawn anywhere (the floor, the doors, the creator, the
 * website's pictures) comes from here: its layers (shared-protocol
 * character.ts) stacked once into one sheet, kept for everyone who wears it.
 *
 * A sheet is frames of 32×64: idle (0 to 23) and walking (24 to 47), six a
 * direction (right, up, left, down), then one seated pose a direction (48 to
 * 51: down, left, right, up), as the floor counts them.
 */
export const [FRAME_W, FRAME_H] = CHARACTER_CATALOG.frame;
const MOVING = CHARACTER_CATALOG.frames;
export type Facing = "right" | "up" | "left" | "down";
const FACINGS: Facing[] = ["right", "up", "left", "down"];
export const SIT_ORDER: Facing[] = ["down", "left", "right", "up"];
export const SHEET_FRAMES = MOVING + SIT_ORDER.length;
/**
 * A seated pose: the standing one for that direction, nudged: sitting facing
 * up sinks into the chair, side views lean towards the desk.
 */
const SIT: Record<Facing, { frame: number; dx: number; dy: number }> = {
  down: { frame: 18, dx: 0, dy: 0 },
  left: { frame: 12, dx: -4, dy: 0 },
  right: { frame: 0, dx: 4, dy: 0 },
  up: { frame: 6, dx: 0, dy: 14 },
};

/** The frame to show: standing or walking, the step of six it's on; seated, one pose. */
export function frameOf(motion: "idle" | "walk" | "sit", facing: Facing, step = 0): number {
  if (motion === "sit") return MOVING + SIT_ORDER.indexOf(facing);
  return (motion === "walk" ? 24 : 0) + FACINGS.indexOf(facing) * 6 + (step % 6);
}

const images = new Map<string, Promise<HTMLImageElement>>();
function image(url: string): Promise<HTMLImageElement> {
  let found = images.get(url);
  if (!found) {
    found = new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => {
        images.delete(url);
        reject(new Error(`${url} didn't load`));
      };
      element.src = url;
    });
    images.set(url, found);
  }
  return found;
}

/**
 * Sheets drawn, the most recently used last. A sheet is a few hundred
 * kilobytes, so only so many are kept: the floor's sprites keep their own
 * (Phaser holds the canvas), and a creator trying looks on draws stills
 * (drawFrame) rather than sheets.
 */
const SHEETS_KEPT = 40;
const sheets = new Map<string, Promise<HTMLCanvasElement>>();
const ready = new Map<string, HTMLCanvasElement>();

/** A character's sheet, drawn the first time anyone asks and kept while it's in use. */
export function characterSheet(character: string): Promise<HTMLCanvasElement> {
  const key = characterOrDefault(character);
  let sheet = sheets.get(key);
  if (sheet) {
    sheets.delete(key);
  } else {
    sheet = draw(characterLayers(key)).then((canvas) => {
      ready.set(key, canvas);
      return canvas;
    });
    sheet.catch(() => {
      sheets.delete(key);
      ready.delete(key);
    });
  }
  sheets.set(key, sheet);
  for (const old of sheets.keys()) {
    if (sheets.size <= SHEETS_KEPT) break;
    sheets.delete(old);
    ready.delete(old);
  }
  return sheet;
}

/** The sheet, if it's drawn already: for drawing without waiting a frame. */
export const drawnSheet = (character: string): HTMLCanvasElement | undefined => ready.get(characterOrDefault(character));

/**
 * One standing or walking frame of a character, drawn at the art's size onto
 * a context: from its sheet if it has one, otherwise straight from its
 * layers, without drawing a sheet. For still pictures of many characters.
 * `current` says whether it's still wanted once the layers have loaded.
 */
export async function drawFrame(context: CanvasRenderingContext2D, character: string, frame: number, current = () => true): Promise<void> {
  const sheet = drawnSheet(character);
  const sources = sheet ? [sheet] : await Promise.all(characterLayers(character).map(image));
  if (!current()) return;
  context.clearRect(0, 0, FRAME_W, FRAME_H);
  for (const source of sources) context.drawImage(source, frame * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
}

async function draw(urls: string[]): Promise<HTMLCanvasElement> {
  const layers = await Promise.all(urls.map(image));
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W * SHEET_FRAMES;
  canvas.height = FRAME_H;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  for (const layer of layers) context.drawImage(layer, 0, 0, FRAME_W * MOVING, FRAME_H, 0, 0, FRAME_W * MOVING, FRAME_H);
  // The seated poses, each kept to its own frame as it's nudged.
  SIT_ORDER.forEach((facing, n) => {
    const { frame, dx, dy } = SIT[facing];
    const width = FRAME_W - Math.abs(dx);
    context.drawImage(canvas, frame * FRAME_W + Math.max(0, -dx), 0, width, FRAME_H - dy, (MOVING + n) * FRAME_W + Math.max(0, dx), dy, width, FRAME_H - dy);
  });
  return canvas;
}
