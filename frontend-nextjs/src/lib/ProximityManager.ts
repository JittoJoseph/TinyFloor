import * as Phaser from "phaser";
import { WebSocketManager } from "./WebSocketManager";
import { PlayerManager } from "./PlayerManager";
import { CallManager } from "./CallManager";

const PROXIMITY_CHECK_INTERVAL = 1000;
const PROXIMITY_DWELL_TIME = 1000;

export class ProximityManager {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private callManager: CallManager;
  private currentPlayer: Phaser.Physics.Arcade.Sprite;
  private playerId: string;
  private R_PROXIMITY = 2.5 * 32;
  private activeCalls = new Set<string>();
  private lastCheckTime = 0;
  private cachedNearbyData: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    status: string;
  }> = [];
  private proximityStartTimes = new Map<string, number>();

  constructor(
    scene: Phaser.Scene,
    wsManager: WebSocketManager,
    playerManager: PlayerManager,
    callManager: CallManager,
    currentPlayer: Phaser.Physics.Arcade.Sprite,
    playerId: string,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.callManager = callManager;
    this.currentPlayer = currentPlayer;
    this.playerId = playerId;

    window.addEventListener("remoteStreamRemoved", ((e: CustomEvent) => {
      this.activeCalls.delete(e.detail.peerId);
    }) as EventListener);

    window.addEventListener("callEnded", (() => {
      this.activeCalls.clear();
    }) as EventListener);
  }

  update() {
    if (!this.currentPlayer) return;

    const now = performance.now();
    if (now - this.lastCheckTime < PROXIMITY_CHECK_INTERVAL) {
      if (this.cachedNearbyData.length > 0) this.updateScreenPositions();
      return;
    }

    this.lastCheckTime = now;
    const nearbyData: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      status: string;
    }> = [];
    const camera = this.scene.cameras.main;
    const playerX = this.currentPlayer.x;
    const playerY = this.currentPlayer.y;
    const proximitySquared = this.R_PROXIMITY * this.R_PROXIMITY;

    this.playerManager.getPlayers().forEach((container, id) => {
      const dx = playerX - container.x;
      const dy = playerY - container.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= proximitySquared) {
        if (!this.proximityStartTimes.has(id)) {
          this.proximityStartTimes.set(id, now);
        }

        const timeInProximity = now - (this.proximityStartTimes.get(id) || 0);
        if (timeInProximity >= PROXIMITY_DWELL_TIME) {
          const relativeX = container.x - camera.scrollX;
          const relativeY = container.y - camera.scrollY;
          const screenX = relativeX * camera.zoom;
          const screenY = relativeY * camera.zoom;

          const playerLabel = this.playerManager.getPlayerLabels().get(id);
          const playerName = playerLabel?.text || "Player";
          const playerStatus =
            this.playerManager.getPlayerStatus(id) || "available";
          nearbyData.push({
            id,
            name: playerName,
            x: screenX,
            y: screenY,
            status: playerStatus,
          });
        }
      } else {
        this.proximityStartTimes.delete(id);
      }
    });

    this.cachedNearbyData = nearbyData;
    window.dispatchEvent(
      new CustomEvent("proximityUpdate", { detail: nearbyData }),
    );
    this.checkCallDistances();
  }

  private updateScreenPositions() {
    const camera = this.scene.cameras.main;
    const now = performance.now();
    const updatedNearbyData: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      status: string;
    }> = [];

    for (const data of this.cachedNearbyData) {
      const container = this.playerManager.getPlayers().get(data.id);
      if (container) {
        const playerX = this.currentPlayer.x;
        const playerY = this.currentPlayer.y;
        const dx = playerX - container.x;
        const dy = playerY - container.y;
        const distanceSquared = dx * dx + dy * dy;
        const proximitySquared = this.R_PROXIMITY * this.R_PROXIMITY;

        if (distanceSquared <= proximitySquared) {
          const timeInProximity =
            now - (this.proximityStartTimes.get(data.id) || 0);
          if (timeInProximity >= PROXIMITY_DWELL_TIME) {
            const relativeX = container.x - camera.scrollX;
            const relativeY = container.y - camera.scrollY;
            data.x = relativeX * camera.zoom;
            data.y = relativeY * camera.zoom;
            updatedNearbyData.push(data);
          }
        } else {
          this.proximityStartTimes.delete(data.id);
        }
      }
    }

    this.cachedNearbyData = updatedNearbyData;
    window.dispatchEvent(
      new CustomEvent("proximityUpdate", { detail: this.cachedNearbyData }),
    );
  }

  private checkCallDistances() {
    const disconnectDistanceSquared =
      (this.R_PROXIMITY + 64) * (this.R_PROXIMITY + 64);
    const playerX = this.currentPlayer.x;
    const playerY = this.currentPlayer.y;

    this.activeCalls.forEach((id) => {
      const container = this.playerManager.getPlayers().get(id);
      if (container) {
        const dx = playerX - container.x;
        const dy = playerY - container.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared > disconnectDistanceSquared) {
          this.endCall(id, "distance");
        }
      }
    });
  }

  initiateCall(toId: string, callType: "audio" | "video") {
    const playerLabel = this.playerManager.getPlayerLabels().get(toId);
    const peerName = playerLabel?.text || "Unknown User";
    this.callManager.initiateCall(toId, callType, peerName);
    this.activeCalls.add(toId);
  }

  initiateChat() {
    window.dispatchEvent(new Event("openChat"));
  }

  endCall(peerId: string, reason: string) {
    this.callManager.endCall(peerId, reason);
    this.activeCalls.delete(peerId);
  }

  destroyProximityCard(id: string) {
    // No-op for compatibility
  }

  destroy() {
    this.proximityStartTimes.clear();
  }
}
