import * as Phaser from "phaser";
import { FLOOR } from "shared-protocol/map";
import { spotKey } from "shared-protocol/office";
import type { MapManager } from "./MapManager";
import { cssZoom, toCss } from "./plates";
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
/** How much of the floor left showing the desk and its chair take up, brought close: big enough to see each thing on it, small enough that it's still a desk in a room. */
const DESK_SHARE = 0.36;
/** Around the desk, while decorating: how far out of focus the rest of the floor goes (CSS pixels), and how much it's dimmed. */
const FOCUS_BLUR = 5;
const FOCUS_DIM = 0.18;
/** The clear oval: the desk and its chair with a little room (floor pixels), reaching this far past them, clear this far in before it fades. */
const OVAL_PAD = 10;
const OVAL_REACH = 1.45;
const OVAL_CLEAR = 0.62;
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
  /** Over the floor while decorating: everything but the desk softened, so the eye lands on the desk. */
  private focus: HTMLDivElement | null = null;
  private focusMask = "";
  /** The focus is one still picture now (blurBehind): the hole is in it, nothing more to place. Its size, as the floor was. */
  private baked = false;
  private bakedSize = "";
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
    this.showFocus();
    this.glide(zoom, goal, FOCUS_MS, () => this.blurBehind(desk));
  }

  /**
   * The soft focus around the desk while it's decorated: the rest of the floor
   * dimmed and out of focus, the desk in a clear oval in the middle. While the
   * camera glides in it's only the dimming, a hole in it kept on the desk
   * (cheap); once the camera has settled, one picture of the floor is taken,
   * blurred, dimmed and given its hole once, into its pixels, and shown
   * instead. A live blur (or a blur, a mask, even a still picture under a
   * mask, laid over the floor) is worked out again every frame and cost a
   * third of the frame rate; one still picture costs nothing. The desk, in the
   * hole, is the live floor.
   */
  private showFocus() {
    const layer = document.createElement("div");
    layer.className = "desk-focus";
    Object.assign(layer.style, {
      position: "absolute",
      inset: "0",
      // Over the floor and the labels laid on it (name tags), under the snow (Snowfall) and the page's own panels.
      zIndex: "1",
      pointerEvents: "none",
      opacity: "0",
      transition: `opacity ${FOCUS_MS}ms ease-out`,
      background: `rgb(12 12 16 / ${FOCUS_DIM})`,
    });
    this.scene.game.canvas.parentElement?.appendChild(layer);
    this.focus = layer;
    this.focusMask = "";
    this.baked = false;
    requestAnimationFrame(() => (layer.style.opacity = "1"));
  }

  /** The camera has settled on the desk: the focus becomes one still picture, blurred, dimmed, with its hole. */
  private blurBehind(desk: string) {
    const layer = this.focus;
    if (!layer) return;
    const game = this.scene.game.canvas;
    const oval = this.spotlight(desk);
    // The floor as just drawn, copied straight after a frame (while the canvas still holds it), not by
    // Phaser's snapshot, which left the floor drawing slower for good after it was taken once.
    const grab = () => {
      this.scene.game.events.off(Phaser.Core.Events.POST_RENDER, grab);
      if (this.focus !== layer || this.desk !== desk) return;
      const snap = document.createElement("canvas");
      snap.width = game.width;
      snap.height = game.height;
      snap.getContext("2d")?.drawImage(game, 0, 0);
      this.bake(layer, snap, oval);
    };
    this.scene.game.events.on(Phaser.Core.Events.POST_RENDER, grab);
  }

  /** The focus as one still picture: the floor blurred, dimmed, with the clear oval cut out of it. */
  private bake(layer: HTMLDivElement, snap: HTMLCanvasElement, oval: { x: number; y: number; rx: number; ry: number }) {
    const game = this.scene.game.canvas;
    const picture = document.createElement("canvas");
    picture.width = snap.width;
    picture.height = snap.height;
    const context = picture.getContext("2d");
    // Without canvas filters (older Safari), the dimming alone stays.
    if (!context || !("filter" in context)) return;
    const density = snap.width / Math.max(1, game.offsetWidth);
    // Sharp first, so the blur's soft edge at the screen's border fades into the floor, not into nothing.
    context.drawImage(snap, 0, 0);
    context.filter = `blur(${Math.round(FOCUS_BLUR * density)}px) saturate(0.85)`;
    context.drawImage(snap, 0, 0);
    context.filter = "none";
    context.fillStyle = `rgb(12 12 16 / ${FOCUS_DIM})`;
    context.fillRect(0, 0, picture.width, picture.height);
    // The hole: clear in the middle, fading into the rest at its edge.
    context.globalCompositeOperation = "destination-out";
    context.translate((oval.x - game.offsetLeft) * density, (oval.y - game.offsetTop) * density);
    context.scale(oval.rx * density, oval.ry * density);
    const fade = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, "#000");
    fade.addColorStop(OVAL_CLEAR, "#000");
    fade.addColorStop(1, "rgb(0 0 0 / 0)");
    context.fillStyle = fade;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    Object.assign(picture.style, {
      position: "absolute",
      left: `${game.offsetLeft}px`,
      top: `${game.offsetTop}px`,
      width: `${game.offsetWidth}px`,
      height: `${game.offsetHeight}px`,
      opacity: "0",
      transition: "opacity 260ms ease-out",
    });
    layer.appendChild(picture);
    requestAnimationFrame(() => {
      picture.style.opacity = "1";
      // Once it's in, the layer drops its own dimming and mask: the picture is all of it.
      window.setTimeout(() => {
        if (this.focus !== layer) return;
        this.baked = true;
        this.bakedSize = `${game.offsetWidth}x${game.offsetHeight}`;
        Object.assign(layer.style, { background: "transparent", maskImage: "none", webkitMaskImage: "none" });
      }, 280);
    });
  }

  private hideFocus() {
    const layer = this.focus;
    this.focus = null;
    this.baked = false;
    if (!layer) return;
    layer.style.opacity = "0";
    window.setTimeout(() => layer.remove(), FOCUS_MS);
  }

  /** The clear oval over the desk and its chair, on screen (CSS pixels from the floor's top left): its middle and its radii. */
  private spotlight(desk: string): { x: number; y: number; rx: number; ry: number } {
    const spec = FLOOR.desks[desk];
    const left = spec.spots[0].x[0] - OVAL_PAD;
    const right = spec.spots[spec.spots.length - 1].x[1] + OVAL_PAD;
    const top = Math.min(...spec.spots.map((spot) => spot.foot - SPOT_RISE - 12), spec.chair.y) - OVAL_PAD;
    const bottom = Math.max(...spec.spots.map((spot) => spot.foot), spec.chair.y + 64) + OVAL_PAD;
    const a = toCss(this.scene, left, top);
    const b = toCss(this.scene, right, bottom);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, rx: ((b.x - a.x) / 2) * OVAL_REACH, ry: ((b.y - a.y) / 2) * OVAL_REACH };
  }

  /** While the camera glides: the hole in the dimming, kept on the desk. */
  private placeFocus(desk: string) {
    const layer = this.focus;
    if (!layer) return;
    if (this.baked) {
      // The floor changed size under it (the window, a panel): the picture no longer lines up, so back to the dimming, which follows.
      const game = this.scene.game.canvas;
      if (`${game.offsetWidth}x${game.offsetHeight}` === this.bakedSize) return;
      layer.querySelector("canvas")?.remove();
      layer.style.background = `rgb(12 12 16 / ${FOCUS_DIM})`;
      this.baked = false;
      this.focusMask = "";
    }
    const oval = this.spotlight(desk);
    const mask = `radial-gradient(ellipse ${oval.rx.toFixed(0)}px ${oval.ry.toFixed(0)}px at ${oval.x.toFixed(0)}px ${oval.y.toFixed(0)}px, transparent ${OVAL_CLEAR * 100}%, #000 100%)`;
    if (mask === this.focusMask) return;
    this.focusMask = mask;
    layer.style.maskImage = mask;
    layer.style.webkitMaskImage = mask;
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
    this.hideFocus();
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
    this.placeFocus(desk);
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
