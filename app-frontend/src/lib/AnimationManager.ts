import * as Phaser from "phaser";
import { characterOrDefault } from "@shared/character";
import { FRAME_H, FRAME_W, SEATED_BREATH, SHEET_FRAMES, characterSheet, drawnSheet, frameOf } from "@/lib/characterSheet";

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

const DIRECTION_ORDER: CardinalDirection[] = ["right", "up", "left", "down"];
const FRAME_RATE = 10;
/** What a sprite shows while its character's sheet is still being drawn: nothing. */
const BLANK = "character:blank";

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

/** What a sprite is doing, kept on it so it carries on when its character changes or finishes drawing. */
type Pose = { state: AnimationState; direction: CardinalDirection } | { sit: CardinalDirection };

/**
 * Characters on the floor. Every character's sheet comes from the one place
 * every character is drawn (lib/characterSheet), as a texture of its own at
 * the art's size, with its walking and standing animations; sprites wear one,
 * and are told what to do (play, sit), which they keep doing through a change
 * of character. A sheet takes a moment the first time anyone wears it; until
 * then the sprite shows nothing.
 */
export class AnimationManager {
  constructor(private scene: Phaser.Scene) {}

  /** Your own character starts drawing with the floor, so you arrive as yourself. */
  preload(own?: string) {
    void characterSheet(characterOrDefault(own)).catch(() => {});
  }

  create() {
    if (!this.scene.textures.exists(BLANK)) this.scene.textures.addCanvas(BLANK, Object.assign(document.createElement("canvas"), { width: FRAME_W, height: FRAME_H }));
  }

  /** A new sprite for a character, standing at its feet. */
  sprite(x: number, y: number, character: string): Phaser.GameObjects.Sprite {
    const sprite = this.scene.add.sprite(x, y, BLANK).setOrigin(0.5, 1);
    this.wear(sprite, character);
    return sprite;
  }

  /** Puts a character on a sprite, drawing its sheet if nobody's worn it yet: it carries on as it was. */
  wear(sprite: Phaser.GameObjects.Sprite, character: string) {
    const wearing = characterOrDefault(character);
    sprite.setData("wearing", wearing);
    const key = this.textureFor(wearing);
    if (key) return this.dress(sprite, key);
    characterSheet(wearing)
      .then(() => {
        const ready = this.textureFor(wearing);
        if (ready && sprite.active && sprite.getData("wearing") === wearing) this.dress(sprite, ready);
      })
      .catch(() => {});
  }

  /** Standing or walking, facing a way. */
  play(sprite: Phaser.GameObjects.Sprite, state: AnimationState, direction: Direction) {
    const pose: Pose = { state, direction: toCardinal(direction) };
    sprite.setData("pose", pose);
    this.show(sprite, pose);
  }

  /** Seated, facing a way. */
  sit(sprite: Phaser.GameObjects.Sprite, direction: CardinalDirection) {
    const pose: Pose = { sit: direction };
    sprite.setData("pose", pose);
    this.show(sprite, pose);
  }

  /** The texture for a character, made from its sheet once it's drawn. */
  private textureFor(character: string): string | null {
    const key = `character:${character}`;
    if (this.scene.textures.exists(key)) return key;
    const sheet = drawnSheet(character);
    if (!sheet) return null;
    const texture = this.scene.textures.addCanvas(key, sheet);
    if (!texture) return null;
    for (let n = 0; n < SHEET_FRAMES; n++) texture.add(n, 0, n * FRAME_W, 0, FRAME_W, FRAME_H);
    // Nearest keeps the art's pixels crisp. The map stays smooth: at a zoom that is not a whole
    // number, nearest makes every thin line on the floor flicker between two and three pixels thick.
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    DIRECTION_ORDER.forEach((direction) => {
      for (const state of ["idle", "run"] as const) {
        const start = frameOf(state === "run" ? "walk" : "idle", direction);
        this.scene.anims.create({
          key: `${key}_${state}_${direction}`,
          frames: this.scene.anims.generateFrameNumbers(key, { start, end: start + 5 }),
          frameRate: FRAME_RATE,
          repeat: -1,
        });
      }
      // Seated, a breath at rest (lib/characterSheet): each frame held as long as it's meant to show.
      this.scene.anims.create({
        key: `${key}_sit_${direction}`,
        frames: SEATED_BREATH.map(([step, ms]) => ({ key, frame: frameOf("sit", direction, step), duration: ms })),
        frameRate: 1000,
        repeat: -1,
      });
    });
    return key;
  }

  private dress(sprite: Phaser.GameObjects.Sprite, key: string) {
    if (sprite.texture.key === key) return;
    sprite.setTexture(key, 0);
    this.show(sprite, sprite.getData("pose") as Pose | undefined);
  }

  private show(sprite: Phaser.GameObjects.Sprite, pose: Pose | undefined) {
    const key = sprite.texture.key;
    if (key === BLANK || !pose) return;
    if ("sit" in pose) {
      // Each from wherever in the loop it happens to be, so a row of desks doesn't breathe as one.
      const anim = `${key}_sit_${pose.sit}`;
      if (sprite.anims.currentAnim?.key !== anim) sprite.play({ key: anim, startFrame: Math.floor(Math.random() * SEATED_BREATH.length) });
    } else {
      sprite.play(`${key}_${pose.state}_${pose.direction}`, true);
    }
  }
}
