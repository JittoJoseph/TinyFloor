import * as Phaser from 'phaser';
import { WebSocketManager } from './WebSocketManager';
import { PlayerManager } from './PlayerManager';
import { CallManager } from './CallManager';

// Optimization: Only check proximity every N milliseconds
const PROXIMITY_CHECK_INTERVAL = 100; // 10 times per second instead of 60

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
  private cachedNearbyData: Array<{ id: string; name: string; x: number; y: number }> = [];

  constructor(scene: Phaser.Scene, wsManager: WebSocketManager, playerManager: PlayerManager, callManager: CallManager, currentPlayer: Phaser.Physics.Arcade.Sprite, playerId: string) {
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
    const nearbyData: Array<{ id: string; name: string; x: number; y: number }> = [];
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
        // Calculate screen coordinates
        const relativeX = container.x - camera.scrollX;
        const relativeY = container.y - camera.scrollY;
        const screenX = relativeX * camera.zoom;
        const screenY = relativeY * camera.zoom;

        const playerLabel = this.playerManager.getPlayerLabels().get(id);
        const playerName = this.playerNames.get(id) || playerLabel?.text || 'Player';

        nearbyData.push({ id, name: playerName, x: screenX, y: screenY });
      }
    });

    this.cachedNearbyData = nearbyData;
    window.dispatchEvent(new CustomEvent('proximityUpdate', { detail: nearbyData }));

    // Check for auto-end calls (less frequently)
    this.checkCallDistances();
  }
  
  private updateScreenPositions() {
    const camera = this.scene.cameras.main;
    
    // Update screen positions for cached nearby players
    for (const data of this.cachedNearbyData) {
      const container = this.playerManager.getPlayers().get(data.id);
      if (container) {
        const relativeX = container.x - camera.scrollX;
        const relativeY = container.y - camera.scrollY;
        data.x = relativeX * camera.zoom;
        data.y = relativeY * camera.zoom;
      }
    }
    
    window.dispatchEvent(new CustomEvent('proximityUpdate', { detail: this.cachedNearbyData }));
  }
  
  private checkCallDistances() {
    const disconnectDistanceSquared = (this.R_PROXIMITY + 64) * (this.R_PROXIMITY + 64);
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

  initiateCall(toId: string, callType: 'audio' | 'video') {
    this.callManager.initiateCall(toId, callType);
    this.activeCalls.add(toId);
  }

  initiateChat() {
    window.dispatchEvent(new Event('openChat'));
  }

  endCall(peerId: string, reason: string) {
    this.callManager.endCall(peerId, reason);
    this.activeCalls.delete(peerId);
  }

  destroyProximityCard(id: string) {
    // No-op for compatibility
  }

  destroy() {
    // Cleanup
  }
}