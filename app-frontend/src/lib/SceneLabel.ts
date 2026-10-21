import * as Phaser from "phaser";
import type { NoteIcon } from "@shared/messages";
import { noteIconSvg } from "./noteIcons";
import { measure, plateLayer } from "./plates";

/** Past this many characters a name tag shortens to a first name and an initial. */
const LONGEST_TAG = 16;

/** The tag's type, in the floor's units (globals.css .plate). */
const FONT = "500 10.5px Geist, ui-sans-serif, system-ui, sans-serif";

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
 * dot, a tag like the one over each player's head, which hangs from the middle
 * of its bottom edge, so it grows upward, away from the head, when it's scaled.
 * A tag steps out of the way where the floor is crowded, keeps the whole name
 * for anyone asking, and can carry its person's note icon and a mark for music.
 *
 * It's HTML laid over the canvas (plates.ts), in the app's own type, sharp at
 * any screen density; the canvas draws at one pixel per CSS pixel, so text
 * drawn there is scaled up and soft on most screens. The Phaser container
 * stays as the label's place in the room: what moves, hides or fades it moves,
 * hides or fades the HTML in the same frame.
 */
export class SceneLabel {
  readonly container: Phaser.GameObjects.Container;
  /** A tag (with a status dot) rather than a hint. */
  readonly tag: boolean;
  private readonly root: HTMLDivElement;
  private readonly name: HTMLSpanElement;
  private readonly dotEl?: HTMLSpanElement;
  private iconEl?: HTMLSpanElement;
  private musicEl?: HTMLSpanElement;
  private icon: NoteIcon | null = null;
  private full = "";
  private crowded = false;
  private fade?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, dot = false) {
    this.tag = dot;
    this.container = scene.add.container(x, y);
    this.root = document.createElement("div");
    this.root.className = dot ? "plate plate-tag" : "plate plate-hint";
    if (dot) {
      this.dotEl = document.createElement("span");
      this.dotEl.className = "plate-dot";
      this.root.appendChild(this.dotEl);
    }
    this.name = document.createElement("span");
    this.name.className = "plate-name";
    this.root.appendChild(this.name);
    const remove = plateLayer(scene).add(this.container, this.root, dot ? "bottom" : "center");
    this.container.once(Phaser.GameObjects.Events.DESTROY, remove);
    this.setText(text);
  }

  get text(): string {
    return this.full;
  }

  /** How wide it is, in the floor's units before scaling. */
  get width(): number {
    const icon = this.icon ? 15 : 0;
    const music = this.musicEl && !this.musicEl.hidden ? 13 : 0;
    return measure(this.name.textContent ?? "", FONT) + (this.tag ? 22 : 18) + icon + music;
  }

  /** The note's icon at the tag's end, or none. */
  setIcon(icon: NoteIcon | null): this {
    if (!this.tag || icon === this.icon) return this;
    this.icon = icon;
    if (!this.iconEl) {
      this.iconEl = document.createElement("span");
      this.iconEl.className = "plate-icon";
      this.root.appendChild(this.iconEl);
    }
    this.iconEl.innerHTML = icon ? noteIconSvg(icon) : "";
    this.iconEl.hidden = !icon;
    return this;
  }

  /** Three bars moving to the music while they play some, after the name and the note's icon. */
  setListening(on: boolean): this {
    if (!this.tag || (!on && !this.musicEl)) return this;
    if (!this.musicEl) {
      this.musicEl = document.createElement("span");
      this.musicEl.className = "plate-music";
      this.musicEl.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
      this.root.appendChild(this.musicEl);
    }
    this.musicEl.hidden = !on;
    return this;
  }

  setText(text: string): this {
    this.full = text;
    const shown = this.tag ? tagName(text) : text;
    this.name.textContent = shown;
    this.root.hidden = !shown;
    return this;
  }

  /** Where it would cover a nearer tag it fades away, and back when there's room. */
  setCrowded(crowded: boolean): this {
    if (crowded === this.crowded) return this;
    this.crowded = crowded;
    this.fade?.stop();
    this.fade = this.container.scene.tweens.add({ targets: this.container, alpha: crowded ? 0 : 1, duration: 140 });
    return this;
  }

  setDot(color: number): this {
    if (this.dotEl) this.dotEl.style.background = `#${color.toString(16).padStart(6, "0")}`;
    return this;
  }
}
