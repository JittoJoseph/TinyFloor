import * as Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { TILE_SIZE } from "./types";

const PROXIMITY_RADIUS = 2.5 * TILE_SIZE;
const DWELL_TIME = 1000;
const BODY_OFFSET = 82;

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
}

export class ProximityManager {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private currentPlayer: Phaser.Physics.Arcade.Sprite;
  private proximityStartTimes = new Map<string, number>();
  private lastSignature = "";

  constructor(
    scene: Phaser.Scene,
    playerManager: PlayerManager,
    currentPlayer: Phaser.Physics.Arcade.Sprite,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.currentPlayer = currentPlayer;
  }

  update() {
    if (!this.currentPlayer) return;

    const now = performance.now();
    const camera = this.scene.cameras.main;
    const nearby: NearbyPlayer[] = [];
    let signature = "";

    this.playerManager.getPlayers().forEach((container, id) => {
      const distance = Phaser.Math.Distance.Between(
        this.currentPlayer.x,
        this.currentPlayer.y,
        container.x,
        container.y,
      );

      if (distance > PROXIMITY_RADIUS) {
        this.proximityStartTimes.delete(id);
        return;
      }

      const since = this.proximityStartTimes.get(id) ?? now;
      this.proximityStartTimes.set(id, since);
      if (now - since < DWELL_TIME) return;

      const view = camera.worldView;
      const x = Math.round((container.x - view.x) * camera.zoom);
      const y = Math.round((container.y - BODY_OFFSET - view.y) * camera.zoom);
      const status = this.playerManager.getPlayerStatus(id) || "available";

      nearby.push({
        id,
        name: this.playerManager.getPlayerName(id) || "Player",
        x,
        y,
        status,
        guest: this.playerManager.isGuest(id),
      });
      signature += id + x + "," + y + status + "|";
    });

    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    window.dispatchEvent(
      new CustomEvent("proximityUpdate", { detail: nearby }),
    );
  }

  destroy() {
    this.proximityStartTimes.clear();
    this.lastSignature = "";
  }
}
