import * as Phaser from "phaser";
import { faceBackground } from "@/components/ui/Face";
import { statusColor } from "@/lib/status";
import { plateLayer } from "./plates";
import { tagName } from "./SceneLabel";
import type { SceneText } from "./sceneText";

const escape = (text: string) => text.replace(/[&<>"]/g, (character) => `&#${character.charCodeAt(0)};`);

/** Who a desk belongs to, as its plate shows them. */
export interface DeskOwner {
  userId: string;
  name: string;
  /** Your own desk: it says so instead of your name. */
  mine: boolean;
  /** Their status if they're in the office now (on the floor, just not at their desk), or null. */
  status: string | null;
}

/** A desk, drawn in the same strokes as the app's icons, for the claim chip. */
const DESK_GLYPH =
  '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.75 5.25h12.5M3.25 5.25v7.5M12.75 5.25v7.5M9 5.25v4.25h3.75"/></svg>';

/**
 * The chip on a claimed desk while its owner isn't sitting at it (docs/product.md):
 * their face, the same one they wear everywhere in the app, with a dot when
 * they're in the office, so the floor reads as a seating chart from across
 * the room. Walk up and it opens, smoothly, to their name; yours, ringed in
 * ink, opens to "Your desk", and pressing it walks you there from anywhere.
 *
 * A free desk, for someone who can claim one, offers itself only when it's
 * the one you mean: its chair is the one you're standing at, or the pointer
 * is on it. Then it's an action, not a card: a dark chip like the name tags,
 * with a desk and "Claim desk". HTML over the canvas (plates.ts).
 */
export class DeskPlate {
  private readonly anchor: Phaser.GameObjects.Container;
  private readonly root: HTMLDivElement;
  private readonly face: HTMLSpanElement;
  private readonly dot: HTMLSpanElement;
  private readonly name: HTMLSpanElement;
  private readonly chipAnchor: Phaser.GameObjects.Container;
  private readonly chip: HTMLDivElement;
  private readonly remove: () => void;
  private readonly removeChip: () => void;
  private owner: DeskOwner | null = null;
  private claimable = false;
  private near = false;
  /** You're at its chair. */
  private offered = false;
  /** The pointer is on its chair, or on the chip itself. */
  private pointed = false;
  private onChip = false;
  /** Claiming it while you have a desk: it asks, here on the desk, before yours is freed. */
  private asking = false;
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    /** Where the claim chip hangs: clear of whoever stands at the chair, their head and name. */
    chipY: number,
    depth: number,
    private readonly text: () => SceneText,
    goHome: () => void,
    actions: { claim: () => void; confirm: () => void; cancel: () => void },
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
    this.root.addEventListener("click", () => this.owner?.mine && goHome());
    this.remove = plateLayer(scene).add(this.anchor, this.root);

    this.chipAnchor = scene.add.container(x, chipY).setDepth(depth);
    this.chip = document.createElement("div");
    this.chip.className = "desk-claim";
    this.chip.hidden = true;
    this.chip.addEventListener("click", (event) => {
      if (this.owner || !this.claimable) return;
      const act = (event.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "claim") actions.claim();
      else if (act === "confirm") actions.confirm();
      else if (act === "cancel") actions.cancel();
    });
    this.render();
    // Moving from the chair onto the chip mustn't make it vanish on the way.
    this.chip.addEventListener("pointerenter", () => {
      this.onChip = true;
      this.refresh();
    });
    this.chip.addEventListener("pointerleave", () => {
      this.onChip = false;
      this.refresh();
    });
    this.removeChip = plateLayer(scene).add(this.chipAnchor, this.chip, "top");
  }

  /** Whether you are close enough to read whose it is. */
  setNear(near: boolean): this {
    if (near === this.near) return this;
    this.near = near;
    this.root.toggleAttribute("data-open", near);
    return this;
  }

  /** You're at its chair, and not sitting anywhere: a free desk offers itself. */
  setOffered(offered: boolean): this {
    if (offered === this.offered) return this;
    this.offered = offered;
    return this.refresh();
  }

  /** The pointer is on its chair. Leaving waits a moment, for the pointer to reach the chip. */
  setPointed(pointed: boolean): this {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.leaveTimer = null;
    if (pointed) {
      this.pointed = true;
      return this.refresh();
    }
    this.leaveTimer = setTimeout(() => {
      this.pointed = false;
      this.refresh();
    }, 160);
    return this;
  }

  /** Whether it's asking, on the desk, to free your desk for this one. */
  setAsking(asking: boolean): this {
    if (asking === this.asking) return this;
    this.asking = asking;
    this.render();
    return this.refresh();
  }

  /** The chip: "Claim desk", or the question, with the answers beside it. */
  private render() {
    const t = this.text();
    this.chip.toggleAttribute("data-asking", this.asking);
    this.chip.innerHTML = this.asking
      ? `<span class="desk-claim-ask"><strong>${escape(t.claimTitle)}</strong><span>${escape(t.claimNote)}</span></span>` +
        `<span class="desk-claim-row"><button type="button" data-act="cancel">${escape(t.cancel)}</button>` +
        `<button type="button" data-act="confirm" class="desk-claim-yes">${escape(t.claimConfirm)}</button></span>`
      : `<button type="button" data-act="claim" class="plate desk-claim-go">${DESK_GLYPH}<span>${escape(t.claimDesk)}</span></button>`;
  }

  /** Whose desk it is, or null for a free one (`claimable` if you could claim it), or one its owner is sitting at. */
  show(owner: DeskOwner | null, claimable = false): this {
    const before = this.owner;
    this.owner = owner;
    this.claimable = !owner && claimable;
    this.root.hidden = !owner;
    if (!owner) {
      this.render();
      return this.refresh();
    }
    this.refresh();
    if (before?.userId !== owner.userId) this.face.style.background = faceBackground(owner.userId);
    this.name.textContent = owner.mine ? this.text().yourDesk : tagName(owner.name);
    this.root.toggleAttribute("data-mine", owner.mine);
    this.root.toggleAttribute("data-open", this.near);
    this.dot.hidden = !owner.status;
    if (owner.status) this.dot.style.background = statusColor(owner.status);
    this.root.title = owner.mine ? this.text().yourDesk : owner.name;
    return this;
  }

  /** A free desk's chip shows while it's the one you mean. */
  private refresh(): this {
    this.chip.hidden = !(!this.owner && this.claimable && (this.asking || this.offered || this.pointed || this.onChip));
    return this;
  }

  destroy() {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.remove();
    this.removeChip();
    this.anchor.destroy();
    this.chipAnchor.destroy();
  }
}
