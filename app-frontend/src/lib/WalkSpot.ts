import * as Phaser from "phaser";
import type { NavGrid } from "./Navigation";
import { pixelToTile, TILE_SIZE, tileToPixel } from "web-shared/lib/types";
import { cssZoom, toCss } from "./plates";
import { drawCorners, isGrass } from "./TileHover";

/** Where to look for a spot, in tiles from you: beside you first, then a little further, never under you. */
const AROUND: Array<[number, number]> = [
  [3, 1],
  [-3, 1],
  [3, -1],
  [-3, -1],
  [2, 3],
  [-2, 3],
  [4, 0],
  [-4, 0],
  [0, 3],
  [0, -3],
];
/** Over rugs, under furniture and people, as the pointer's own tile mark (TileHover). */
const DEPTH = 2;
/** Further than this from you (in tiles), say after the dock walked you to a desk, and it's somewhere else's spot: a new one is found. */
const LEFT_BEHIND = 6;

/**
 * A tile to walk to, marked on the floor the way the floor marks where a
 * click would take you (TileHover's corner brackets), for settling in to
 * point at when walking is the next thing to try (SettleIn): somewhere a few
 * steps from you, in view, that you can stand on. The page puts its pointer
 * over it (where), the floor draws the mark under people, at its own depth.
 */
export class WalkSpot {
  private mark: Phaser.GameObjects.Graphics | null = null;
  private tile: { x: number; y: number } | null = null;
  /** Asked to show: when no tile could be found (the view too small, you somewhere tight), it keeps looking now and then. */
  private wanted = false;
  private triedAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly nav: () => NavGrid,
    private readonly you: () => { x: number; y: number } | null,
    /** Whether something on the floor stands over this point (a chair: you can stand there, but its mark wouldn't show). */
    private readonly covered: (x: number, y: number) => boolean = () => false,
  ) {}

  show(on: boolean) {
    this.wanted = on;
    if (!on) return this.hide();
    if (this.mark) return;
    this.triedAt = performance.now();
    const tile = this.pick();
    if (!tile) return;
    this.tile = tile;
    const at = tileToPixel(tile.x, tile.y);
    const mark = this.scene.add.graphics().setDepth(DEPTH).setPosition(at.x, at.y).setAlpha(0).setScale(0.86);
    drawCorners(mark, isGrass(tile.x, tile.y));
    this.scene.tweens.add({ targets: mark, alpha: 1, scale: 1, duration: 260, ease: "Back.easeOut" });
    this.mark = mark;
  }

  private hide() {
    const mark = this.mark;
    this.mark = null;
    this.tile = null;
    if (!mark) return;
    this.scene.tweens.add({ targets: mark, alpha: 0, scale: 0.9, duration: 180, onComplete: () => mark.destroy() });
  }

  /** A walkable tile a few steps from you, in view and clear of the dock along the bottom. */
  private pick(): { x: number; y: number } | null {
    const me = this.you();
    if (!me) return null;
    const here = pixelToTile(me.x, me.y);
    const view = this.scene.cameras.main.worldView;
    const nav = this.nav();
    const margin = TILE_SIZE * 1.5;
    // Toward the middle of the view first: the pointer's words go on the far side from you, and there's room for them there.
    const toward = me.x < view.centerX ? 1 : -1;
    const order = [...AROUND].sort((a, b) => Math.sign(b[0]) * toward - Math.sign(a[0]) * toward);
    for (const [dx, dy] of order) {
      const x = here.tileX + dx;
      const y = here.tileY + dy;
      if (!nav.isWalkable(x, y)) continue;
      const at = tileToPixel(x, y);
      if (this.covered(at.x, at.y)) continue;
      if (at.x < view.x + margin || at.x > view.right - margin || at.y < view.y + margin || at.y > view.bottom - margin * 2) continue;
      return { x, y };
    }
    return null;
  }

  /** Where it is in the window (CSS pixels), how big a tile is there, and which side of it you are: for the page's pointer. */
  where(): { x: number; y: number; size: number; youLeft: boolean } | null {
    // None found yet: another look every half second or so, as you move and the view changes.
    if (!this.tile && this.wanted && performance.now() - this.triedAt > 500) this.show(true);
    if (!this.tile) return null;
    if (this.leftBehind()) {
      this.hide();
      this.show(true);
      if (!this.tile) return null;
    }
    const at = tileToPixel(this.tile.x, this.tile.y);
    const css = toCss(this.scene, at.x, at.y);
    const rect = this.scene.game.canvas.getBoundingClientRect();
    const me = this.you();
    return { x: rect.left + css.x, y: rect.top + css.y, size: TILE_SIZE * cssZoom(this.scene), youLeft: !!me && me.x < at.x };
  }

  /** You've walked (or been walked) well away from it, or it's gone out of view. */
  private leftBehind(): boolean {
    const me = this.you();
    if (!me || !this.tile) return false;
    const here = pixelToTile(me.x, me.y);
    if (Math.max(Math.abs(here.tileX - this.tile.x), Math.abs(here.tileY - this.tile.y)) > LEFT_BEHIND) return true;
    const at = tileToPixel(this.tile.x, this.tile.y);
    const view = this.scene.cameras.main.worldView;
    return at.x < view.x || at.x > view.right || at.y < view.y || at.y > view.bottom;
  }

  destroy() {
    this.mark?.destroy();
    this.mark = null;
  }
}
