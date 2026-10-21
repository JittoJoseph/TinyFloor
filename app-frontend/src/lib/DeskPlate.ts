import * as Phaser from "phaser";
import { faceBackground } from "@/components/ui/Face";
import { statusColor } from "@/lib/status";
import { plateLayer } from "./plates";
import { tagName } from "./SceneLabel";

/** Who a desk belongs to, as its plate shows them. */
export interface DeskOwner {
  userId: string;
  name: string;
  /** Your own desk: it says so instead of your name. */
  mine: boolean;
  /** Their status if they're in the office now (on the floor, just not at their desk), or null. */
  status: string | null;
}

/**
 * The chip on a claimed desk while its owner isn't sitting at it (docs/product.md):
 * their face, the same one they wear everywhere in the app, with a dot when
 * they're in the office, so the floor reads as a seating chart from across
 * the room. Walk up and it opens to their name; yours says "Your desk" and
 * shows from anywhere, so you can find it. A free desk has none. HTML over the
 * canvas (plates.ts), like the name tags.
 */
export class DeskPlate {
  private readonly anchor: Phaser.GameObjects.Container;
  private readonly root: HTMLDivElement;
  private readonly face: HTMLSpanElement;
  private readonly dot: HTMLSpanElement;
  private readonly name: HTMLSpanElement;
  private readonly remove: () => void;
  private owner: DeskOwner | null = null;
  private near = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    depth: number,
    private readonly yourDesk: () => string,
  ) {
    this.anchor = scene.add.container(x, y).setDepth(depth);
    this.root = document.createElement("div");
    this.root.className = "desk-plate";
    this.root.hidden = true;
    this.face = document.createElement("span");
    this.face.className = "desk-plate-face";
    this.dot = document.createElement("span");
    this.dot.className = "desk-plate-dot";
    this.face.appendChild(this.dot);
    this.name = document.createElement("span");
    this.name.className = "desk-plate-name";
    this.root.append(this.face, this.name);
    this.remove = plateLayer(scene).add(this.anchor, this.root);
  }

  /** Whether you are close enough to read it. */
  setNear(near: boolean): this {
    if (near === this.near) return this;
    this.near = near;
    this.root.toggleAttribute("data-open", near || !!this.owner?.mine);
    return this;
  }

  /** Whose desk it is, or null for a free one, or one its owner is sitting at. */
  show(owner: DeskOwner | null): this {
    const before = this.owner;
    this.owner = owner;
    this.root.hidden = !owner;
    if (!owner) return this;
    if (before?.userId !== owner.userId) this.face.style.background = faceBackground(owner.userId);
    this.name.textContent = owner.mine ? this.yourDesk() : tagName(owner.name);
    this.root.toggleAttribute("data-mine", owner.mine);
    this.root.toggleAttribute("data-open", this.near || owner.mine);
    this.dot.hidden = !owner.status;
    if (owner.status) this.dot.style.background = statusColor(owner.status);
    this.root.title = owner.mine ? this.yourDesk() : owner.name;
    return this;
  }

  destroy() {
    this.remove();
    this.anchor.destroy();
  }
}
