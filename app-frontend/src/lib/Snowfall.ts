import * as Phaser from "phaser";

/** One flake for this much of the screen (CSS pixels squared), so a big window and a phone both get a light fall. */
const AREA_PER_FLAKE = 15_000;
const MOST_FLAKES = 150;
/** How fast flakes fall and how far they sway, in CSS pixels a second: the same on screen at any zoom. */
const FALL: [number, number] = [16, 34];
const SWAY = 12;

interface Flake {
  /** Where it is on screen, in CSS pixels. */
  x: number;
  y: number;
  speed: number;
  phase: number;
  sway: number;
  /** Its size, in CSS pixels: a small square, the floor's own pixel look. */
  size: number;
  alpha: number;
}

/** Wrapped into [0, span): a flake that leaves one edge comes in at the other, however far it went. */
const wrap = (value: number, span: number) => ((value % span) + span) % span;

/**
 * Snow drifting down over the floor (lib/christmas). It's drawn on the screen,
 * not on the floor: a thin canvas over the floor and everything laid on it,
 * so a flake is the same size and the fall as light at any zoom (on the floor
 * it grew with the camera, close up to a blizzard of big squares, and zooming
 * stranded flakes along the view's edges in lines). It still belongs to the
 * floor where it should: as the camera pans, the flakes go with the floor
 * under them; as it zooms, they stay put and keep falling.
 */
export class Snowfall {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;
  private flakes: Flake[] = [];
  private width = 0;
  private height = 0;
  private ratio = 1;
  /** Where the camera was last frame, and at what zoom: a pan since then carries the flakes; a zoom doesn't. */
  private last: { x: number; y: number; zoom: number } | null = null;

  constructor(private scene: Phaser.Scene) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "snowfall";
    this.canvas.setAttribute("aria-hidden", "true");
    // Over everything on the floor, the focus around a desk being decorated too (DeskDecorator): snow falls on all of it.
    Object.assign(this.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "2" });
    const game = scene.game.canvas;
    game.insertAdjacentElement("afterend", this.canvas);
    this.context = this.canvas.getContext("2d");
    this.fit();
  }

  /** The canvas as big as the floor, sharp at the screen's density, with flakes enough for its size. */
  private fit() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (width === this.width && height === this.height && ratio === this.ratio) return;
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const count = Math.min(MOST_FLAKES, Math.round((width * height) / AREA_PER_FLAKE));
    // Keep the flakes already falling, add or drop to the new count, spread over the whole screen.
    while (this.flakes.length < count) {
      const big = Math.random() < 0.3;
      this.flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: Phaser.Math.FloatBetween(FALL[0], FALL[1]) * (big ? 1.25 : 1),
        phase: Math.random() * Math.PI * 2,
        sway: Math.random() * SWAY,
        size: big ? 3 : 2,
        alpha: big ? 0.85 : 0.6,
      });
    }
    this.flakes.length = count;
    for (const flake of this.flakes) {
      flake.x = wrap(flake.x, width);
      flake.y = wrap(flake.y, height);
    }
  }

  update(time: number, delta: number) {
    const context = this.context;
    if (!context) return;
    // Under a view the floor isn't shown, so neither is its snow.
    const shown = this.scene.sys.settings.visible;
    this.canvas.style.display = shown ? "" : "none";
    if (!shown) return;
    this.fit();
    const { width, height } = this;
    if (!width || !height) return;

    // A pan moves the floor under the snow, and the snow with it; a zoom changes the scale, not where flakes are.
    const camera = this.scene.cameras.main;
    const cssPerFloor = camera.zoom * this.scene.scale.zoom;
    let dx = 0;
    let dy = 0;
    if (this.last && this.last.zoom === camera.zoom) {
      dx = (this.last.x - camera.scrollX) * cssPerFloor;
      dy = (this.last.y - camera.scrollY) * cssPerFloor;
      // A jump (a new floor, a teleport) isn't a pan: nothing to carry.
      if (Math.abs(dx) > width || Math.abs(dy) > height) dx = dy = 0;
    }
    this.last = { x: camera.scrollX, y: camera.scrollY, zoom: camera.zoom };

    const dt = Math.min(delta, 100) / 1000;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    for (const flake of this.flakes) {
      flake.y = wrap(flake.y + flake.speed * dt + dy, height);
      flake.x = wrap(flake.x + Math.sin(time / 900 + flake.phase) * flake.sway * dt + dx, width);
      context.globalAlpha = flake.alpha;
      context.fillRect(Math.round(flake.x), Math.round(flake.y), flake.size, flake.size);
    }
    context.globalAlpha = 1;
  }

  destroy() {
    this.canvas.remove();
    this.flakes = [];
    this.context = null;
  }
}
