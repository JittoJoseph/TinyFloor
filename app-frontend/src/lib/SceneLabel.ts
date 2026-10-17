import * as Phaser from "phaser";

const INK = 0x1f2937;
/** A folded tag: the dot in a small round pill. */
const FOLDED = 16;
const EDGE = 0x374151;
const STYLE = {
  fontSize: "13px",
  fontFamily: "VT323, monospace",
  color: "#ffffff",
  resolution: 2,
};

/** Emoji drawn by the system's own font, since the pixel font has none. */
const EMOJI_STYLE = {
  fontSize: "11px",
  fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif",
  resolution: 2,
};

/** Past this many characters a name tag shortens to a first name and an initial. */
const LONGEST_TAG = 16;

/** "Maximilian Schwarzenegger-Hoffmann" as "Maximilian S.": a tag's job is telling people apart. */
export function tagName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= LONGEST_TAG) return trimmed;
  const [first, ...rest] = trimmed.split(/\s+/);
  const short = rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  return short.length <= LONGEST_TAG ? short : `${first.slice(0, LONGEST_TAG - 1)}…`;
}

/**
 * The dark pill every label in the room is drawn as: a centred hint, or, with a
 * dot, a tag like the one over each player's head. A tag can fold down to its
 * dot where the floor is crowded, and keeps the whole name for anyone asking.
 * A tag can carry the emoji of its person's status note at its end.
 */
export class SceneLabel {
  readonly container: Phaser.GameObjects.Container;
  readonly dot?: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private emoji?: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private dotColor = EDGE;
  private full = "";
  private folded = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    dot = false,
  ) {
    this.scene = scene;
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
    return this.full;
  }

  /** How wide it is with its name showing, before scaling. */
  get fullWidth(): number {
    return this.label.width + (this.dot ? 32 : 20) + this.emojiWidth;
  }

  private get emojiWidth(): number {
    // Counted whether or not it's showing, so a tag doesn't fold and unfold over its own emoji.
    return this.emoji?.text ? this.emoji.width + 3 : 0;
  }

  /** The emoji at the tag's end, or none. */
  setEmoji(emoji: string | null): this {
    if (!this.dot) return this;
    if (!emoji && !this.emoji) return this;
    if (!this.emoji) {
      this.emoji = this.scene.add.text(0, 0, "", EMOJI_STYLE).setOrigin(0, 0.5);
      this.container.add(this.emoji);
    }
    this.emoji.setText(emoji ?? "");
    this.emoji.setVisible(!!emoji && !this.folded);
    this.draw();
    return this;
  }

  private get width(): number {
    return this.folded ? FOLDED : this.fullWidth;
  }

  setText(text: string): this {
    this.full = text;
    this.label.setText(this.dot ? tagName(text) : text);
    this.draw();
    return this;
  }

  /** Just the dot, or the dot and the name. */
  setFolded(folded: boolean): this {
    if (folded === this.folded) return this;
    this.folded = folded;
    this.label.setVisible(!folded);
    this.emoji?.setVisible(!folded && !!this.emoji.text);
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

    const width = this.width;
    const left = -width / 2;
    g.fillStyle(INK, 0.85);
    g.fillRoundedRect(left, -8, width, 16, 8);
    g.lineStyle(1, EDGE, 0.5);
    g.strokeRoundedRect(left, -8, width, 16, 8);
    this.dot.clear();
    this.dot.fillStyle(this.dotColor, 1);
    this.dot.fillCircle(this.folded ? 0 : left + 12, 0, 4);
    this.label.setPosition(left + 22, 0);
    this.emoji?.setPosition(left + 22 + this.label.width + 2, 0);
  }
}
