import * as Phaser from "phaser";
import { jukebox } from "./JukeboxManager";
import { sceneText } from "./sceneText";

const REACH = 210;

/** Pulled from the office tileset so it sits in the same palette as the desks. */
const OUTLINE = 0x3a3a50;
const CABINET = 0xacafbf;
const CABINET_LIGHT = 0xc6bdd5;
const CABINET_SHADE = 0x8b8bab;
const BAFFLE = 0x9296b0;
const CONE = 0x565972;
const CONE_DARK = 0x46465e;
const CONE_RING = 0xb9c3d5;
const WOOD = 0xc09e80;
const WOOD_LIGHT = 0xcaab8b;
const ACCENT = 0xff4e00;

/**
 * A floor speaker. It shows a small level meter while the room's music plays,
 * lights up when you are close enough to touch it, and opens the controls when
 * clicked.
 */
export class JukeboxObject {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private cabinet: Phaser.GameObjects.Graphics;
  private meter: Phaser.GameObjects.Graphics;
  private prompt: Phaser.GameObjects.Container;
  private hitArea: Phaser.GameObjects.Zone;
  private unsubscribe: () => void;
  private inReach = false;
  private hovered = false;
  private playing = false;
  private meterAt = 0;
  private box: { x: number; y: number; width: number; height: number };
  private onApproach?: (x: number, y: number) => void;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    at: { x: number; y: number },
    onApproach?: (x: number, y: number) => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.box = { x: at.x, y: at.y - 46, width: 30, height: 46 };
    this.onApproach = onApproach;

    this.cabinet = scene.add.graphics().setDepth(this.depth());
    this.meter = scene.add.graphics().setDepth(this.depth() + 0.1);
    this.prompt = this.createPrompt();

    this.hitArea = scene.add
      .zone(
        this.box.x + this.box.width / 2,
        this.box.y + this.box.height / 2,
        this.box.width + 12,
        this.box.height + 12,
      )
      .setOrigin(0.5)
      .setInteractive();
    this.hitArea.on("pointerover", () => this.setHovered(true));
    this.hitArea.on("pointerout", () => this.setHovered(false));
    this.hitArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (this.inReach) jukebox.setOpen(!jukebox.getSnapshot().open);
      else
        this.onApproach?.(
          this.box.x + this.box.width / 2,
          this.box.y + this.box.height + 24,
        );
    });

    this.draw();
    this.unsubscribe = jukebox.subscribe(() => {
      const { playing } = jukebox.getSnapshot();
      if (playing === this.playing) return;
      this.playing = playing;
      this.draw();
      this.drawMeter();
    });
  }

  private depth() {
    return this.box.y + this.box.height;
  }

  private createPrompt() {
    const label = this.scene.add
      .text(0, 0, sceneText().music, {
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
      this.box.x + this.box.width / 2,
      this.box.y + this.box.height + 20,
      [background, label],
    );
    container.setDepth(this.depth() + 0.2).setAlpha(0).setVisible(false);
    return container;
  }

  /** Flat shapes with a 1px outline, the way the tileset draws its furniture. */
  private draw() {
    const { x, y, width, height } = this.box;
    const g = this.cabinet;
    const bodyH = height - 7;
    g.clear();

    g.fillStyle(0x000000, 0.16);
    g.fillEllipse(x + width / 2, y + height - 1, width * 0.95, 6);

    // wooden plinth, same tone as the desks
    g.fillStyle(OUTLINE, 1);
    g.fillRect(x + 1, y + bodyH, width - 2, 7);
    g.fillStyle(WOOD, 1);
    g.fillRect(x + 2, y + bodyH + 1, width - 4, 5);
    g.fillStyle(WOOD_LIGHT, 1);
    g.fillRect(x + 2, y + bodyH + 1, width - 4, 1);

    // cabinet
    g.fillStyle(OUTLINE, 1);
    g.fillRect(x, y, width, bodyH);
    g.fillStyle(CABINET, 1);
    g.fillRect(x + 1, y + 1, width - 2, bodyH - 2);
    g.fillStyle(CABINET_LIGHT, 1);
    g.fillRect(x + 1, y + 1, width - 2, 2);
    g.fillStyle(CABINET_SHADE, 1);
    g.fillRect(x + width - 3, y + 1, 2, bodyH - 2);

    // recessed speaker face
    g.fillStyle(BAFFLE, 1);
    g.fillRect(x + 4, y + 5, width - 9, bodyH - 10);
    g.fillStyle(CABINET_SHADE, 1);
    g.fillRect(x + 4, y + 5, width - 9, 1);

    const cx = x + width / 2;
    g.fillStyle(CONE_RING, 1);
    g.fillCircle(cx, y + 26, 8);
    g.fillStyle(CONE, 1);
    g.fillCircle(cx, y + 26, 6);
    g.fillStyle(CONE_DARK, 1);
    g.fillCircle(cx, y + 26, 3);

    g.fillStyle(CONE_RING, 1);
    g.fillCircle(cx, y + 12, 4);
    g.fillStyle(CONE, 1);
    g.fillCircle(cx, y + 12, 2);

    g.fillStyle(this.playing ? ACCENT : CONE, 1);
    g.fillRect(x + width - 7, y + 6, 2, 2);

    if (this.inReach) {
      g.lineStyle(1, ACCENT, 0.9);
      g.strokeRect(x - 2, y - 2, width + 4, height + 2);
    }
  }

  /** Three bars bouncing above the speaker: visible proof the room has music on. */
  private drawMeter() {
    const g = this.meter;
    g.clear();
    if (!this.playing) return;

    const base = this.box.y - 4;
    const cx = this.box.x + this.box.width / 2;
    const phase = this.meterAt;
    g.fillStyle(ACCENT, 0.95);
    for (let i = 0; i < 3; i++) {
      const h = 3 + Math.round((Math.sin(phase + i * 1.9) + 1) * 3.5);
      g.fillRect(cx - 8 + i * 6, base - h, 3, h);
    }
  }

  update(_time: number, delta: number) {
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.box.x + this.box.width / 2,
      this.box.y + this.box.height,
    );
    const reachable = distance < REACH;
    jukebox.setProximity(distance, reachable);

    if (this.playing) {
      this.meterAt += delta / 130;
      this.drawMeter();
    }

    if (reachable === this.inReach) return;
    this.inReach = reachable;
    this.draw();
    this.applyCursor();

    if (reachable) this.prompt.setVisible(true);
    this.scene.tweens.add({
      targets: this.prompt,
      alpha: reachable ? 1 : 0,
      y: this.box.y + this.box.height + (reachable ? 14 : 20),
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (!this.inReach) this.prompt.setVisible(false);
      },
    });
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

  destroy() {
    this.unsubscribe();
    this.scene.tweens.killTweensOf(this.prompt);
    this.cabinet.destroy();
    this.meter.destroy();
    this.prompt.destroy();
    this.hitArea.destroy();
  }
}
