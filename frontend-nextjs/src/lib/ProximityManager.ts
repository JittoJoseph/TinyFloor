import * as Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { CallManager } from "./CallManager";
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
  private callManager: CallManager;
  private currentPlayer: Phaser.Physics.Arcade.Sprite;
  private activeCalls = new Set<string>();
  private proximityStartTimes = new Map<string, number>();
  private onStreamRemoved: EventListener;
  private onCallEnded: EventListener;

  constructor(
    scene: Phaser.Scene,
    playerManager: PlayerManager,
    callManager: CallManager,
    currentPlayer: Phaser.Physics.Arcade.Sprite,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.callManager = callManager;
    this.currentPlayer = currentPlayer;

    this.onStreamRemoved = ((e: CustomEvent) => {
      this.activeCalls.delete(e.detail.peerId);
    }) as EventListener;
    this.onCallEnded = () => this.activeCalls.clear();

    window.addEventListener("remoteStreamRemoved", this.onStreamRemoved);
    window.addEventListener("callEnded", this.onCallEnded);
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
        if (this.activeCalls.has(id) && distance > DISCONNECT_RADIUS) {
          this.endCall(id, "distance");
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

  initiateCall(toId: string, callType: "audio" | "video") {
    this.callManager.initiateCall(
      toId,
      callType,
      this.playerManager.getPlayerName(toId) || "Unknown User",
    );
    this.activeCalls.add(toId);
  }

  endCall(peerId: string, reason: string) {
    this.callManager.endCall(peerId, reason);
    this.activeCalls.delete(peerId);
  }

  destroy() {
    window.removeEventListener("remoteStreamRemoved", this.onStreamRemoved);
    window.removeEventListener("callEnded", this.onCallEnded);
    this.proximityStartTimes.clear();
    this.activeCalls.clear();
  }
}
