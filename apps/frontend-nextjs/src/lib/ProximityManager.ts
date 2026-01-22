import * as Phaser from "phaser";
import { WebSocketManager } from "./WebSocketManager";
import { PlayerManager } from "./PlayerManager";
import { CallManager } from "./CallManager";

// Optimization: Only check proximity every N milliseconds
const PROXIMITY_CHECK_INTERVAL = 1000; // 1 times per second instead of 60
const PROXIMITY_DWELL_TIME = 1000; // Show cards only after player has been nearby for 1.5 seconds

export class ProximityManager {
  private scene: Phaser.Scene;
  private wsManager: WebSocketManager;
  private playerManager: PlayerManager;
  private callManager: CallManager;
  private currentPlayer: Phaser.Physics.Arcade.Sprite;
  private playerId: string;
  private nearbyPlayers: Set<string> = new Set();
  private R_PROXIMITY = 2.5 * 32; // 2.5 tiles
  private activeCalls: Set<string> = new Set();
  private playerNames: Map<string, string> = new Map();

  // Throttling
  private lastCheckTime = 0;
  private cachedNearbyData: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
  }> = [];
  private proximityStartTimes: Map<string, number> = new Map(); // Track when players entered proximity

  constructor(
    scene: Phaser.Scene,
    wsManager: WebSocketManager,
    playerManager: PlayerManager,
    callManager: CallManager,
    currentPlayer: Phaser.Physics.Arcade.Sprite,
    playerId: string,
  ) {
    this.scene = scene;
    this.wsManager = wsManager;
    this.playerManager = playerManager;
    this.callManager = callManager;
    this.currentPlayer = currentPlayer;
    this.playerId = playerId;
  }

  setPlayerName(playerId: string, name: string) {
    this.playerNames.set(playerId, name);
  }

  update() {
    if (!this.currentPlayer) return;

    const now = performance.now();

    // Throttle proximity checks
    if (now - this.lastCheckTime < PROXIMITY_CHECK_INTERVAL) {
      // Use cached data for UI updates
      if (this.cachedNearbyData.length > 0) {
        this.updateScreenPositions();
      }
      return;
    }

    this.lastCheckTime = now;
    const nearbyData: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
    }> = [];
    const camera = this.scene.cameras.main;
    const playerX = this.currentPlayer.x;
    const playerY = this.currentPlayer.y;
    const proximitySquared = this.R_PROXIMITY * this.R_PROXIMITY; // Avoid sqrt

    this.playerManager.getPlayers().forEach((container, id) => {
      // Use squared distance to avoid expensive sqrt
      const dx = playerX - container.x;
      const dy = playerY - container.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= proximitySquared) {
        // Player is in proximity - track when they entered
        const now = performance.now();
        if (!this.proximityStartTimes.has(id)) {
          this.proximityStartTimes.set(id, now);
        }

        // Only include players who have been nearby for the dwell time
        const timeInProximity = now - (this.proximityStartTimes.get(id) || 0);
        if (timeInProximity >= PROXIMITY_DWELL_TIME) {
          // Calculate screen coordinates
          const relativeX = container.x - camera.scrollX;
          const relativeY = container.y - camera.scrollY;
          const screenX = relativeX * camera.zoom;
          const screenY = relativeY * camera.zoom;

          const playerLabel = this.playerManager.getPlayerLabels().get(id);
          const playerName =
            this.playerNames.get(id) || playerLabel?.text || "Player";

          nearbyData.push({ id, name: playerName, x: screenX, y: screenY });
        }
      } else {
        // Player is no longer in proximity - remove from tracking
        this.proximityStartTimes.delete(id);
      }
    });

    this.cachedNearbyData = nearbyData;
    window.dispatchEvent(
      new CustomEvent("proximityUpdate", { detail: nearbyData }),
    );

    // Check for auto-end calls (less frequently)
    this.checkCallDistances();
  }

  private updateScreenPositions() {
    const camera = this.scene.cameras.main;
    const now = performance.now();

    // Update screen positions for cached nearby players
    const updatedNearbyData: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
    }> = [];

    for (const data of this.cachedNearbyData) {
      const container = this.playerManager.getPlayers().get(data.id);
      if (container) {
        // Check if player is still in proximity and has met dwell time
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
            // Update screen coordinates
            const relativeX = container.x - camera.scrollX;
            const relativeY = container.y - camera.scrollY;
            data.x = relativeX * camera.zoom;
            data.y = relativeY * camera.zoom;
            updatedNearbyData.push(data);
          }
        } else {
          // Player moved out of proximity
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
    this.callManager.initiateCall(toId, callType);
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
    // Cleanup
  }
}
