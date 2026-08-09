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
      this.scene.load.spritesheet(
        `${char}_idle`,
        `/characters/${char}_idle_anim_16x16.png`,
        {
          frameWidth: 16,
          frameHeight: 32,
        },
      );
      this.scene.load.spritesheet(
        `${char}_run`,
        `/characters/${char}_run_16x16.png`,
        {
          frameWidth: 16,
          frameHeight: 32,
        },
      );
    });
  }

  create() {
    AnimationManager.CHARACTERS.forEach((char) => {
      this.createAnimSet(char, "idle");
      this.createAnimSet(char, "run");
    });
  }

  private createAnimSet(char: CharacterName, state: AnimationState) {
    const keyBase = `${char}_${state}`;
    const directions = [
      { name: "right", start: 0 },
      { name: "up", start: 6 },
      { name: "left", start: 12 },
      { name: "down", start: 18 },
    ];

    directions.forEach(({ name, start }) => {
      this.scene.anims.create({
        key: `${keyBase}_${name}`,
        frames: this.scene.anims.generateFrameNumbers(keyBase, {
          start,
          end: start + 5,
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
    return `${char}_${state}_${this.getAnimationDirection(direction)}`;
  }

  private getAnimationDirection(
    direction: Direction,
  ): "right" | "up" | "left" | "down" {
    const mapping: Record<string, "right" | "up" | "left" | "down"> = {
      right: "right",
      "up-right": "right",
      up: "up",
      "up-left": "up",
      left: "left",
      "down-left": "left",
      down: "down",
      "down-right": "down",
    };
    return mapping[direction] || "down";
  }
}
