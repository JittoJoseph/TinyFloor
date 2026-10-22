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
 * the room. Walk up and it opens, smoothly, to their name; yours, ringed in
 * ink, opens to "Your desk", and pressing it walks you there from anywhere.
 * A free desk, for someone who can claim one, shows a plate only as you walk
 * up: an empty place where a face would be, and "Claim desk". HTML over the
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
  private claimable = false;
  private near = false;
  private offering = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    depth: number,
    private readonly text: () => { yourDesk: string; claimDesk: string },
    goHome: () => void,
    claim: () => void,
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
    this.root.addEventListener("click", () => {
      if (this.owner?.mine) goHome();
      else if (!this.owner && this.claimable) claim();
    });
    this.remove = plateLayer(scene).add(this.anchor, this.root);
  }

  /**
   * Whether you are close enough to read it, and whether a free desk should
   * offer itself: not while you're sitting, settled somewhere already.
   */
  setNear(near: boolean, offering = true): this {
    if (near === this.near && offering === this.offering) return this;
    this.near = near;
    this.offering = offering;
    this.root.toggleAttribute("data-open", near);
    if (!this.owner) this.root.hidden = !this.offered();
    return this;
  }

  private offered(): boolean {
    return this.claimable && this.near && this.offering;
  }

  /** Whose desk it is, or null for a free one (`claimable` if you could claim it), or one its owner is sitting at. */
  show(owner: DeskOwner | null, claimable = false): this {
    const before = this.owner;
    this.owner = owner;
    this.claimable = !owner && claimable;
    this.root.toggleAttribute("data-free", this.claimable);
    if (!owner) {
      this.root.hidden = !this.offered();
      this.face.style.background = "";
      this.dot.hidden = true;
      this.name.textContent = this.text().claimDesk;
      this.root.toggleAttribute("data-mine", false);
      this.root.title = this.text().claimDesk;
      return this;
    }
    this.root.hidden = false;
    if (before?.userId !== owner.userId) this.face.style.background = faceBackground(owner.userId);
    this.name.textContent = owner.mine ? this.text().yourDesk : tagName(owner.name);
    this.root.toggleAttribute("data-mine", owner.mine);
    this.root.toggleAttribute("data-open", this.near);
    this.dot.hidden = !owner.status;
    if (owner.status) this.dot.style.background = statusColor(owner.status);
    this.root.title = owner.mine ? this.text().yourDesk : owner.name;
    return this;
  }

  destroy() {
    this.remove();
    this.anchor.destroy();
  }
}
