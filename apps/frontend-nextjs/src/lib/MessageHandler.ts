import * as Phaser from 'phaser';
import { WebSocketManager, WebSocketMessage } from './WebSocketManager';
import { PlayerManager } from './PlayerManager';
import { ProximityManager } from './ProximityManager';
import { CallManager } from './CallManager';
import { AnimationManager, Direction } from './AnimationManager';
import { tileToPixel, TILE_SIZE } from './types';

export class MessageHandler {
  private scene: Phaser.Scene;
  private wsManager: WebSocketManager;
  private playerManager: PlayerManager;
  private proximityManager: ProximityManager;
  private callManager: CallManager;
  private animationManager: AnimationManager;
  private playerId: string;
  private sceneReady: boolean = false;
  private player!: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    wsManager: WebSocketManager,
    playerManager: PlayerManager,
    proximityManager: ProximityManager,
    callManager: CallManager,
    animationManager: AnimationManager,
    playerId: string,
    player: Phaser.Physics.Arcade.Sprite
  ) {
    this.scene = scene;
    this.wsManager = wsManager;
    this.playerManager = playerManager;
    this.proximityManager = proximityManager;
    this.callManager = callManager;
    this.animationManager = animationManager;
    this.playerId = playerId;
    this.player = player;
  }

  setSceneReady(ready: boolean) {
    this.sceneReady = ready;
  }

  handleMessage(msg: WebSocketMessage) {
    if (!this.sceneReady) return;

    switch (msg.type) {
      case "space-joined":
        this.handleSpaceJoined(msg.data);
        break;
      case "movement-rejected":
        this.handleMovementRejected(msg.data);
        break;
      case "movement":
        this.handleMovement(msg.data);
        break;
      case "movements_batch":
        this.handleMovementsBatch(msg.data);
        break;
      case "user-left":
        this.handleUserLeft(msg.data);
        break;
      case "user-join":
        this.handleUserJoin(msg.data);
        break;
      case "incoming_call":
        this.callManager.handleIncomingCall(msg.data);
        break;
      case "call_response":
        this.callManager.handleCallResponse(msg.data);
        break;
      case "webrtc_signal":
        this.callManager.handleWebRTCSignal(msg.data);
        break;
      case "call_ended":
        this.callManager.handleCallEnded(msg.data);
        break;
      case "chat":
        this.handleChat(msg.data);
        break;
    }
  }

  private handleChat(data: Record<string, unknown>) {
    window.dispatchEvent(new CustomEvent("chatMessage", { detail: data }));
  }

  private handleSpaceJoined(data: Record<string, unknown>) {
    if (!this.player) return; // Guard against destroyed player

    // Server now sends tile coordinates
    const spawnTileX = data.tileX as number;
    const spawnTileY = data.tileY as number;
    const sprite = data.sprite as string;
    const existingUsers = data.existingUsers as Array<{id: string; name: string; tileX: number; tileY: number; sprite: string}>;
    
    if (this.player) {
      // Convert tile to pixel position
      const spawnPos = tileToPixel(spawnTileX, spawnTileY);
      this.player.setPosition(spawnPos.x, spawnPos.y);
      
      if (sprite) {
        const validSprites = ['Adam', 'Alex', 'Amelia', 'Bob'];
        const spriteName = validSprites.includes(sprite) ? sprite : 'Adam';
        this.player.setData('spriteName', spriteName);
        this.player.play(this.animationManager.getAnimationKey(spriteName, 'idle', 'down'));
      }
    }

    // Add existing players (using tile coordinates)
    existingUsers.forEach((user) => {
      this.playerManager.addPlayer(user.id, user.name, user.tileX, user.tileY, user.sprite);
    });
    this.dispatchPlayerList();
  }

  private handleMovementRejected(data: Record<string, unknown>) {
    // Server sends tile coordinates for correction
    const tileX = data.tileX as number;
    const tileY = data.tileY as number;
    
    if (this.player) {
      // Convert tile to pixel and smoothly correct position
      const targetPos = tileToPixel(tileX, tileY);
      this.scene.tweens.add({
        targets: this.player,
        x: targetPos.x,
        y: targetPos.y,
        duration: 150,
        ease: 'Power2',
      });
    }
  }

  private handleMovement(data: Record<string, unknown>) {
    // Single movement update (tile-based)
    const { id, tileX, tileY, direction } = data as { id: string; tileX: number; tileY: number; direction: string };
    if (id !== this.playerId) {
      this.playerManager.updatePlayerPosition(id, tileX, tileY, direction as Direction);
    }
  }

  private handleMovementsBatch(data: Record<string, unknown>) {
    // Batched movement updates (tile-based)
    const movements = data.movements as Array<{ id: string; tileX: number; tileY: number; direction: string }>;
    if (!movements) return;
    
    for (const movement of movements) {
      if (movement.id !== this.playerId) {
        this.playerManager.updatePlayerPosition(
          movement.id, 
          movement.tileX, 
          movement.tileY, 
          movement.direction as Direction
        );
      }
    }
  }

  private handleUserLeft(data: Record<string, unknown>) {
    const { id } = data as { id: string };
    this.playerManager.removePlayer(id);
    this.proximityManager.destroyProximityCard(id);
    this.callManager.endCall(id, "user_left");
    this.dispatchPlayerList();
  }

  private handleUserJoin(data: Record<string, unknown>) {
    // User join now uses tile coordinates
    const { id, name, tileX, tileY, sprite } = data as { id: string; name: string; tileX: number; tileY: number; sprite: string };
    this.playerManager.addPlayer(id, name, tileX, tileY, sprite);
    this.dispatchPlayerList();
  }

  private dispatchPlayerList() {
    const players = this.playerManager.getPlayerList();
    window.dispatchEvent(new CustomEvent("playerListUpdated", { detail: players }));
  }
}