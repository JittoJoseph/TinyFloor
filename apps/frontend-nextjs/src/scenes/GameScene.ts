import * as Phaser from 'phaser';
import { WebSocketManager, WebSocketMessage } from '../lib/WebSocketManager';
import { PlayerManager } from '../lib/PlayerManager';
import { ProximityManager } from '../lib/ProximityManager';
import { CallManager } from '../lib/CallManager';
import { AnimationManager, Direction } from '../lib/AnimationManager';
import { MovementManager } from '../lib/MovementManager';
import { MapManager } from '../lib/MapManager';
import { MessageHandler } from '../lib/MessageHandler';

class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private wsManager!: WebSocketManager;
  private playerManager!: PlayerManager;
  private proximityManager!: ProximityManager;
  private callManager!: CallManager;
  private animationManager!: AnimationManager;
  private movementManager!: MovementManager;
  private mapManager!: MapManager;
  private messageHandler!: MessageHandler;
  private playerId: string;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private sceneReady: boolean = false;

  constructor(private name: string, private roomId: string, private character: string) {
    super({ key: "GameScene" });
    this.playerId = Phaser.Utils.String.UUID();
  }

  preload() {
    this.mapManager = new MapManager(this);
    this.mapManager.preload();

    this.animationManager = new AnimationManager(this);
    this.animationManager.preload();

    this.load.on("loaderror", (file: unknown) => {
      console.error("Failed to load file:", file);
    });
  }

  create() {
    this.camera = this.cameras.main;

    this.animationManager.create();

    this.wsManager = new WebSocketManager(this.playerId, this.name, this.character);
    this.playerManager = new PlayerManager(this, this.animationManager);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const defaultWsUrl = `${protocol}//${host}:8080`;
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl}/ws/${this.roomId}`;
    this.wsManager.connect(wsUrl);

    this.mapManager.create();

    this.player = this.playerManager.createLocalPlayer(this.playerId, this.name, 5 * 32 + 16, 5 * 32 + 16, this.character);

    this.movementManager = new MovementManager(this, this.player, this.animationManager, this.playerId, this.wsManager);

    this.sceneReady = true;

    this.callManager = new CallManager(this, this.wsManager, this.playerId);

    this.proximityManager = new ProximityManager(this, this.wsManager, this.playerManager, this.callManager, this.player, this.playerId);

    this.mapManager.setupColliders(this.player);

    this.messageHandler = new MessageHandler(this, this.wsManager, this.playerManager, this.proximityManager, this.callManager, this.animationManager, this.playerId, this.player);
    this.messageHandler.setSceneReady(true);
    this.wsManager.setOnMessage((msg: WebSocketMessage) => {
      this.messageHandler.handleMessage(msg);
    });

    // Set camera bounds
    this.cameras.main.setBounds(0, 0, this.mapManager.getMapWidth(), this.mapManager.getMapHeight());
    this.cameras.main.startFollow(this.player);

    // Set physics world bounds
    this.physics.world.setBounds(0, 0, this.mapManager.getMapWidth(), this.mapManager.getMapHeight());

    // Set camera zoom and deadzone for better view
    this.camera.setZoom(1.2);
    this.camera.setDeadzone(200, 150);
  }

  update() {
    if (!this.player) return;

    // Update player label
    const label = this.playerManager.getPlayerLabels().get(this.playerId);
    if (label) {
      label.setPosition(this.player.x, this.player.y - 20);
    }

    // Handle movement
    const { moved } = this.movementManager.update();

    if (moved && this.wsManager) {
      this.movementManager.sendMovement();
    }

    // Update proximity
    if (this.proximityManager) {
      this.proximityManager.update();
    }

    // Update remote player positions and animations
    if (this.playerManager) {
      this.playerManager.update();
    }
  }

  public cleanup() {
    this.wsManager.disconnect();
    this.playerManager.destroy();
    this.proximityManager.destroy();
    this.callManager.cleanup();
  }
}

export default GameScene;