import * as Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { callManager } from "./CallManager";
import { TILE_SIZE } from "./types";

const PROXIMITY_RADIUS = 2.5 * TILE_SIZE;
const DISCONNECT_RADIUS = PROXIMITY_RADIUS + 64;
const DWELL_TIME = 1000;

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
}

export class ProximityManager {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private currentPlayer: Phaser.Physics.Arcade.Sprite;
  private proximityStartTimes = new Map<string, number>();

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

    this.playerManager.getPlayers().forEach((container, id) => {
      const distance = Phaser.Math.Distance.Between(
        this.currentPlayer.x,
        this.currentPlayer.y,
        container.x,
        container.y,
      );

      if (distance > PROXIMITY_RADIUS) {
        this.proximityStartTimes.delete(id);
        if (distance > DISCONNECT_RADIUS && callManager.isPeer(id)) {
          callManager.hangUp(id);
        }
        return;
      }

      const since = this.proximityStartTimes.get(id) ?? now;
      this.proximityStartTimes.set(id, since);
      if (now - since < DWELL_TIME) return;

      nearby.push({
        id,
        name: this.playerManager.getPlayerName(id) || "Player",
        x: (container.x - camera.scrollX) * camera.zoom,
        y: (container.y - camera.scrollY) * camera.zoom,
        status: this.playerManager.getPlayerStatus(id) || "available",
      });
    });

    window.dispatchEvent(
      new CustomEvent("proximityUpdate", { detail: nearby }),
    );
  }

  destroy() {
    this.proximityStartTimes.clear();
  }
}
