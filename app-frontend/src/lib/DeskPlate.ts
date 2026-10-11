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
 * and not as someone standing there. Only up close, while the owner is away:
 * a floor of name cards would be noise, one on the desk you walk up to is not.
 */
export class DeskPlate {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private name: string | null = null;
  private near = false;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 0, "", STYLE).setOrigin(0.5, 0.5);
    this.container = scene.add.container(x, y, [this.background, this.label]).setDepth(depth).setAlpha(0).setVisible(false);
  }

  /** Whether you are close enough to read it. */
  setNear(near: boolean): this {
    if (near === this.near) return this;
    this.near = near;
    this.fade();
    return this;
  }

  /** Whose desk it says, or null for a free one, or one its owner is sitting at. */
  show(name: string | null): this {
    if (name === this.name) return this;
    this.name = name;
    if (name !== null) this.draw(name);
    this.fade();
    return this;
  }

  private fade() {
    const shown = this.near && this.name !== null;
    const scene = this.container.scene;
    scene.tweens.killTweensOf(this.container);
    if (shown) this.container.setVisible(true);
    scene.tweens.add({
      targets: this.container,
      alpha: shown ? 1 : 0,
      duration: 160,
      ease: "Cubic.easeOut",
      onComplete: () => this.container.setVisible(shown),
    });
  }

  private draw(name: string) {
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
  }

  destroy() {
    this.container.scene?.tweens.killTweensOf(this.container);
    this.container.destroy();
  }
}
