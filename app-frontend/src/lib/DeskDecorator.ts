import * as Phaser from "phaser";
import { FLOOR } from "@shared/map";
import { placeOn } from "@shared/office";
import type { MapManager } from "./MapManager";
import {
  addThing,
  closeDecorate,
  decorateState,
  endCarry,
  moveThing,
  myDesk,
  redo,
  removeThing,
  select,
  setAnchor,
  setDeskHint,
  subscribeDecorate,
  undo,
} from "./decorate";
import { typingElsewhere } from "./typing";

/** How long the camera takes to bring the desk into view, and the floor to dim. */
const FOCUS_MS = 460;
/** How dark the rest of the floor goes while a desk is decorated. */
const DIM = 0.5;
const DIM_COLOUR = 0x0b0b12;
/** How far the lit window's edge fades over, in the floor's pixels, and in how many steps. */
const FEATHER = 14;
const FEATHER_STEPS = 7;
/** The tray over the bottom of the floor (DecoratePanel): the desk is brought into the middle of what's left above it. */
const TRAY = 236;
/** How far a thing lifts while it's held. */
const LIFT = 3;
const OUTLINE = 0xffffff;
const SHADE = 0x1c1c2a;
const DEPTH = 99980;

type Box = { x: number; y: number; w: number; h: number };

/**
 * The floor's half of decorating your desk (lib/decorate.ts).
 *
 * Not decorating, the pointer over your own desk outlines it and puts its
 * Decorate chip over it (DecoratePanel): one way in, there when you look for
 * it and never in the way. Decorating, the camera glides to the desk, without
 * zooming, and the rest of the floor dims around it. Things on it are found
 * by their own pixels: pointed at, outlined; pressed, picked and framed (its
 * buttons follow it); dragged, they lift and slide along the desk, kept to
 * its top and snapped to the art's pixels, and settle where they're let go.
 * A thing carried in from the tray follows the pointer and, over the desk,
 * shows where it would stand. Keys: Delete takes the picked thing away,
 * Escape lets go (then closes), Ctrl+Z and Ctrl+Y undo and redo.
 */
export class DeskDecorator {
  private shade: Phaser.GameObjects.Graphics;
  private outline: Phaser.GameObjects.Graphics;
  private frame: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image | null = null;
  private desk: string | null = null;
  private spot: Box | null = null;
  private dim = { value: 0 };
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
    this.shade = scene.add.graphics().setDepth(DEPTH);
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

  /** The desk and its chair, with room around them: what stays lit, and what's brought into view. */
  private areaOf(desk: string): Box {
    const spec = FLOOR.desks[desk];
    const top = Math.min(spec.feet[0] - 52, spec.chair.y - 6);
    const bottom = Math.max(spec.feet[1] + 18, spec.chair.y + 70);
    return { x: spec.along[0] - 20, y: top, w: spec.along[1] - spec.along[0] + 40, h: bottom - top };
  }

  private enter(desk: string) {
    this.desk = desk;
    this.spot = this.areaOf(desk);
    this.clearHint();
    this.hold(true);
    const camera = this.scene.cameras.main;
    const { x, y, w, h } = this.spot;
    // Into the middle of the floor the tray leaves showing, at the zoom it's at.
    camera.stopFollow();
    camera.pan(x + w / 2, y + h / 2 + TRAY / 2 / camera.zoom, FOCUS_MS, "Cubic.easeInOut", true);
    this.scene.tweens.killTweensOf(this.dim);
    this.scene.tweens.add({ targets: this.dim, value: DIM, duration: FOCUS_MS, ease: "Cubic.easeOut", onUpdate: () => this.paintShade() });
  }

  private leave() {
    this.desk = null;
    this.dragging = null;
    this.hovered = null;
    this.map.hold(null);
    this.outline.clear();
    this.frame.clear();
    this.putDown();
    this.scene.game.canvas.style.cursor = "";
    this.hold(false);
    this.scene.tweens.killTweensOf(this.dim);
    this.scene.tweens.add({
      targets: this.dim,
      value: 0,
      duration: FOCUS_MS * 0.7,
      ease: "Cubic.easeIn",
      onUpdate: () => this.paintShade(),
      onComplete: () => {
        this.spot = null;
        this.shade.clear();
      },
    });
  }

  /**
   * The floor dimmed all round the desk: panels about a lit window, so nothing
   * on the desk is covered, laid a few times over, each a little further out,
   * so the window's edge fades rather than cuts.
   */
  private paintShade() {
    this.shade.clear();
    if (!this.spot || this.dim.value <= 0) return;
    const far = 100000;
    // Each layer's share, so all of them together come to the dim wanted.
    const alpha = 1 - Math.pow(1 - this.dim.value, 1 / FEATHER_STEPS);
    this.shade.fillStyle(DIM_COLOUR, alpha);
    for (let step = 0; step < FEATHER_STEPS; step++) {
      const out = (FEATHER * step) / FEATHER_STEPS;
      const x = this.spot.x - out;
      const y = this.spot.y - out;
      const w = this.spot.w + out * 2;
      const h = this.spot.h + out * 2;
      this.shade.fillRect(-far, -far, far * 2, far + y);
      this.shade.fillRect(-far, y + h, far * 2, far);
      this.shade.fillRect(-far, y, far + x, h);
      this.shade.fillRect(x + w, y, far, h);
    }
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
    if (!this.desk) {
      // Your desk's chip is over the desk; a press elsewhere puts it away.
      if (!this.overMyDesk(pointer.worldX, pointer.worldY)) this.clearHint();
      return;
    }
    const key = this.pieceAt(pointer.worldX, pointer.worldY);
    select(key);
    if (!key || this.isChair(key)) return;
    const image = this.map.getImage(key)!;
    const item = this.map.getPieces().find((piece) => piece.key === key)!.item;
    this.dragging = { key, item, grab: [pointer.worldX - image.x, pointer.worldY - image.y], from: [image.x, image.y], at: [image.x, image.y], moved: false };
  }

  private move(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return this.hintAt(pointer.worldX, pointer.worldY);
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

  // ---------- carried in from the tray ----------

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

  /** A page point on the floor. */
  private worldAt(clientX: number, clientY: number): Phaser.Math.Vector2 | null {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const x = ((clientX - rect.left) / rect.width) * this.scene.scale.width;
    const y = ((clientY - rect.top) / rect.height) * this.scene.scale.height;
    return this.scene.cameras.main.getWorldPoint(x, y);
  }

  /** Over the desk, where it would stand; elsewhere, under the pointer, faint. */
  private carryTo(event: PointerEvent) {
    const ghost = this.ghost;
    const item = decorateState().carrying;
    const art = item ? FLOOR.things[item]?.art : undefined;
    if (!ghost || !item || !art || !this.desk || !this.spot) return;
    const point = this.worldAt(event.clientX, event.clientY);
    const { x, y, w, h } = this.spot;
    const over = !!point && point.x >= x && point.x <= x + w && point.y >= y - 24 && point.y <= y + h;
    this.carried = over && point ? placeOn(this.desk, item, point.x, point.y + (art[3] - art[1]) / 2) : null;
    if (this.carried) {
      ghost.setPosition(this.carried[0], this.carried[1] - LIFT).setAlpha(0.95);
    } else if (point) {
      ghost.setPosition(point.x - (art[0] + art[2]) / 2, point.y - (art[1] + art[3]) / 2).setAlpha(0.55);
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

  // ---------- your desk, not decorating ----------

  private overMyDesk(x: number, y: number): boolean {
    const desk = myDesk();
    if (!desk) return false;
    const spec = FLOOR.desks[desk];
    return x >= spec.along[0] && x <= spec.along[1] && y >= spec.feet[0] - 40 && y <= spec.feet[1] + 4;
  }

  private hintAt(x: number, y: number) {
    const desk = myDesk();
    if (!desk || !this.overMyDesk(x, y)) return this.clearHint();
    const spec = FLOOR.desks[desk];
    this.outline.clear();
    const line = 1 / this.scene.cameras.main.zoom;
    const top = spec.feet[0] - 40;
    this.outline.lineStyle(2 * line, OUTLINE, 0.85).strokeRoundedRect(spec.along[0] - 4, top, spec.along[1] - spec.along[0] + 8, spec.feet[1] + 8 - top, 6);
    // Away from whoever sits there: over a near desk, under a far one.
    const below = spec.side === "back";
    setDeskHint({ ...this.toPage((spec.along[0] + spec.along[1]) / 2, below ? spec.feet[1] + 12 : top - 4), below });
  }

  private clearHint() {
    if (!decorateState().hint) return;
    this.outline.clear();
    setDeskHint(null);
  }

  /** A floor point on the page. */
  private toPage(x: number, y: number) {
    const camera = this.scene.cameras.main;
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const scale = canvas.width / this.scene.scale.width;
    return { x: canvas.left + (x - camera.worldView.x) * camera.zoom * scale, y: canvas.top + (y - camera.worldView.y) * camera.zoom * scale };
  }

  /** Outlines what's pointed at, frames what's picked, and says where its buttons go. */
  update() {
    if (!this.desk) return;
    this.outline.clear();
    this.frame.clear();
    const line = 1 / this.scene.cameras.main.zoom;
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
    this.shade.destroy();
    this.outline.destroy();
    this.frame.destroy();
    if (this.desk) this.leave();
    setDeskHint(null);
  }
}
