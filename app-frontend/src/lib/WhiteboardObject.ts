import * as Phaser from "phaser";
import { BOARD_ASPECT, whiteboard, Stroke } from "./WhiteboardManager";
import { sceneText } from "./sceneText";
import type { GoTo } from "./MovementManager";
import type { ActionAt } from "./actions";
import { SceneLabel, tagName } from "./SceneLabel";

/** Close enough to open it with E, and for it to light up. */
const REACH = 210;
/** Where you stand to use it: on the floor below its middle. */
const STAND_GAP = 32;
const TRAY = 7;
/** The frame around the drawing, each side. */
const BORDER = 4;
const TEXTURE = "whiteboard-surface";
const SURFACE = { width: 480, height: 480 / BOARD_ASPECT };
/** How often the "Drawing" tag is brought up to date. */
const TAG_EVERY = 500;

const FRAME = 0x6f7076;
const FRAME_LIT = 0x8b8c93;
const FRAME_DARK = 0x4a4b50;
const DRAWING = 0xff4e00;

/**
 * The board as it exists in the room: a panel on the wall showing what's been
 * drawn on it, the same shape as the board you draw on, so a circle is a
 * circle here too. Its frame lightens while you're close enough to open it
 * (E, or the hint); clicking it from anywhere walks you over and opens it.
 * While someone else draws, a tag under it says who, so a sketch going on
 * across the room is something you can see and walk over to.
 */
export class WhiteboardObject {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private frame: Phaser.GameObjects.Graphics;
  private surface: Phaser.GameObjects.Image;
  private texture: Phaser.Textures.CanvasTexture;
  private tag: SceneLabel;
  private unsubscribe: () => void;
  private board: { x: number; y: number; width: number; height: number };
  /** Where you stand to use it. */
  private spot: { x: number; y: number };
  private distance = Infinity;
  private lit = false;
  private repaintQueued = false;
  private tagAt = 0;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    /** Its place on the wall (the map's Whiteboard object): the board fills its width and stands on its bottom. */
    wall: { x: number; y: number; width: number; height: number },
    goTo: GoTo,
    private readonly nameOf: (id: string) => string | undefined,
  ) {
    this.scene = scene;
    this.player = player;
    const height = (wall.width - 2 * BORDER) / BOARD_ASPECT + 2 * BORDER + TRAY;
    this.board = { x: wall.x, y: wall.y + wall.height - height - 2, width: wall.width, height };
    const bottom = this.board.y + this.board.height;
    this.spot = { x: this.board.x + this.board.width / 2, y: bottom };

    this.texture = scene.textures.exists(TEXTURE)
      ? (scene.textures.get(TEXTURE) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(TEXTURE, SURFACE.width, SURFACE.height)!;

    const inner = this.innerRect();
    this.frame = scene.add.graphics().setDepth(bottom);
    this.surface = scene.add
      .image(inner.x + inner.width / 2, inner.y + inner.height / 2, TEXTURE)
      .setDisplaySize(inner.width, inner.height)
      .setDepth(bottom + 0.1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        goTo(this.spot.x, this.spot.y + STAND_GAP, () => whiteboard.setOpen(true));
      });
    this.tag = new SceneLabel(scene, this.spot.x, bottom + 24, "").setDot(DRAWING);
    this.tag.container.setDepth(bottom + 1).setVisible(false);

    this.drawFrame();
    this.repaint();
    this.unsubscribe = whiteboard.onStroke(() => this.queueRepaint());
  }

  private innerRect() {
    return {
      x: this.board.x + BORDER,
      y: this.board.y + BORDER,
      width: this.board.width - 2 * BORDER,
      height: this.board.height - 2 * BORDER - TRAY,
    };
  }

  /** Flat, axis aligned and 1px shaded so it reads as part of the pixel art. */
  private drawFrame() {
    const { x, y, width, height } = this.board;
    const inner = this.innerRect();
    this.frame.clear();

    this.frame.fillStyle(0x000000, 0.18);
    this.frame.fillRect(x + 2, y + 3, width, height);
    this.frame.fillStyle(this.lit ? FRAME_LIT : FRAME, 1);
    this.frame.fillRect(x, y, width, height);
    this.frame.fillStyle(FRAME_DARK, 1);
    this.frame.fillRect(x, y + height - TRAY, width, TRAY);
    this.frame.fillStyle(0xffffff, 0.22);
    this.frame.fillRect(x, y, width, 1);
    this.frame.fillStyle(0x000000, 0.25);
    this.frame.fillRect(inner.x - 1, inner.y - 1, inner.width + 2, 1);

    // markers resting in the tray
    this.frame.fillStyle(0xff4e00, 1);
    this.frame.fillRect(x + 14, y + height - 5, 14, 3);
    this.frame.fillStyle(0x2f4ad0, 1);
    this.frame.fillRect(x + 32, y + height - 5, 14, 3);
  }

  private queueRepaint() {
    if (this.repaintQueued) return;
    this.repaintQueued = true;
    this.scene.time.delayedCall(120, () => {
      this.repaintQueued = false;
      this.repaint();
    });
  }

  private repaint() {
    const ctx = this.texture.getContext();
    ctx.fillStyle = "#f7f7f4";
    ctx.fillRect(0, 0, SURFACE.width, SURFACE.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    whiteboard.getStrokes().forEach((stroke) => this.paintStroke(ctx, stroke));
    this.texture.refresh();
  }

  private paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    const { points } = stroke;
    if (points.length < 4) return;
    ctx.strokeStyle = stroke.erase ? "#f7f7f4" : stroke.color;
    ctx.lineWidth = Math.max(1.5, stroke.size * (SURFACE.width / 900));
    ctx.beginPath();
    ctx.moveTo(points[0] * SURFACE.width, points[1] * SURFACE.height);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i] * SURFACE.width, points[i + 1] * SURFACE.height);
    ctx.stroke();
  }

  /** "Drawing · Riley", or "Drawing · Riley +1", while anyone else is drawing. */
  private showDrawing(time: number) {
    if (time < this.tagAt) return;
    this.tagAt = time + TAG_EVERY;
    const names = whiteboard
      .drawing()
      .map((id) => this.nameOf(id))
      .filter((name): name is string => !!name)
      .map(tagName);
    this.tag.container.setVisible(names.length > 0);
    if (names.length) this.tag.setText(`${sceneText().drawing} · ${names[0]}${names.length > 1 ? ` +${names.length - 1}` : ""}`);
  }

  update(time: number) {
    this.distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.spot.x, this.spot.y);
    const lit = this.distance < REACH;
    if (lit !== this.lit) {
      this.lit = lit;
      this.drawFrame();
    }
    this.showDrawing(time);
  }

  /** Opening it, while you're close and it isn't open already. */
  action(): ActionAt | null {
    return this.lit && !whiteboard.getSnapshot().open
      ? { action: "draw", distance: this.distance, run: () => whiteboard.setOpen(true) }
      : null;
  }

  destroy() {
    this.unsubscribe();
    this.tag.container.destroy();
    this.surface.destroy();
    this.frame.destroy();
  }
}
