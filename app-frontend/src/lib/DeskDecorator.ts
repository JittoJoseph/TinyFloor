import * as Phaser from "phaser";
import { FLOOR } from "@shared/map";
import { fitsOn } from "@shared/office";
import type { MapManager } from "./MapManager";
import { closeDecorate, decorateState, moveThing, redo, removeThing, select, setAnchor, subscribeDecorate, undo } from "./decorate";
import { typingElsewhere } from "./typing";

/** How long the camera takes to come in to the desk and go back. */
const ZOOM_MS = 420;
/** The desk fills about this much of the floor's width, as far in as the art stays crisp. */
const DESK_SHARE = 0.55;
const ZOOM_MAX = 3;
/** The panel beside the floor on a wide screen, and the sheet under it on a phone (DecoratePanel): the desk is centred in what's left. */
const PANEL_WIDTH = 344;
const WIDE = 768;
const SHEET_SHARE = 0.46;
const OUTLINE = 0xffffff;
const SHADE = 0x1c1c2a;
const BLOCKED = 0xff6b6b;

/** Pixels the art is drawn in: two of ours. */
const snap = (value: number) => Math.round(value / 2) * 2;

/**
 * The floor's half of decorating your desk (lib/decorate.ts): the camera
 * comes in to the desk and outlines where things can go; things on it are
 * picked by their own pixels and dragged along it, snapped to the art and
 * kept to the desk, showing red where they can't go; the picked one is
 * framed, and its buttons (DecoratePanel) follow it. Keys: Delete takes it
 * away, Escape lets go (then closes), Ctrl+Z and Ctrl+Y undo and redo.
 */
export class DeskDecorator {
  private outline: Phaser.GameObjects.Graphics;
  private frame: Phaser.GameObjects.Graphics;
  private desk: string | null = null;
  private dragging: { key: string; dx: number; dy: number; from: [number, number]; at: [number, number]; moved: boolean } | null = null;
  private unsubscribe: () => void;
  private readonly keys: (event: KeyboardEvent) => void;

  constructor(
    private scene: Phaser.Scene,
    private map: MapManager,
    /** Hands the camera and your feet over to decorating (true) and back (false). */
    private hold: (decorating: boolean) => void,
  ) {
    this.outline = scene.add.graphics().setDepth(99990);
    this.frame = scene.add.graphics().setDepth(99991);
    this.unsubscribe = subscribeDecorate(() => this.follow());
    scene.input.on("pointerdown", this.down, this);
    scene.input.on("pointermove", this.move, this);
    scene.input.on("pointerup", this.up, this);
    this.keys = (event) => this.key(event);
    window.addEventListener("keydown", this.keys);
  }

  /** Whether the floor is being decorated: the rest of the floor keeps its hands off while it is. */
  active(): boolean {
    return this.desk !== null;
  }

  private follow() {
    const { desk } = decorateState();
    if (desk === this.desk) return;
    if (desk) this.enter(desk);
    else this.leave();
  }

  /** The desk's area: along its length, from its top to its front. */
  private area(desk: string): Phaser.Geom.Rectangle {
    const spec = FLOOR.desks[desk];
    const top = spec.side === "front" ? spec.feet[1] - 64 : spec.feet[1] - 32;
    return new Phaser.Geom.Rectangle(spec.along[0], top, spec.along[1] - spec.along[0], spec.feet[1] - top);
  }

  private enter(desk: string) {
    this.desk = desk;
    this.hold(true);
    const camera = this.scene.cameras.main;
    const area = this.area(desk);
    const zoom = Phaser.Math.Clamp((camera.width * DESK_SHARE) / area.width, camera.zoom, ZOOM_MAX);
    // Centred in the floor the panel leaves showing: beside it on a wide screen, above it on a phone.
    const wide = camera.width >= WIDE;
    const x = area.centerX + (wide ? PANEL_WIDTH / 2 / zoom : 0);
    const y = area.centerY + (wide ? 0 : (camera.height * SHEET_SHARE) / 2 / zoom);
    camera.stopFollow();
    camera.pan(x, y, ZOOM_MS, "Sine.easeInOut", true);
    camera.zoomTo(zoom, ZOOM_MS, "Sine.easeInOut", true);
    this.outline.clear();
    this.outline.fillStyle(OUTLINE, 0.08).fillRoundedRect(area.x - 6, area.y - 6, area.width + 12, area.height + 12, 6);
    this.outline.lineStyle(1, OUTLINE, 0.9).strokeRoundedRect(area.x - 6, area.y - 6, area.width + 12, area.height + 12, 6);
  }

  private leave() {
    this.desk = null;
    this.dragging = null;
    this.outline.clear();
    this.frame.clear();
    this.scene.game.canvas.style.cursor = "";
    this.hold(false);
  }

  /** The desk's piece under a point, by its own pixels, the one in front first. */
  private pieceAt(x: number, y: number): string | null {
    const pieces = this.map.getPieces();
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i];
      if (piece.desk !== this.desk) continue;
      const image = this.map.getImage(piece.key);
      if (!image || !image.getBounds().contains(x, y)) continue;
      const alpha = this.scene.textures.getPixelAlpha(Math.floor(x - image.x), Math.floor(y - image.y), image.texture.key, image.frame.name);
      if (alpha > 0) return piece.key;
    }
    return null;
  }

  private isChair = (key: string) => !!this.desk && FLOOR.desks[this.desk].chair.key === key;

  private down(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return;
    const key = this.pieceAt(pointer.worldX, pointer.worldY);
    select(key);
    if (!key || this.isChair(key)) return;
    const image = this.map.getImage(key)!;
    this.dragging = { key, dx: pointer.worldX - image.x, dy: pointer.worldY - image.y, from: [image.x, image.y], at: [image.x, image.y], moved: false };
  }

  private move(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return;
    if (!this.dragging) {
      this.scene.game.canvas.style.cursor = this.pieceAt(pointer.worldX, pointer.worldY) ? "pointer" : "";
      return;
    }
    const drag = this.dragging;
    const piece = this.map.getPieces().find((one) => one.key === drag.key);
    const image = this.map.getImage(drag.key);
    if (!piece || !image) return;
    const spec = FLOOR.desks[this.desk];
    const [w, h] = FLOOR.things[piece.item]?.size ?? [image.width, image.height];
    // Kept to the desk: along its length, its foot in the desk's band.
    const x = Phaser.Math.Clamp(snap(pointer.worldX - drag.dx), spec.along[0], spec.along[1] - w);
    const y = Phaser.Math.Clamp(snap(pointer.worldY - drag.dy), spec.feet[0] - h, spec.feet[1] - h);
    if (x === drag.at[0] && y === drag.at[1]) return;
    drag.at = [x, y];
    drag.moved = true;
    this.scene.game.canvas.style.cursor = "grabbing";
    image.setPosition(x, y).setDepth(spec.depth + (y + h) / 10000);
    if (fitsOn(this.desk, piece.item, drag.at)) image.clearTint();
    else image.setTint(BLOCKED);
  }

  private up() {
    const drag = this.dragging;
    this.dragging = null;
    if (!drag || !this.desk) return;
    const image = this.map.getImage(drag.key);
    image?.clearTint();
    this.scene.game.canvas.style.cursor = "";
    if (!drag.moved) return;
    // Dropped where it can't stand (over the chair, say): back where it was.
    if (!moveThing(drag.key, drag.at)) this.map.refresh();
  }

  private key(event: KeyboardEvent) {
    if (!this.desk || typingElsewhere()) return;
    const { selected } = decorateState();
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    } else if ((event.key === "Delete" || event.key === "Backspace") && selected && !this.isChair(selected)) {
      event.preventDefault();
      removeThing(selected);
    } else if (event.key === "Escape") {
      if (selected) select(null);
      else closeDecorate();
    }
  }

  /** Frames the picked piece, and says where its buttons go on the page. */
  update() {
    this.frame.clear();
    const { selected } = decorateState();
    const image = this.desk && selected ? this.map.getImage(selected) : undefined;
    if (!image) {
      setAnchor(null);
      return;
    }
    const bounds = image.getBounds();
    const camera = this.scene.cameras.main;
    const line = 1 / camera.zoom;
    this.frame.lineStyle(4 * line, SHADE, 0.6).strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 3);
    this.frame.lineStyle(2 * line, OUTLINE, 1).strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 3);
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const scale = canvas.width / this.scene.scale.width;
    setAnchor({
      x: canvas.left + (bounds.centerX - camera.worldView.x) * camera.zoom * scale,
      y: canvas.top + (bounds.y - 3 - camera.worldView.y) * camera.zoom * scale,
    });
  }

  destroy() {
    this.unsubscribe();
    window.removeEventListener("keydown", this.keys);
    this.scene.input.off("pointerdown", this.down, this);
    this.scene.input.off("pointermove", this.move, this);
    this.scene.input.off("pointerup", this.up, this);
    this.outline.destroy();
    this.frame.destroy();
    if (this.desk) this.leave();
  }
}
