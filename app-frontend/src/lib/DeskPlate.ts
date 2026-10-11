import * as Phaser from "phaser";
import { tagName } from "./SceneLabel";

const PAPER = 0xf4f1ea;
const RULE = 0xc9c2b4;
const STYLE = {
  fontSize: "12px",
  fontFamily: "VT323, monospace",
  color: "#2b2620",
  resolution: 2,
};

/**
 * The little card on a desk that says whose it is (docs/26): paper on the
 * desktop, not a dark tag like a person's, so it reads as part of the office
 * and not as someone standing there. Shown while the owner is away.
 */
export class DeskPlate {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 0, "", STYLE).setOrigin(0.5, 0.5);
    this.container = scene.add.container(x, y, [this.background, this.label]).setDepth(depth).setVisible(false);
  }

  show(name: string | null): this {
    if (name === null) {
      this.container.setVisible(false);
      return this;
    }
    this.label.setText(tagName(name));
    const width = Math.ceil(this.label.width) + 10;
    const g = this.background;
    g.clear();
    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(-width / 2, -6, width, 13, 2);
    g.fillStyle(PAPER, 1);
    g.fillRoundedRect(-width / 2, -7, width, 13, 2);
    g.lineStyle(1, RULE, 1);
    g.strokeRoundedRect(-width / 2, -7, width, 13, 2);
    this.container.setVisible(true);
    return this;
  }

  destroy() {
    this.container.destroy();
  }
}
