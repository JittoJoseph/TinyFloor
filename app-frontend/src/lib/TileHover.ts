import * as Phaser from "phaser";
import type { NavGrid } from "./Navigation";
import { pixelToTile, TILE_SIZE, tileToPixel } from "web-shared/lib/types";
import { FLOOR } from "shared-protocol/map";

/** Ink, not a colour: it darkens the pale floors indoors and the paving. */
const INK = 0x0b1a2b;
const INK_ALPHA = 0.38;
/** On grass, dark ink disappears into the green: there it's a soft light instead. */
const LIGHT = 0xffffff;
const LIGHT_ALPHA = 0.55;
/** Over rugs (1.5), under furniture and people, whose depth is their y. */
const DEPTH = 2;
/** How quickly it closes on the tile under the pointer, per second: high enough to keep up, low enough to glide. */
const FOLLOW = 28;
/** How quickly it shows and goes. */
const FADE_IN = 22;
const FADE_OUT = 14;
/** Further than this and it moves there at once rather than sliding across the room. */
const JUMP = TILE_SIZE * 3;

/**
 * The tile under the mouse, marked with four soft corner brackets where a
 * click would walk you: the floor says it can be clicked, as a chair's outline
 * says it can be sat on. Only for a mouse (a finger has no hover), only on
 * tiles you can stand on, never over something with its own answer to the
 * pointer (a chair, a person). It follows the pointer every frame, easing
 * toward the tile under it, so it keeps up with a fast mouse and with the
 * camera moving under a still one.
 */
export class TileHover {
  private readonly mark: Phaser.GameObjects.Graphics;
  /** The pointer is over the floor's canvas. */
  private inside = false;
  private target: { x: number; y: number } | null = null;
  /** Drawn light for grass, dark for everything else. */
  private light = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly nav: NavGrid,
    private readonly enabled: () => boolean,
  ) {
    this.mark = scene.add.graphics().setDepth(DEPTH).setAlpha(0);
    drawCorners(this.mark, false);
    scene.input.on(Phaser.Input.Events.GAME_OVER, this.enter, this);
    // Already over the floor when it loads, the canvas never says it was entered: moving says it.
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.enter, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.leave, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  private enter() {
    this.inside = true;
  }

  private leave() {
    this.inside = false;
  }

  /** Hides it at once, for when the floor stops taking clicks. */
  hide() {
    this.target = null;
  }

  private update(_time: number, delta: number) {
    const next = this.tileUnderPointer();
    const mark = this.mark;
    const dt = Math.min(delta, 50) / 1000;

    if (next) {
      // Appearing, or far from where it was: there at once, growing in, rather than sliding over.
      if (mark.alpha < 0.05 || Phaser.Math.Distance.Between(mark.x, mark.y, next.x, next.y) > JUMP) {
        mark.setPosition(next.x, next.y);
        if (mark.alpha < 0.05) mark.setScale(0.86);
      }
      this.target = next;
      if (next.grass !== this.light) {
        this.light = next.grass;
        drawCorners(mark, next.grass);
      }
    } else {
      this.target = null;
    }

    if (this.target) {
      const follow = 1 - Math.exp(-FOLLOW * dt);
      mark.x += (this.target.x - mark.x) * follow;
      mark.y += (this.target.y - mark.y) * follow;
      mark.alpha += (1 - mark.alpha) * (1 - Math.exp(-FADE_IN * dt));
      mark.scale += (1 - mark.scale) * (1 - Math.exp(-FADE_IN * dt));
    } else if (mark.alpha > 0) {
      const fade = 1 - Math.exp(-FADE_OUT * dt);
      mark.alpha = mark.alpha < 0.01 ? 0 : mark.alpha - mark.alpha * fade;
      mark.scale += (0.92 - mark.scale) * fade;
    }
  }

  /** The centre of the walkable tile under the mouse, and whether it's grass; null when nothing should show. */
  private tileUnderPointer(): { x: number; y: number; grass: boolean } | null {
    const input = this.scene.input;
    const pointer = input.activePointer;
    if (!this.inside || !this.enabled() || pointer.wasTouch || pointer.isDown) return null;
    // Something on the floor answers the pointer itself (a chair's outline, a person): it has the say.
    if (input.hitTestPointer(pointer).length) return null;
    // Worked out from the camera every frame, so a camera following you keeps it on the right tile.
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const { tileX, tileY } = pixelToTile(world.x, world.y);
    if (!this.nav.isWalkable(tileX, tileY)) return null;
    return { ...tileToPixel(tileX, tileY), grass: isGrass(tileX, tileY) };
  }

  destroy() {
    this.scene.input.off(Phaser.Input.Events.GAME_OVER, this.enter, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.enter, this);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.leave, this);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.mark.destroy();
  }
}

/** Whether the floor's own map says this tile is grass. */
export function isGrass(tileX: number, tileY: number): boolean {
  const char = FLOOR.shell.rows[tileY]?.[tileX];
  return !!char && FLOOR.shell.legend[char]?.material === "grass";
}

/** Four short brackets just inside the tile's corners, drawn around (0, 0), the tile's centre, so it grows from the middle. */
export function drawCorners(g: Phaser.GameObjects.Graphics, light: boolean) {
  const inset = 3;
  const arm = 6;
  const e = TILE_SIZE / 2 - inset;
  g.clear();
  g.lineStyle(2, light ? LIGHT : INK, light ? LIGHT_ALPHA : INK_ALPHA);
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    g.beginPath();
    g.moveTo(sx * e, sy * (e - arm));
    g.lineTo(sx * e, sy * e);
    g.lineTo(sx * (e - arm), sy * e);
    g.strokePath();
  }
}
