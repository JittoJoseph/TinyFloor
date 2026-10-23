import * as Phaser from "phaser";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { CHARACTERS, DEFAULT_CHARACTER, isPremade } from "@shared/profile";
import { LOOKS, lookLayers, parseLook } from "@shared/look";

export type AnimationState = "idle" | "run";
export type Direction =
  | "right"
  | "up"
  | "left"
  | "down"
  | "up-right"
  | "up-left"
  | "down-right"
  | "down-left";

export type CardinalDirection = "right" | "up" | "left" | "down";

/**
 * Frame layout of the generated character atlases: 24 idle, 24 run, then one
 * seated pose per direction. Every frame is 32x32 so a single spritesheet and a
 * single origin cover standing and sitting alike. A look (look.ts) is drawn in
 * the same order, from its parts' strips (idle then walk), in frames of 32x64
 * at their own size: as tall on the floor as a premade at twice its size.
 */
const IDLE_BASE = 0;
const RUN_BASE = 24;
const SIT_BASE = 48;
const PER_DIRECTION = 6;
const DIRECTION_ORDER: CardinalDirection[] = ["right", "up", "left", "down"];
const SIT_ORDER: CardinalDirection[] = ["down", "left", "right", "up"];

const FRAME_SIZE = 32;
const PREMADE_SCALE = 2;
const [LOOK_W, LOOK_H] = LOOKS.frame;
/**
 * A look's seated poses: the standing pose for that direction, nudged as the
 * premades' are (tools/buildcharacters.py), in its own pixels: sitting facing
 * up sinks into the chair, side views lean towards the desk.
 */
const LOOK_SIT: Record<CardinalDirection, { frame: number; dx: number; dy: number }> = {
  down: { frame: 18, dx: 0, dy: 0 },
  left: { frame: 12, dx: -4, dy: 0 },
  right: { frame: 0, dx: 4, dy: 0 },
  up: { frame: 6, dy: 14, dx: 0 },
};

/** Each part's picture, loaded once for every look that wears it. */
const layers = new Map<string, Promise<HTMLImageElement>>();
function layer(url: string): Promise<HTMLImageElement> {
  let image = layers.get(url);
  if (!image) {
    image = new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => {
        layers.delete(url);
        reject(new Error(`${url} didn't load`));
      };
      element.src = url;
    });
    layers.set(url, image);
  }
  return image;
}

export function directionFromVector(
  x: number,
  y: number,
  fallback: Direction = "down",
): Direction {
  const vertical = Math.abs(y) > 0.001 ? (y < 0 ? "up" : "down") : "";
  const horizontal = Math.abs(x) > 0.001 ? (x < 0 ? "left" : "right") : "";
  if (vertical && horizontal) return `${vertical}-${horizontal}` as Direction;
  return (vertical || horizontal || fallback) as Direction;
}

function toCardinal(direction: Direction): CardinalDirection {
  const mapping: Record<Direction, CardinalDirection> = {
    right: "right",
    "up-right": "right",
    up: "up",
    "up-left": "up",
    left: "left",
    "down-left": "left",
    down: "down",
    "down-right": "down",
  };
  return mapping[direction] ?? "down";
}

export class AnimationManager {
  private scene: Phaser.Scene;
  private static readonly FRAME_RATE = 10;
  /** Looks being drawn, by texture key. */
  private drawing = new Map<string, Promise<void>>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Your own look, if you have one, starts loading with the floor so you arrive as yourself. */
  preload(own?: string) {
    const look = parseLook(own);
    if (look) for (const url of lookLayers(look)) layer(url);
    CHARACTERS.forEach((char) => {
      this.scene.load.spritesheet(char, FLOOR_FILES.character(char), {
        frameWidth: FRAME_SIZE,
        frameHeight: FRAME_SIZE,
      });
    });
  }

  create() {
    CHARACTERS.forEach((char) => {
      // A character is 16px art drawn at 2.4x, so smooth sampling smears it and
      // nearest keeps it crisp. The map stays smooth: at a zoom that is not a
      // whole number, nearest makes every thin line on the floor flicker between
      // two and three pixels thick as the camera moves.
      this.scene.textures
        .get(char)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.createAnimSet(char, "idle", IDLE_BASE);
      this.createAnimSet(char, "run", RUN_BASE);
    });
  }

  private createAnimSet(char: string, state: AnimationState, base: number) {
    DIRECTION_ORDER.forEach((name, index) => {
      const start = base + index * PER_DIRECTION;
      this.scene.anims.create({
        key: `${char}_${state}_${name}`,
        frames: this.scene.anims.generateFrameNumbers(char, {
          start,
          end: start + PER_DIRECTION - 1,
        }),
        frameRate: AnimationManager.FRAME_RATE,
        repeat: -1,
      });
    });
  }

  getAnimationKey(
    char: string,
    state: AnimationState,
    direction: Direction,
  ): string {
    return `${char}_${state}_${toCardinal(direction)}`;
  }

  /**
   * Puts a character on a sprite: a premade, or a look, which is drawn the
   * first time anyone wears it. Until it is, the sprite is the default
   * premade; then it changes over in whatever it was doing (walking, sitting).
   * The sprite keeps the key its animations are named by as "spriteName".
   */
  wear(sprite: Phaser.GameObjects.Sprite, character: string) {
    sprite.setData("wearing", character);
    const look = parseLook(character);
    if (!look) return this.dress(sprite, isPremade(character) ? character : DEFAULT_CHARACTER);
    const key = `look:${character}`;
    if (this.scene.textures.exists(key)) return this.dress(sprite, key);
    if (!sprite.getData("spriteName")) this.dress(sprite, DEFAULT_CHARACTER);
    let drawing = this.drawing.get(key);
    if (!drawing) {
      drawing = this.draw(key, lookLayers(look));
      this.drawing.set(key, drawing);
      drawing.catch(() => this.drawing.delete(key));
    }
    drawing
      .then(() => {
        if (sprite.active && sprite.getData("wearing") === character) this.dress(sprite, key);
      })
      .catch(() => {});
  }

  /** Changes the sprite's texture, carrying on with the animation or pose it had. */
  private dress(sprite: Phaser.GameObjects.Sprite, key: string) {
    const was = sprite.getData("spriteName") as string | undefined;
    if (was === key) return;
    const playing = sprite.anims.isPlaying ? sprite.anims.currentAnim?.key : undefined;
    const frame = typeof sprite.frame.name === "number" ? sprite.frame.name : Number(sprite.frame.name);
    sprite.setData("spriteName", key);
    sprite.setScale(key.startsWith("look:") ? 1 : PREMADE_SCALE);
    if (playing && was && playing.startsWith(`${was}_`)) sprite.play(key + playing.slice(was.length));
    else sprite.setTexture(key, Number.isFinite(frame) ? frame : 0);
  }

  /** Draws a look's frames from its parts, bottom first, and makes its animations. */
  private async draw(key: string, urls: string[]) {
    const images = await Promise.all(urls.map(layer));
    if (this.scene.textures.exists(key)) return;
    const moving = 48;
    const canvas = document.createElement("canvas");
    canvas.width = LOOK_W * (moving + SIT_ORDER.length);
    canvas.height = LOOK_H;
    const context = canvas.getContext("2d")!;
    context.imageSmoothingEnabled = false;
    for (const image of images) context.drawImage(image, 0, 0);
    // The seated poses, after the moving frames, in the order getSitFrame counts them,
    // each kept to its own frame as it's nudged.
    SIT_ORDER.forEach((direction, n) => {
      const { frame, dx, dy } = LOOK_SIT[direction];
      const width = LOOK_W - Math.abs(dx);
      for (const image of images) {
        context.drawImage(image, frame * LOOK_W + Math.max(0, -dx), 0, width, LOOK_H - dy, (moving + n) * LOOK_W + Math.max(0, dx), dy, width, LOOK_H - dy);
      }
    });
    const texture = this.scene.textures.addCanvas(key, canvas);
    if (!texture) return;
    for (let n = 0; n < moving + SIT_ORDER.length; n++) texture.add(n, 0, n * LOOK_W, 0, LOOK_W, LOOK_H);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.createAnimSet(key, "idle", IDLE_BASE);
    this.createAnimSet(key, "run", RUN_BASE);
  }

  /** Sitting is a single pose, so it is a frame index rather than an animation. */
  getSitFrame(direction: CardinalDirection): number {
    return SIT_BASE + SIT_ORDER.indexOf(direction);
  }
}
