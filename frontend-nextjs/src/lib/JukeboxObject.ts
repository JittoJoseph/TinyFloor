import * as Phaser from "phaser";
import { jukebox } from "./JukeboxManager";
import { sceneText } from "./sceneText";
import { GoTo, Interactable } from "./Interactable";

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
 * lights up when you are close, and opens the controls once you walk up to it.
 */
export class JukeboxObject {
  private cabinet: Phaser.GameObjects.Graphics;
  private meter: Phaser.GameObjects.Graphics;
  private hitArea: Phaser.GameObjects.Zone;
  private reach: Interactable;
  private unsubscribe: () => void;
  private lit = false;
  private playing = false;
  private meterAt = 0;
  private box: { x: number; y: number; width: number; height: number };

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    at: { x: number; y: number },
    goTo: GoTo,
  ) {
    this.box = { x: at.x, y: at.y - 46, width: 30, height: 46 };
    const cx = this.box.x + this.box.width / 2;
    const bottom = this.box.y + this.box.height;

    this.cabinet = scene.add.graphics().setDepth(bottom);
    this.meter = scene.add.graphics().setDepth(bottom + 0.1);
    this.hitArea = scene.add
      .zone(cx, this.box.y + this.box.height / 2, this.box.width + 12, this.box.height + 12)
      .setOrigin(0.5);

    this.reach = new Interactable(
      scene,
      player,
      { x: cx, y: bottom },
      this.hitArea,
      sceneText().music,
      goTo,
      () => jukebox.setOpen(!jukebox.getSnapshot().open),
      (lit) => {
        this.lit = lit;
        this.draw();
      },
    );

    this.draw();
    this.unsubscribe = jukebox.subscribe(() => {
      const { playing } = jukebox.getSnapshot();
      if (playing === this.playing) return;
      this.playing = playing;
      this.draw();
      this.drawMeter();
    });
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

    if (this.lit) {
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
    jukebox.setProximity(this.reach.update(), this.lit);

    if (this.playing) {
      this.meterAt += delta / 130;
      this.drawMeter();
    }
  }

  destroy() {
    this.unsubscribe();
    this.reach.destroy();
    this.cabinet.destroy();
    this.meter.destroy();
    this.hitArea.destroy();
  }
}
