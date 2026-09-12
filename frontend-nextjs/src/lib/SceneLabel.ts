import * as Phaser from "phaser";

const INK = 0x1f2937;
const EDGE = 0x374151;
const STYLE = {
  fontSize: "13px",
  fontFamily: "VT323, monospace",
  color: "#ffffff",
  resolution: 2,
};

/**
 * The dark pill every label in the room is drawn as: a centred hint, or, with a
 * dot, a tag like the one over each player's head.
 */
export class SceneLabel {
  readonly container: Phaser.GameObjects.Container;
  readonly dot?: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private dotColor = EDGE;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    dot = false,
  ) {
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 0, "", STYLE).setOrigin(dot ? 0 : 0.5, 0.5);
    this.dot = dot ? scene.add.graphics() : undefined;
    this.container = scene.add.container(
      x,
      y,
      this.dot
        ? [this.background, this.dot, this.label]
        : [this.background, this.label],
    );
    this.setText(text);
  }

  get text(): string {
    return this.label.text;
  }

  setText(text: string): this {
    this.label.setText(text);
    this.draw();
    return this;
  }

  setDot(color: number): this {
    this.dotColor = color;
    this.draw();
    return this;
  }

  private draw() {
    const g = this.background;
    g.clear();

    if (!this.dot) {
      const width = this.label.width + 20;
      g.fillStyle(INK, 0.9);
      g.fillRoundedRect(-width / 2, -11, width, 22, 11);
      return;
    }

    const width = this.label.width + 32;
    const left = -width / 2;
    g.fillStyle(INK, 0.85);
    g.fillRoundedRect(left, -8, width, 16, 8);
    g.lineStyle(1, EDGE, 0.5);
    g.strokeRoundedRect(left, -8, width, 16, 8);
    this.dot.clear();
    this.dot.fillStyle(this.dotColor, 1);
    this.dot.fillCircle(left + 12, 0, 4);
    this.label.setPosition(left + 22, 0);
  }
}
