import * as Phaser from "phaser";
import { FLOOR } from "shared-protocol/map";
import { spotKey } from "shared-protocol/office";
import type { MapManager } from "./MapManager";
import { cssZoom } from "./plates";
import { closeDecorate, decorateState, pickPart, redo, setPart, subscribeDecorate, undo } from "./decorate";
import { typingElsewhere } from "./typing";

/** How long the camera takes to bring the desk into view. */
const FOCUS_MS = 460;
/**
 * The desk's panel (DeskPanel): at the floor's right on a wide screen (and
 * its margin), over its foot on a phone. The desk is brought into the middle of the floor
 * the panel leaves showing.
 */
const PANEL_WIDE = 376 + 16;
const PHONE = 640;
const PANEL_PHONE_SHARE = 0.56;
/** How high an empty spot's outline stands over its line, and how far below. */
const SPOT_RISE = 36;
const SPOT_DROP = 4;
const OUTLINE = 0xffffff;
const SHADE = 0x1c1c2a;
const DEPTH = 99980;
/** How much of the floor left showing the desk and its chair take up, brought close: big enough to see each thing on it. */
const DESK_SHARE = 0.42;
/** And no closer than this many screen pixels per floor pixel, where pixel art stops looking crisp and starts looking blown up. */
const MOST_ZOOM = 5;

type Box = { x: number; y: number; w: number; h: number };

/**
 * The floor's half of decorating your desk (lib/decorate.ts). The camera
 * glides to the desk, without zooming, so it sits in the floor the panel
 * leaves showing; the rest of the floor stays as it is. The desk's spots are
 * outlined, faintly, so you see where things go; pointed at, a part (a spot,
 * the chair, the desk itself) is outlined; pressed, it's picked, and the
 * panel shows what it can be. Keys: Delete empties the picked spot, Escape
 * closes, Ctrl+Z and Ctrl+Y undo and redo.
 */
export class DeskDecorator {
  private spots: Phaser.GameObjects.Graphics;
  private frame: Phaser.GameObjects.Graphics;
  private desk: string | null = null;
  private hovered: string | null = null;
  /** The camera's zoom before decorating brought the desk close, given back after. */
  private zoomBefore: number | null = null;
  private moving: Phaser.Tweens.Tween | null = null;
  private unsubscribe: () => void;
  private readonly keys = (event: KeyboardEvent) => this.key(event);

  constructor(
    private scene: Phaser.Scene,
    private map: MapManager,
    /** Hands the camera and your feet over to decorating (true) and back (false). */
    private hold: (decorating: boolean) => void,
    /** Where you are, for the camera to come back to. */
    private player: () => { x: number; y: number } | null,
    /** The camera's zoom changed: name tags keep their size on screen. */
    private zoomed: () => void,
  ) {
    this.spots = scene.add.graphics().setDepth(DEPTH);
    this.frame = scene.add.graphics().setDepth(DEPTH + 1);
    this.unsubscribe = subscribeDecorate(() => this.follow());
    scene.input.on("pointerdown", this.down, this);
    scene.input.on("pointermove", this.move, this);
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

  private enter(desk: string) {
    this.desk = desk;
    this.hold(true);
    const camera = this.scene.cameras.main;
    const spec = FLOOR.desks[desk];
    // The desk and its chair: left to right across its spots, top to bottom from what stands on it to the chair's foot.
    const left = spec.spots[0].x[0];
    const right = spec.spots[spec.spots.length - 1].x[1];
    const top = Math.min(...spec.spots.map((spot) => spot.foot - SPOT_RISE - 12), spec.chair.y);
    const bottom = Math.max(...spec.spots.map((spot) => spot.foot), spec.chair.y + 64);
    const x = (left + right) / 2;
    const y = (top + bottom) / 2;
    const phone = window.innerWidth < PHONE;
    // The floor the panel leaves showing, in CSS pixels, and the zoom that makes the desk a good part of it.
    const density = 1 / this.scene.scale.zoom;
    const freeWidth = window.innerWidth - (phone ? 0 : PANEL_WIDE);
    const freeHeight = this.scene.scale.height / density - (phone ? window.innerHeight * PANEL_PHONE_SHARE : 0);
    const cssPerFloor = Math.min((freeWidth * DESK_SHARE) / (right - left), (freeHeight * DESK_SHARE) / (bottom - top), MOST_ZOOM);
    const zoom = Math.max(camera.zoom, cssPerFloor * density);
    this.zoomBefore = camera.zoom;
    // Its middle, shifted by half the panel, so it sits in the middle of what's left showing.
    const cssZoomAt = zoom / density;
    const goal = { x: x + (phone ? 0 : PANEL_WIDE / 2 / cssZoomAt), y: y + (phone ? (window.innerHeight * PANEL_PHONE_SHARE) / 2 / cssZoomAt : 0) };
    camera.stopFollow();
    // Past the floor's edge if it has to be, to clear the panel: a desk near an edge, a phone's view far out.
    camera.useBounds = false;
    this.glide(zoom, goal, FOCUS_MS);
  }

  /** The camera to this zoom, looking at this floor point, together, eased. */
  private glide(zoom: number, at: { x: number; y: number }, ms: number, done?: () => void) {
    const camera = this.scene.cameras.main;
    this.moving?.stop();
    const from = { z: camera.zoom, x: camera.midPoint.x, y: camera.midPoint.y, t: 0 };
    const start = { ...from };
    this.moving = this.scene.tweens.add({
      targets: from,
      t: 1,
      duration: ms,
      ease: "Cubic.easeInOut",
      onUpdate: () => {
        const t = from.t;
        camera.setZoom(start.z + (zoom - start.z) * t);
        camera.centerOn(start.x + (at.x - start.x) * t, start.y + (at.y - start.y) * t);
        this.zoomed();
      },
      onComplete: () => {
        this.moving = null;
        done?.();
      },
    });
  }

  private leave() {
    this.desk = null;
    this.hovered = null;
    this.spots.clear();
    this.frame.clear();
    this.scene.game.canvas.style.cursor = "";
    const camera = this.scene.cameras.main;
    const zoom = this.zoomBefore;
    this.zoomBefore = null;
    // Back out to the zoom you had, around you, then the camera follows you again.
    const me = this.player();
    if (zoom && me) {
      this.glide(zoom, me, FOCUS_MS * 0.8, () => {
        camera.useBounds = true;
        this.hold(false);
      });
      return;
    }
    camera.useBounds = true;
    this.hold(false);
  }

  // ---------- the desk's parts ----------

  /** A piece's pixels where it's drawn now. */
  private artBox(key: string): Box | null {
    const image = this.map.getImage(key);
    if (!image) return null;
    const item = this.map.getPieces().find((piece) => piece.key === key)?.item;
    const art = item ? FLOOR.things[item]?.art : undefined;
    if (!art) return { x: image.x, y: image.y, w: image.width, h: image.height };
    return { x: image.x + art[0], y: image.y + art[1], w: art[2] - art[0], h: art[3] - art[1] };
  }

  /** A spot's outline: across it, from a little over its line (or the top of what stands there) to just under it. */
  private spotBox(desk: string, id: string): Box {
    const spot = FLOOR.desks[desk].spots.find((one) => one.id === id)!;
    const thing = this.artBox(spotKey(desk, id));
    const top = Math.min(spot.foot - SPOT_RISE, thing ? thing.y - 2 : Infinity);
    return { x: spot.x[0] + 1, y: top, w: spot.x[1] - spot.x[0] - 2, h: spot.foot + SPOT_DROP - top };
  }

  /** A part's outline: a spot's, or the chair's or the desk's own pixels. */
  private boxOf(key: string): Box | null {
    const desk = this.desk;
    if (!desk) return null;
    const spot = FLOOR.desks[desk].spots.find((one) => spotKey(desk, one.id) === key);
    return spot ? this.spotBox(desk, spot.id) : this.artBox(key);
  }

  /** Whether a piece's own pixels are under a point. */
  private hits(key: string, x: number, y: number): boolean {
    const image = this.map.getImage(key);
    if (!image || !image.getBounds().contains(x, y)) return false;
    return this.scene.textures.getPixelAlpha(Math.floor(x - image.x), Math.floor(y - image.y), image.texture.key, image.frame.name) > 0;
  }

  /** The part under a point: a spot first, then the chair, then the desk itself. */
  private partAt(x: number, y: number): string | null {
    const desk = this.desk;
    if (!desk) return null;
    const spec = FLOOR.desks[desk];
    for (const spot of spec.spots) {
      const box = this.spotBox(desk, spot.id);
      if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) return spotKey(desk, spot.id);
    }
    if (this.hits(spec.chair.key, x, y)) return spec.chair.key;
    if (spec.body && this.hits(spec.body.key, x, y)) return spec.body.key;
    return null;
  }

  private down(pointer: Phaser.Input.Pointer) {
    const part = this.partAt(pointer.worldX, pointer.worldY);
    if (part) pickPart(part);
  }

  private move(pointer: Phaser.Input.Pointer) {
    if (!this.desk) return;
    this.hovered = this.partAt(pointer.worldX, pointer.worldY);
    this.scene.game.canvas.style.cursor = this.hovered ? "pointer" : "";
  }

  private key(event: KeyboardEvent) {
    if (!this.desk || typingElsewhere()) return;
    const { part } = decorateState();
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (mod && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    } else if ((event.key === "Delete" || event.key === "Backspace") && part && FLOOR.desks[this.desk].spots.some((spot) => spotKey(this.desk!, spot.id) === part)) {
      event.preventDefault();
      setPart(part, null);
    } else if (event.key === "Escape") {
      closeDecorate();
    }
  }

  /** The spots, faint; the part pointed at, outlined; the part picked, framed. */
  update() {
    const desk = this.desk;
    if (!desk) return;
    this.spots.clear();
    this.frame.clear();
    const line = 1 / cssZoom(this.scene);
    const { part } = decorateState();
    for (const spot of FLOOR.desks[desk].spots) {
      const key = spotKey(desk, spot.id);
      const { x, y, w, h } = this.spotBox(desk, spot.id);
      // An empty spot says something can go there: a small plus in its middle, picked or not.
      if (!this.map.getImage(key)) {
        const arm = 5 * line;
        const [cx, cy] = [x + w / 2, y + h / 2];
        this.spots.lineStyle(1.5 * line, OUTLINE, key === part ? 0.95 : 0.7);
        this.spots.lineBetween(cx - arm, cy, cx + arm, cy).lineBetween(cx, cy - arm, cx, cy + arm);
      }
      if (key === part) continue;
      const pointed = key === this.hovered;
      this.spots.fillStyle(OUTLINE, pointed ? 0.16 : 0.08).fillRoundedRect(x, y, w, h, 3);
      this.spots.lineStyle(1.5 * line, OUTLINE, pointed ? 0.9 : 0.5).strokeRoundedRect(x, y, w, h, 3);
    }
    if (this.hovered && this.hovered !== part && !this.hovered.includes("/spot-")) {
      const box = this.boxOf(this.hovered);
      if (box) this.spots.lineStyle(1.5 * line, OUTLINE, 0.75).strokeRoundedRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 3);
    }
    const box = part ? this.boxOf(part) : null;
    if (!box) return;
    this.frame.fillStyle(OUTLINE, 0.1).fillRoundedRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 4);
    this.frame.lineStyle(4 * line, SHADE, 0.5).strokeRoundedRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 4);
    this.frame.lineStyle(2 * line, OUTLINE, 1).strokeRoundedRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 4);
  }

  destroy() {
    this.unsubscribe();
    window.removeEventListener("keydown", this.keys);
    this.scene.input.off("pointerdown", this.down, this);
    this.scene.input.off("pointermove", this.move, this);
    this.moving?.stop();
    this.spots.destroy();
    this.frame.destroy();
    if (this.desk) this.leave();
  }
}
