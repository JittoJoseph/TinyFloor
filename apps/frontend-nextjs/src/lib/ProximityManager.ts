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
  private proximityCards: Map<string, Phaser.GameObjects.Container> = new Map();
  private R_PROXIMITY = 2 * 32; // 2 tiles
  private activeCalls: Set<string> = new Set();

  constructor(scene: Phaser.Scene, wsManager: WebSocketManager, playerManager: PlayerManager, callManager: CallManager, currentPlayer: Phaser.Physics.Arcade.Sprite, playerId: string) {
    this.scene = scene;
    this.wsManager = wsManager;
    this.playerManager = playerManager;
    this.callManager = callManager;
    this.currentPlayer = currentPlayer;
    this.playerId = playerId;
  }

  update() {
    if (!this.currentPlayer) return; // Guard against undefined player

    this.playerManager.getPlayers().forEach((container, id) => {
      const distance = Phaser.Math.Distance.Between(
        this.currentPlayer.x,
        this.currentPlayer.y,
        container.x,
        container.y
      );

      if (distance <= this.R_PROXIMITY) {
        if (!this.proximityCards.has(id)) {
          this.createProximityCard(id, container);
        } else {
          this.updateProximityCard(id, container);
        }
      } else {
        if (this.proximityCards.has(id)) {
          this.destroyProximityCard(id);
        }
      }
    });

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
        if (distance > this.R_PROXIMITY + 32) { // R_DISCONNECT
          this.endCall(id, "distance");
        }
      }
    });
  }

  private createProximityCard(id: string, container: Phaser.GameObjects.Container) {
    const card = this.scene.add.container(container.x, container.y - 40);
    const bg = this.scene.add.rectangle(0, 0, 160, 50, 0xffffff, 0.95);
    bg.setStrokeStyle(2, 0x333333);
    card.add(bg);

    const videoBtn = this.scene.add.text(-60, 0, "Video", {
      fontSize: "12px",
      color: "#0066cc",
      fontStyle: "bold"
    });
    videoBtn.setInteractive();
    videoBtn.on("pointerdown", () => this.initiateCall(id, "video"));
    videoBtn.on("pointerover", () => videoBtn.setColor("#004499"));
    videoBtn.on("pointerout", () => videoBtn.setColor("#0066cc"));
    card.add(videoBtn);

    const audioBtn = this.scene.add.text(-10, 0, "Audio", {
      fontSize: "12px",
      color: "#0066cc",
      fontStyle: "bold"
    });
    audioBtn.setInteractive();
    audioBtn.on("pointerdown", () => this.initiateCall(id, "audio"));
    audioBtn.on("pointerover", () => audioBtn.setColor("#004499"));
    audioBtn.on("pointerout", () => audioBtn.setColor("#0066cc"));
    card.add(audioBtn);

    const chatBtn = this.scene.add.text(40, 0, "Chat", {
      fontSize: "12px",
      color: "#0066cc",
      fontStyle: "bold"
    });
    chatBtn.setInteractive();
    chatBtn.on("pointerdown", () => this.initiateChat());
    chatBtn.on("pointerover", () => chatBtn.setColor("#004499"));
    chatBtn.on("pointerout", () => chatBtn.setColor("#0066cc"));
    card.add(chatBtn);

    this.proximityCards.set(id, card);
    card.setDepth(30000);
  }

  private updateProximityCard(id: string, container: Phaser.GameObjects.Container) {
    const card = this.proximityCards.get(id);
    if (card) {
      card.setPosition(container.x, container.y - 40);
    }
  }

  destroyProximityCard(id: string) {
    const card = this.proximityCards.get(id);
    if (card) {
      card.destroy();
      this.proximityCards.delete(id);
    }
  }

  private initiateCall(toId: string, callType: string) {
    this.callManager.initiateCall(toId, callType);
  }

  private initiateChat() {
    // TODO: Implement chat
  }

  private endCall(toId: string, reason: string) {
    this.wsManager.send("call_ended", { from: this.playerId, to: toId, reason });
    this.activeCalls.delete(toId);
    // Clean up peer connection if needed
  }

  addActiveCall(id: string) {
    this.activeCalls.add(id);
  }

  destroy() {
    this.proximityCards.forEach(card => card.destroy());
    this.proximityCards.clear();
  }
}