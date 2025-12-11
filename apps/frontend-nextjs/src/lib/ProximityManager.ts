import * as Phaser from 'phaser';
import { WebSocketManager } from './WebSocketManager';
import { PlayerManager } from './PlayerManager';
import { CallManager } from './CallManager';

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

    const nearbyData: Array<{ id: string; name: string; x: number; y: number }> = [];

    this.playerManager.getPlayers().forEach((container, id) => {
      const distance = Phaser.Math.Distance.Between(
        this.currentPlayer.x,
        this.currentPlayer.y,
        container.x,
        container.y
      );

      if (distance <= this.R_PROXIMITY) {
        // Get screen coordinates for the player
        // We need to convert world coordinates to screen coordinates
        const camera = this.scene.cameras.main;
        
        // Calculate relative position to camera
        const relativeX = container.x - camera.scrollX;
        const relativeY = container.y - camera.scrollY;
        
        // Apply zoom
        const screenX = relativeX * camera.zoom;
        const screenY = relativeY * camera.zoom;

        // Get player name
        const playerLabel = this.playerManager.getPlayerLabels().get(id);
        const playerName = this.playerNames.get(id) || playerLabel?.text || 'Player';

        nearbyData.push({
            id,
            name: playerName,
            x: screenX,
            y: screenY
        });
      }
    });

    // Dispatch event with nearby players data
    window.dispatchEvent(new CustomEvent('proximityUpdate', { detail: nearbyData }));

    // Check for auto-end calls
    this.activeCalls.forEach((id) => {
      const container = this.playerManager.getPlayers().get(id);
      if (container) {
        const distance = Phaser.Math.Distance.Between(
          this.currentPlayer.x,
          this.currentPlayer.y,
          container.x,
          container.y
        );
        if (distance > this.R_PROXIMITY + 64) { // R_DISCONNECT - further distance
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