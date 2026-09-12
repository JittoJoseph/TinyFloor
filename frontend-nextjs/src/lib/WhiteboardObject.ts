import * as Phaser from "phaser";
import { whiteboard, Stroke } from "./WhiteboardManager";
import { sceneText } from "./sceneText";
import { GoTo, Interactable } from "./Interactable";

const TRAY = 7;
const TEXTURE = "whiteboard-surface";
const SURFACE = { width: 540, height: 216 };

const FRAME = 0x6f7076;
const FRAME_DARK = 0x4a4b50;
const HIGHLIGHT = 0xff4e00;

/**
 * The board as it exists in the room: a panel on the north wall that shows what
 * has been drawn on it, lights up when you are close, and opens the canvas once
 * you walk up to it.
 */
export class WhiteboardObject {
  private scene: Phaser.Scene;
  private frame: Phaser.GameObjects.Graphics;
  private surface: Phaser.GameObjects.Image;
  private texture: Phaser.Textures.CanvasTexture;
  private reach: Interactable;
  private unsubscribe: () => void;
  private lit = false;
  private repaintQueued = false;
  private board: { x: number; y: number; width: number; height: number };

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    rect: { x: number; y: number; width: number; height: number },
    goTo: GoTo,
  ) {
    this.scene = scene;
    this.board = rect;

    this.texture = scene.textures.exists(TEXTURE)
      ? (scene.textures.get(TEXTURE) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(TEXTURE, SURFACE.width, SURFACE.height)!;

    const inner = this.innerRect();
    this.frame = scene.add.graphics().setDepth(this.depth());
    this.surface = scene.add
      .image(inner.x + inner.width / 2, inner.y + inner.height / 2, TEXTURE)
      .setDisplaySize(inner.width, inner.height)
      .setDepth(this.depth() + 0.1);

    this.reach = new Interactable(
      scene,
      player,
      { x: rect.x + rect.width / 2, y: this.depth() },
      this.surface,
      sceneText().draw,
      goTo,
      () => whiteboard.setOpen(true),
      (lit) => {
        this.lit = lit;
        this.drawFrame();
      },
    );
    this.drawFrame();
    this.repaint();

    this.unsubscribe = whiteboard.onStroke(() => this.queueRepaint());
  }

  private depth() {
    return this.board.y + this.board.height;
  }

  private innerRect() {
    return {
      x: this.board.x + 4,
      y: this.board.y + 4,
      width: this.board.width - 8,
      height: this.board.height - 8 - TRAY,
    };
  }

  /** Flat, axis aligned and 1px shaded so it reads as part of the pixel art. */
  private drawFrame() {
    const inner = this.innerRect();
    this.frame.clear();

    this.frame.fillStyle(0x000000, 0.18);
    this.frame.fillRect(this.board.x + 2, this.board.y + 3, this.board.width, this.board.height);

    this.frame.fillStyle(FRAME, 1);
    this.frame.fillRect(this.board.x, this.board.y, this.board.width, this.board.height);

    if (this.lit) {
      this.frame.lineStyle(2, HIGHLIGHT, 1);
      this.frame.strokeRect(
        this.board.x - 2,
        this.board.y - 2,
        this.board.width + 4,
        this.board.height + 4,
      );
    }

    this.frame.fillStyle(FRAME_DARK, 1);
    this.frame.fillRect(
      this.board.x,
      this.board.y + this.board.height - TRAY,
      this.board.width,
      TRAY,
    );

    this.frame.fillStyle(0xffffff, 0.22);
    this.frame.fillRect(this.board.x, this.board.y, this.board.width, 1);

    this.frame.fillStyle(0x000000, 0.25);
    this.frame.fillRect(inner.x - 1, inner.y - 1, inner.width + 2, 1);

    // marker resting in the tray
    this.frame.fillStyle(0xff4e00, 1);
    this.frame.fillRect(this.board.x + 14, this.board.y + this.board.height - 5, 14, 3);
    this.frame.fillStyle(0x2f4ad0, 1);
    this.frame.fillRect(this.board.x + 32, this.board.y + this.board.height - 5, 14, 3);
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
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i] * SURFACE.width, points[i + 1] * SURFACE.height);
    }
    ctx.stroke();
  }

  update() {
    this.reach.update();
  }

  destroy() {
    this.unsubscribe();
    this.reach.destroy();
    this.surface.destroy();
    this.frame.destroy();
  }
}
