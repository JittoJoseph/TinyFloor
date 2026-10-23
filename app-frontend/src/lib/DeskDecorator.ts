import * as Phaser from "phaser";
import { FLOOR } from "@shared/map";
import { placeOn } from "@shared/office";
import type { MapManager } from "./MapManager";
import { addThing, closeDecorate, decorateState, endCarry, moveThing, redo, removeThing, select, setAnchor, subscribeDecorate, undo } from "./decorate";
import { typingElsewhere } from "./typing";

/** How long the camera takes to bring the desk into view. */
const FOCUS_MS = 460;
/**
 * Your card while it holds the desk's things (YouCard): beside the floor at
 * the top right on a wide screen, over its top half on a phone. The desk is
 * brought into the middle of the floor the card leaves showing.
 */
const CARD_WIDE = 352 + 16;
const PHONE = 640;
const CARD_PHONE_SHARE = 0.5;
/** How far a thing lifts while it's held. */
const LIFT = 3;
const OUTLINE = 0xffffff;
const SHADE = 0x1c1c2a;
const DEPTH = 99980;

type Box = { x: number; y: number; w: number; h: number };

/**
 * The floor's half of decorating your desk (lib/decorate.ts). The camera
 * glides to the desk, without zooming, so it sits in the floor your card
 * leaves showing; the rest of the floor stays as it is. Things on the desk are
 * found by their own pixels: pointed at, outlined; pressed, picked and framed
 * (its bar follows it, PickedBar); dragged, they lift and slide along the
 * desk, kept to where they can stand and snapped to the art's pixels, and
 * settle where they're let go. A thing carried in from the card follows the
 * pointer and, over the desk, shows where it would stand. While something is
 * held or carried, a faint outline says where things can go. Keys: Delete
 * takes the picked thing away, Escape lets go (then closes), Ctrl+Z and
 * Ctrl+Y undo and redo.
 */
export class DeskDecorator {
  private zone: Phaser.GameObjects.Graphics;
  private outline: Phaser.GameObjects.Graphics;
  private frame: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image | null = null;
  private desk: string | null = null;
  private hovered: string | null = null;
  private dragging: { key: string; item: string; grab: [number, number]; from: [number, number]; at: [number, number]; moved: boolean } | null = null;
  private carried: [number, number] | null = null;
  private unsubscribe: () => void;
  private readonly keys = (event: KeyboardEvent) => this.key(event);
  private readonly carryMove = (event: PointerEvent) => this.carryTo(event);
  private readonly carryDrop = () => this.drop();

  constructor(
    private scene: Phaser.Scene,
    private map: MapManager,
    /** Hands the camera and your feet over to decorating (true) and back (false). */
    private hold: (decorating: boolean) => void,
  ) {
    this.zone = scene.add.graphics().setDepth(DEPTH);
    this.outline = scene.add.graphics().setDepth(DEPTH + 1);
    this.frame = scene.add.graphics().setDepth(DEPTH + 2);
    this.unsubscribe = subscribeDecorate(() => this.follow());
    scene.input.on("pointerdown", this.down, this);
    scene.input.on("pointermove", this.move, this);
    scene.input.on("pointerup", this.up, this);
    window.addEventListener("keydown", this.keys);
  }

  /** Whether the floor is being decorated: the rest of the floor keeps its hands off while it is. */
  active(): boolean {
    return this.desk !== null;
  }

  private follow() {
    const { desk, carrying } = decorateState();
    if (desk !== this.desk) {
      if (desk) this.enter(desk);
      else this.leave();
    }
    if (carrying && !this.ghost) this.pickUp(carrying);
    if (!carrying && this.ghost) this.putDown();
  }

  /** Where things can stand on the desk: along it, from the highest a thing may reach to its front edge. */
  private surface(desk: string): Box {
    const spec = FLOOR.desks[desk];
    const top = spec.ceiling ?? spec.feet[0] - 24;
    return { x: spec.along[0], y: top, w: spec.along[1] - spec.along[0], h: spec.feet[1] - top };
  }

  private enter(desk: string) {
    this.desk = desk;
    this.hold(true);
    const camera = this.scene.cameras.main;
    const spec = FLOOR.desks[desk];
    // The desk and its chair, in the middle of the floor the card leaves showing, at the zoom it's at.
    const x = (spec.along[0] + spec.along[1]) / 2;
    const y = (Math.min(spec.feet[0] - 40, spec.chair.y) + Math.max(spec.feet[1], spec.chair.y + 64)) / 2;
    const phone = window.innerWidth < PHONE;
    camera.stopFollow();
    camera.pan(
      x + (phone ? 0 : CARD_WIDE / 2 / camera.zoom),
      y - (phone ? (window.innerHeight * CARD_PHONE_SHARE) / 2 / camera.zoom : 0),
      FOCUS_MS,
      "Cubic.easeInOut",
      true,
    );
  }

  private leave() {
    this.desk = null;
    this.dragging = null;
    this.hovered = null;
    this.map.hold(null);
    this.zone.clear();
    this.outline.clear();
    this.frame.clear();
    this.putDown();
    this.scene.game.canvas.style.cursor = "";
    this.hold(false);
  }

  // ---------- things on the desk ----------

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

  /** A thing's pixels where it's drawn now: what an outline goes round. */
  private boxOf(key: string): Box | null {
    const image = this.map.getImage(key);
    if (!image) return null;
    const item = this.map.getPieces().find((piece) => piece.key === key)?.item;
    const art = item ? FLOOR.things[item]?.art : undefined;
    if (!art) return { x: image.x, y: image.y, w: image.width, h: image.height };
    return { x: image.x + art[0], y: image.y + art[1], w: art[2] - art[0], h: art[3] - art[1] };
  }

  private down(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return;
    const key = this.pieceAt(pointer.worldX, pointer.worldY);
    select(key);
    if (!key || this.isChair(key)) return;
    const image = this.map.getImage(key)!;
    const item = this.map.getPieces().find((piece) => piece.key === key)!.item;
    this.dragging = { key, item, grab: [pointer.worldX - image.x, pointer.worldY - image.y], from: [image.x, image.y], at: [image.x, image.y], moved: false };
  }

  private move(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return;
    const drag = this.dragging;
    if (!drag) {
      const key = this.pieceAt(pointer.worldX, pointer.worldY);
      this.hovered = key;
      this.scene.game.canvas.style.cursor = key ? (this.isChair(key) ? "pointer" : "grab") : "";
      return;
    }
    const image = this.map.getImage(drag.key);
    const art = FLOOR.things[drag.item]?.art;
    if (!image || !art) return;
    // Where the thing's pixels would stand with the hand where it is, kept to the desk.
    const x = pointer.worldX - drag.grab[0];
    const y = pointer.worldY - drag.grab[1];
    const at = placeOn(this.desk, drag.item, x + (art[0] + art[2]) / 2, y + art[3]);
    if (!at) return;
    if (!drag.moved) {
      if (Math.hypot(x - drag.from[0], y - drag.from[1]) < 3) return;
      drag.moved = true;
      this.map.hold(drag.key);
      this.scene.tweens.killTweensOf(image);
    }
    this.scene.game.canvas.style.cursor = "grabbing";
    drag.at = at;
    image.setPosition(at[0], at[1] - LIFT).setDepth(FLOOR.desks[this.desk].depth + (at[1] + art[3]) / 10000);
  }

  private up() {
    const drag = this.dragging;
    this.dragging = null;
    if (!drag || !this.desk || !drag.moved) return;
    this.map.hold(null);
    const image = this.map.getImage(drag.key);
    this.scene.game.canvas.style.cursor = "grab";
    // Set down: it settles onto the desk where it was let go.
    if (image) this.scene.tweens.add({ targets: image, y: drag.at[1], duration: 140, ease: "Back.easeOut" });
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
      if (decorateState().carrying) endCarry();
      else if (selected) select(null);
      else closeDecorate();
    }
  }

  // ---------- carried in from the card ----------

  private pickUp(item: string) {
    this.ghost = this.scene.add.image(-1000, -1000, this.map.itemsTexture(item), item).setOrigin(0, 0).setAlpha(0).setDepth(DEPTH + 3);
    window.addEventListener("pointermove", this.carryMove);
    window.addEventListener("pointerup", this.carryDrop);
  }

  private putDown() {
    window.removeEventListener("pointermove", this.carryMove);
    window.removeEventListener("pointerup", this.carryDrop);
    this.ghost?.destroy();
    this.ghost = null;
    this.carried = null;
  }

  /** A page point on the floor, if it's over the floor. */
  private worldAt(clientX: number, clientY: number): Phaser.Math.Vector2 | null {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const x = ((clientX - rect.left) / rect.width) * this.scene.scale.width;
    const y = ((clientY - rect.top) / rect.height) * this.scene.scale.height;
    return this.scene.cameras.main.getWorldPoint(x, y);
  }

  /** Over the desk, where it would stand; elsewhere on the floor, under the pointer, faint. */
  private carryTo(event: PointerEvent) {
    const ghost = this.ghost;
    const item = decorateState().carrying;
    const art = item ? FLOOR.things[item]?.art : undefined;
    if (!ghost || !item || !art || !this.desk) return;
    // Over the card, it isn't on the floor yet.
    const overFloor = (event.target as Element | null)?.closest?.("canvas") === this.scene.game.canvas;
    const point = overFloor ? this.worldAt(event.clientX, event.clientY) : null;
    const { x, y, w, h } = this.surface(this.desk);
    const near = !!point && point.x >= x - 24 && point.x <= x + w + 24 && point.y >= y - 40 && point.y <= y + h + 40;
    this.carried = near && point ? placeOn(this.desk, item, point.x, point.y + (art[3] - art[1]) / 2) : null;
    if (this.carried) {
      ghost.setPosition(this.carried[0], this.carried[1] - LIFT).setAlpha(0.95);
    } else if (point) {
      ghost.setPosition(point.x - (art[0] + art[2]) / 2, point.y - (art[1] + art[3]) / 2).setAlpha(0.5);
    } else {
      ghost.setAlpha(0);
    }
  }

  private drop() {
    const item = decorateState().carrying;
    const at = this.carried;
    endCarry();
    if (item && at) addThing(item, at);
  }

  /** A floor point on the page. */
  private toPage(x: number, y: number) {
    const camera = this.scene.cameras.main;
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const scale = canvas.width / this.scene.scale.width;
    return { x: canvas.left + (x - camera.worldView.x) * camera.zoom * scale, y: canvas.top + (y - camera.worldView.y) * camera.zoom * scale };
  }

  /** Outlines what's pointed at, frames what's picked, says where its bar goes, and shows the desk's top while something's in hand. */
  update() {
    if (!this.desk) return;
    this.zone.clear();
    this.outline.clear();
    this.frame.clear();
    const line = 1 / this.scene.cameras.main.zoom;
    if (this.dragging?.moved || decorateState().carrying) {
      const { x, y, w, h } = this.surface(this.desk);
      this.zone.fillStyle(OUTLINE, 0.06).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
      this.zone.lineStyle(1.5 * line, OUTLINE, 0.55).strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
    }
    const { selected } = decorateState();
    if (this.hovered && this.hovered !== selected && !this.dragging) {
      const box = this.boxOf(this.hovered);
      if (box) this.outline.lineStyle(1.5 * line, OUTLINE, 0.7).strokeRoundedRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 3);
    }
    const box = selected ? this.boxOf(selected) : null;
    if (!box) {
      setAnchor(null);
      return;
    }
    this.frame.lineStyle(4 * line, SHADE, 0.55).strokeRoundedRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6, 4);
    this.frame.lineStyle(2 * line, OUTLINE, 1).strokeRoundedRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6, 4);
    setAnchor(this.dragging?.moved ? null : this.toPage(box.x + box.w / 2, box.y - 3));
  }

  destroy() {
    this.unsubscribe();
    this.putDown();
    window.removeEventListener("keydown", this.keys);
    this.scene.input.off("pointerdown", this.down, this);
    this.scene.input.off("pointermove", this.move, this);
    this.scene.input.off("pointerup", this.up, this);
    this.zone.destroy();
    this.outline.destroy();
    this.frame.destroy();
    if (this.desk) this.leave();
  }
}
