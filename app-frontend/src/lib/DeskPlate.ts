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

/** How long "Claimed" stays on the desk before its owner's plate takes over. */
const CLAIMED_MS = 1600;
/** While it asks, the question sits over everything on the floor, name tags and the face on the desk across included. */
const ASKING_DEPTH = 100002;

const glyph = (path: string, className: string) =>
  `<svg class="${className}" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
const PLUS = glyph("M8 3.75v8.5M3.75 8h8.5", "desk-claim-plus");
const CHECK = glyph("M3.75 8.4l2.6 2.5 5.9-6.15", "desk-claim-check");

/**
 * The chip on a claimed desk while its owner isn't sitting at it (docs/product.md):
 * their face, the same one they wear everywhere in the app, with a dot when
 * they're in the office, so the floor reads as a seating chart from across
 * the room. Walk up and it opens, smoothly, to their name; yours, ringed in
 * ink, opens to "Your desk", and pressing it walks you there from anywhere.
 *
 * A free desk, for someone who can claim one, offers itself while you sit at
 * it, and only then: an action, dark like the name tags, a plus in a dot and
 * "Claim desk", on the desk. Claiming one while you have one asks there, the chip
 * opening into the question. Claimed, the chip itself says so, the plus
 * turning into a check in a green dot, before your plate takes its place.
 * HTML over the canvas (plates.ts).
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
  /** You're sitting at it. */
  private offered = false;
  /** Claiming it while you have a desk: it asks, here on the desk, before yours is freed. */
  private asking = false;
  /** Just claimed: the chip says so for a moment. */
  private claimed = false;
  /** This claim has been said, so the store still holding it doesn't say it again. */
  private said = false;
  private claimedTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly depth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    /** Where the claim chip sits on the desk, and which way it grows when it asks: away from whoever stands at the chair. */
    chip: { y: number; hang: "top" | "bottom" },
    depth: number,
    private readonly text: () => SceneText,
    goHome: () => void,
    actions: { claim: () => void; confirm: () => void; cancel: () => void },
  ) {
    this.depth = depth;
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

    this.chipAnchor = scene.add.container(x, chip.y).setDepth(depth);
    this.chip = document.createElement("div");
    this.chip.className = "desk-claim";
    this.chip.dataset.hang = chip.hang;
    this.chip.hidden = true;
    this.chip.addEventListener("click", (event) => {
      if (this.claimed || this.owner || !this.claimable) return;
      const act = (event.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
      if (act === "claim") actions.claim();
      else if (act === "confirm") actions.confirm();
      else if (act === "cancel") actions.cancel();
    });
    this.render();
    this.removeChip = plateLayer(scene).add(this.chipAnchor, this.chip, chip.hang);
    // A press on a chip is that chip's, not the floor's: the floor also listens on the window, and would walk you there.
    for (const element of [this.root, this.chip]) {
      for (const type of ["pointerdown", "mousedown", "touchstart"]) element.addEventListener(type, (event) => event.stopPropagation());
    }
  }

  /** Whether you are close enough to read whose it is. */
  setNear(near: boolean): this {
    if (near === this.near) return this;
    this.near = near;
    this.root.toggleAttribute("data-open", near);
    return this;
  }

  /** You're sitting at it: a free desk offers itself. */
  setOffered(offered: boolean): this {
    if (offered === this.offered) return this;
    this.offered = offered;
    return this.refresh();
  }

  /** Kept as readable as the name tags when the camera pulls back, on a phone. */
  setClaimScale(scale: number): this {
    this.chipAnchor.setScale(scale);
    return this;
  }

  /** Whether it's asking, on the desk, to free your desk for this one. */
  setAsking(asking: boolean): this {
    if (asking === this.asking) return this;
    this.asking = asking;
    this.render();
    return this.refresh();
  }

  /** You've just claimed it: the chip turns to "Claimed" with a check, then gives way to your plate. */
  setClaimed(claimed: boolean): this {
    if (!claimed) {
      this.said = false;
      return this;
    }
    if (this.said) return this;
    this.said = true;
    this.claimed = true;
    this.asking = false;
    this.render();
    // A frame on the "claim" face first, so the change to "Claimed" is seen.
    requestAnimationFrame(() => this.chip.querySelector(".desk-claim-go")?.toggleAttribute("data-done", true));
    this.claimedTimer = setTimeout(() => {
      this.claimed = false;
      this.render();
      this.refresh();
      this.root.hidden = !this.owner;
    }, CLAIMED_MS);
    return this.refresh();
  }

  /** The chip: "Claim desk" (and "Claimed", ready to trade places), or the question with its answers. */
  private render() {
    const t = this.text();
    this.chip.toggleAttribute("data-asking", this.asking);
    this.chipAnchor.setDepth(this.asking ? ASKING_DEPTH : this.depth);
    this.chip.innerHTML = this.asking
      ? `<span class="desk-claim-ask"><strong>${escape(t.claimTitle)}</strong><span>${escape(t.claimNote)}</span></span>` +
        `<span class="desk-claim-row"><button type="button" data-act="cancel">${escape(t.cancel)}</button>` +
        `<button type="button" data-act="confirm" class="desk-claim-yes">${escape(t.claimConfirm)}</button></span>`
      : `<button type="button" data-act="claim" class="plate desk-claim-go">` +
        `<span class="desk-claim-dot">${PLUS}${CHECK}</span>` +
        `<span class="desk-claim-label"><span class="desk-claim-ready">${escape(t.claimDesk)}</span><span class="desk-claim-done">${escape(t.claimed)}</span></span>` +
        `</button>`;
  }

  /** Whose desk it is, or null for a free one (`claimable` if you could claim it), or one its owner is sitting at. */
  show(owner: DeskOwner | null, claimable = false): this {
    const before = this.owner;
    this.owner = owner;
    this.claimable = !owner && claimable;
    // While "Claimed" is showing, your plate waits its turn.
    this.root.hidden = !owner || this.claimed;
    if (!owner) {
      if (!this.claimed) this.render();
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

  /** The chip shows while it's the desk you mean, while it asks, and while it says it's yours. */
  private refresh(): this {
    this.chip.hidden = !(this.claimed || (!this.owner && this.claimable && (this.asking || this.offered)));
    return this;
  }

  destroy() {
    if (this.claimedTimer) clearTimeout(this.claimedTimer);
    this.remove();
    this.removeChip();
    this.anchor.destroy();
    this.chipAnchor.destroy();
  }
}
