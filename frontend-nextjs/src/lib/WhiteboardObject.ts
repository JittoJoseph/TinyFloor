import * as Phaser from "phaser";
import { whiteboard, Stroke } from "./WhiteboardManager";

/** Sits in the clear four tile bay on the north wall, between the shelving. */
const BOARD = { x: 644, y: 10, width: 120, height: 60 };
const TRAY = 7;
const REACH = 210;
const TEXTURE = "whiteboard-surface";
const SURFACE = { width: 540, height: 216 };
const DEPTH = 20050;

const FRAME = 0x6f7076;
const FRAME_DARK = 0x4a4b50;
const HIGHLIGHT = 0xff4e00;

/**
 * The board as it exists in the room: a panel on the north wall that shows what
 * has been drawn on it, lights up when you can reach it, and opens the canvas
 * when clicked.
 */
export class WhiteboardObject {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private frame: Phaser.GameObjects.Graphics;
  private surface: Phaser.GameObjects.Image;
  private prompt: Phaser.GameObjects.Container;
  private texture: Phaser.Textures.CanvasTexture;
  private unsubscribe: () => void;
  private inReach = false;
  private hovered = false;
  private repaintQueued = false;

  constructor(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;

    this.texture = scene.textures.exists(TEXTURE)
      ? (scene.textures.get(TEXTURE) as Phaser.Textures.CanvasTexture)
      : scene.textures.createCanvas(TEXTURE, SURFACE.width, SURFACE.height)!;

    const inner = this.innerRect();
    this.frame = scene.add.graphics().setDepth(DEPTH);
    this.surface = scene.add
      .image(inner.x + inner.width / 2, inner.y + inner.height / 2, TEXTURE)
      .setDisplaySize(inner.width, inner.height)
      .setDepth(DEPTH + 1);

    this.prompt = this.createPrompt();
    this.drawFrame();
    this.repaint();

    this.surface.setInteractive({ pixelPerfect: false });
    this.surface.on("pointerover", () => this.setHovered(true));
    this.surface.on("pointerout", () => this.setHovered(false));
    this.surface.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.inReach) whiteboard.setOpen(true);
    });

    this.unsubscribe = whiteboard.onStroke(() => this.queueRepaint());
  }

  private innerRect() {
    return {
      x: BOARD.x + 4,
      y: BOARD.y + 4,
      width: BOARD.width - 8,
      height: BOARD.height - 8 - TRAY,
    };
  }

  private createPrompt() {
    const label = this.scene.add
      .text(0, 0, "Click to draw", {
        fontSize: "13px",
        fontFamily: "VT323, monospace",
        color: "#ffffff",
        resolution: 2,
      })
      .setOrigin(0.5);

    const background = this.scene.add.graphics();
    const width = label.width + 20;
    background.fillStyle(0x1f2937, 0.9);
    background.fillRoundedRect(-width / 2, -11, width, 22, 11);

    const container = this.scene.add.container(
      BOARD.x + BOARD.width / 2,
      BOARD.y + BOARD.height + 24,
      [background, label],
    );
    container.setDepth(DEPTH + 2).setAlpha(0);
    return container;
  }

  /** Flat, axis aligned and 1px shaded so it reads as part of the pixel art. */
  private drawFrame() {
    const inner = this.innerRect();
    const lit = this.inReach;
    this.frame.clear();

    this.frame.fillStyle(0x000000, 0.18);
    this.frame.fillRect(BOARD.x + 2, BOARD.y + 3, BOARD.width, BOARD.height);

    this.frame.fillStyle(FRAME, 1);
    this.frame.fillRect(BOARD.x, BOARD.y, BOARD.width, BOARD.height);

    if (lit) {
      this.frame.lineStyle(2, HIGHLIGHT, 1);
      this.frame.strokeRect(
        BOARD.x - 2,
        BOARD.y - 2,
        BOARD.width + 4,
        BOARD.height + 4,
      );
    }

    this.frame.fillStyle(FRAME_DARK, 1);
    this.frame.fillRect(
      BOARD.x,
      BOARD.y + BOARD.height - TRAY,
      BOARD.width,
      TRAY,
    );

    this.frame.fillStyle(0xffffff, 0.22);
    this.frame.fillRect(BOARD.x, BOARD.y, BOARD.width, 1);

    this.frame.fillStyle(0x000000, 0.25);
    this.frame.fillRect(inner.x - 1, inner.y - 1, inner.width + 2, 1);

    // marker resting in the tray
    this.frame.fillStyle(0xff4e00, 1);
    this.frame.fillRect(BOARD.x + 14, BOARD.y + BOARD.height - 5, 14, 3);
    this.frame.fillStyle(0x2f4ad0, 1);
    this.frame.fillRect(BOARD.x + 32, BOARD.y + BOARD.height - 5, 14, 3);
  }

  private setHovered(hovered: boolean) {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    this.applyCursor();
  }

  private applyCursor() {
    this.scene.input.setDefaultCursor(
      this.hovered && this.inReach ? "pointer" : "default",
    );
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
    const reachable =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        BOARD.x + BOARD.width / 2,
        BOARD.y + BOARD.height,
      ) < REACH;

    if (reachable === this.inReach) return;
    this.inReach = reachable;
    this.drawFrame();
    this.applyCursor();

    this.scene.tweens.add({
      targets: this.prompt,
      alpha: reachable ? 1 : 0,
      y: BOARD.y + BOARD.height + (reachable ? 18 : 24),
      duration: 220,
      ease: "Cubic.easeOut",
    });
  }

  destroy() {
    this.unsubscribe();
    this.scene.tweens.killTweensOf(this.prompt);
    this.surface.destroy();
    this.frame.destroy();
    this.prompt.destroy();
    this.scene.input.setDefaultCursor("default");
  }
}
