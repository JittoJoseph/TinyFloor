import * as Phaser from "phaser";

export type CharacterName = "Adam" | "Alex" | "Amelia" | "Bob";
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
 * single origin cover standing and sitting alike.
 */
const IDLE_BASE = 0;
const RUN_BASE = 24;
const SIT_BASE = 48;
const PER_DIRECTION = 6;
const DIRECTION_ORDER: CardinalDirection[] = ["right", "up", "left", "down"];
const SIT_ORDER: CardinalDirection[] = ["down", "left", "right", "up"];

export const FRAME_SIZE = 32;

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

export function toCardinal(direction: Direction): CardinalDirection {
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
  private static readonly CHARACTERS: CharacterName[] = [
    "Adam",
    "Alex",
    "Amelia",
    "Bob",
  ];
  private static readonly FRAME_RATE = 10;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    AnimationManager.CHARACTERS.forEach((char) => {
      this.scene.load.spritesheet(char, `/characters/${char}.png`, {
        frameWidth: FRAME_SIZE,
        frameHeight: FRAME_SIZE,
      });
    });
  }

  create() {
    AnimationManager.CHARACTERS.forEach((char) => {
      this.createAnimSet(char, "idle", IDLE_BASE);
      this.createAnimSet(char, "run", RUN_BASE);
    });
  }

  private createAnimSet(char: CharacterName, state: AnimationState, base: number) {
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

  /** Sitting is a single pose, so it is a frame index rather than an animation. */
  getSitFrame(direction: CardinalDirection): number {
    return SIT_BASE + SIT_ORDER.indexOf(direction);
  }
}
