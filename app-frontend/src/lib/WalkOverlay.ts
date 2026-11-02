import * as Phaser from "phaser";
import { MAP_HEIGHT_TILES, MAP_WIDTH_TILES } from "@shared/map";
import { TILE_SIZE } from "@/lib/types";
import type { NavGrid, Rect } from "./Navigation";

const DEPTH = 1e6;

/**
 * A look at where you can walk, for working on the floor: every tile a click
 * can walk you to green and every other red, what's solid outlined (what keys
 * walk you into, a point at your feet against these), and that point. Shown
 * with ` (backquote) in development, or anywhere with ?walk in the address.
 */
export class WalkOverlay {
  private tiles: Phaser.GameObjects.Graphics;
  private feet: Phaser.GameObjects.Graphics;
  private shown = false;
  private drawnAt = 0;

  constructor(
    private scene: Phaser.Scene,
    private nav: () => NavGrid,
    private solids: () => readonly Rect[],
    private player: Phaser.GameObjects.Components.Transform,
  ) {
    this.tiles = scene.add.graphics().setDepth(DEPTH).setVisible(false);
    this.feet = scene.add.graphics().setDepth(DEPTH + 1).setVisible(false);
    if (!WalkOverlay.allowed()) return;
    scene.input.keyboard?.on("keydown-BACKTICK", this.toggle, this);
    if (new URLSearchParams(window.location.search).has("walk")) this.toggle();
  }

  static allowed(): boolean {
    return process.env.NODE_ENV !== "production" || new URLSearchParams(window.location.search).has("walk");
  }

  toggle() {
    this.shown = !this.shown;
    this.tiles.setVisible(this.shown);
    this.feet.setVisible(this.shown);
    if (this.shown) this.draw();
  }

  private draw() {
    const g = this.tiles.clear();
    const nav = this.nav();
    for (let ty = 0; ty < MAP_HEIGHT_TILES; ty++) {
      for (let tx = 0; tx < MAP_WIDTH_TILES; tx++) {
        g.fillStyle(nav.isWalkable(tx, ty) ? 0x2ecc71 : 0xe74c3c, 0.22);
        g.fillRect(tx * TILE_SIZE + 1, ty * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    }
    g.lineStyle(1, 0xf1c40f, 0.9);
    for (const r of this.solids()) g.strokeRect(r.x, r.y, r.width, r.height);
    this.drawnAt = this.scene.time.now;
  }

  update() {
    if (!this.shown) return;
    // What's solid changes when a piece does; looking again now and then keeps up without being told.
    if (this.scene.time.now - this.drawnAt > 1000) this.draw();
    this.feet.clear().fillStyle(0x3498db, 1).fillCircle(this.player.x, this.player.y, 3);
  }

  destroy() {
    this.scene.input.keyboard?.off("keydown-BACKTICK", this.toggle, this);
    this.tiles.destroy();
    this.feet.destroy();
  }
}
