import * as Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { toCss } from "./plates";
import { TILE_SIZE } from "web-shared/lib/types";
import type { StatusNote } from "shared-protocol/messages";
import { cardWidth, placeCard } from "./proximity";

const PROXIMITY_RADIUS = 2.5 * TILE_SIZE;
const DWELL_TIME = 1000;
/** How long you've stood still before the actions come: a beat, so a pause mid-walk doesn't flash them. */
const SETTLE_TIME = 220;

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
  note: StatusNote | null;
}

export class ProximityManager {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private currentPlayer: Phaser.GameObjects.Sprite;
  private reachable: (id: string) => boolean;
  private proximityStartTimes = new Map<string, number>();
  private lastSignature = "";
  private stillSince: number | null = null;

  /** `reachable` rules out people it makes no sense to call right now. */
  constructor(
    scene: Phaser.Scene,
    playerManager: PlayerManager,
    currentPlayer: Phaser.GameObjects.Sprite,
    reachable: (id: string) => boolean,
    /** Whether you're standing still. */
    private still: () => boolean,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.currentPlayer = currentPlayer;
    this.reachable = reachable;
  }

  /**
   * Who you're standing with: the nearest person within reach, once you've
   * stood still a moment (passing by asks nothing of anyone). Their name tag
   * gives way to what you can do with them, which is placed on it every frame.
   */
  update() {
    if (!this.currentPlayer) return;

    const now = performance.now();
    if (this.still()) this.stillSince ??= now;
    else this.stillSince = null;
    const settled = this.stillSince !== null && now - this.stillSince >= SETTLE_TIME;

    let nearest: { id: string; distance: number } | null = null;
    this.playerManager.getPlayers().forEach((container, id) => {
      const distance = Phaser.Math.Distance.Between(this.currentPlayer.x, this.currentPlayer.y, container.x, container.y);
      if (distance > PROXIMITY_RADIUS || !this.reachable(id)) {
        this.proximityStartTimes.delete(id);
        return;
      }
      const since = this.proximityStartTimes.get(id) ?? now;
      this.proximityStartTimes.set(id, since);
      if (now - since < DWELL_TIME) return;
      if (!nearest || distance < nearest.distance) nearest = { id, distance };
    });

    const id = settled ? (nearest as { id: string } | null)?.id ?? null : null;
    const at = id ? this.playerManager.tagCenter(id) : null;
    const nearby: NearbyPlayer[] = [];
    let signature = "";
    if (id && at) {
      const { x, y } = toCss(this.scene, at.x, at.y);
      // Where their tag is on screen goes straight onto the actions, every frame (lib/proximity).
      placeCard(id, x, y);
      const status = this.playerManager.getPlayerStatus(id) || "available";
      const note = this.playerManager.getPlayerNote(id);
      const name = this.playerManager.getPlayerName(id) || "Player";
      nearby.push({ id, name, x, y, status, guest: this.playerManager.isGuest(id), note });
      // Who it is and how they are: what React renders. Not where, which moves every frame.
      signature = id + status + name + (note ? note.icon + note.text : "");
    }
    this.playerManager.holdTag(id && at ? id : null, cardWidth());

    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    window.dispatchEvent(new CustomEvent("proximityUpdate", { detail: nearby }));
  }

  destroy() {
    this.playerManager.holdTag(null);
    this.proximityStartTimes.clear();
    this.lastSignature = "";
  }
}
