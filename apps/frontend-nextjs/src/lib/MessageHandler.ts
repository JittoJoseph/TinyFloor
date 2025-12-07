import * as Phaser from 'phaser';
import { WebSocketManager, WebSocketMessage } from './WebSocketManager';
import { PlayerManager } from './PlayerManager';
import { ProximityManager } from './ProximityManager';
import { CallManager } from './CallManager';
import { AnimationManager, Direction } from './AnimationManager';

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
    }
  }

  private handleSpaceJoined(data: Record<string, unknown>) {
    if (!this.player) return; // Guard against destroyed player

    const spawnX = data.spawnX as number;
    const spawnY = data.spawnY as number;
    const sprite = data.sprite as string;
    const existingUsers = data.existingUsers as Array<{id: string; name: string; x: number; y: number; sprite: string}>;
    if (this.player) {
      this.player.setPosition(spawnX, spawnY);
      
      if (sprite) {
        const validSprites = ['Adam', 'Alex', 'Amelia', 'Bob'];
        const spriteName = validSprites.includes(sprite) ? sprite : 'Adam';
        this.player.setData('spriteName', spriteName);
        this.player.play(this.animationManager.getAnimationKey(spriteName, 'idle', 'down'));
      }
    }

    existingUsers.forEach((user) => {
      this.playerManager.addPlayer(user.id, user.name, user.x, user.y, user.sprite);
    });
  }

  private handleMovementRejected(data: Record<string, unknown>) {
    // This might need to be handled in MovementManager or GameScene
    // For now, leave as is
  }

  private handleMovement(data: Record<string, unknown>) {
    const { id, x, y, direction } = data as { id: string; x: number; y: number; direction: string };
    if (id !== this.playerId) {
      this.playerManager.updatePlayerPosition(id, x, y, direction as Direction);
    }
  }

  private handleUserLeft(data: Record<string, unknown>) {
    const { id } = data as { id: string };
    this.playerManager.removePlayer(id);
    this.proximityManager.destroyProximityCard(id);
    this.callManager.endCall(id, "user_left");
  }

  private handleUserJoin(data: Record<string, unknown>) {
    const { id, name, x, y, sprite } = data as { id: string; name: string; x: number; y: number; sprite: string };
    this.playerManager.addPlayer(id, name, x, y, sprite);
  }
}