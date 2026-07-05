import * as Phaser from "phaser";
import { WebSocketManager, WebSocketMessage } from "../lib/WebSocketManager";
import { PlayerManager } from "../lib/PlayerManager";
import { ProximityManager } from "../lib/ProximityManager";
import { CallManager } from "../lib/CallManager";
import { AnimationManager, Direction } from "../lib/AnimationManager";
import { MovementManager } from "../lib/MovementManager";
import { MapManager } from "../lib/MapManager";
import { MessageHandler } from "../lib/MessageHandler";
import { VirtualJoystickManager } from "../lib/VirtualJoystickManager";
import { tileToPixel } from "../lib/types";

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
  private virtualJoystickManager?: VirtualJoystickManager;
  private playerId: string;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private sceneReady: boolean = false;

  // Named event handlers for proper cleanup
  private handleSendChatMessage!: EventListener;
  private handleInitiateCall!: EventListener;
  private handleStatusChange!: EventListener;
  private handleChatFocused!: EventListener;
  private handleChatBlurred!: EventListener;

  constructor(
    private name: string,
    private roomId: string,
    private character: string,
    userId?: string | null,
  ) {
    super({ key: "GameScene" });
    this.playerId = userId || Phaser.Utils.String.UUID();
  }

  preload() {
    this.mapManager = new MapManager(this);
    this.mapManager.preload();

    this.animationManager = new AnimationManager(this);
    this.animationManager.preload();
  }

  create() {
    this.camera = this.cameras.main;
    this.animationManager.create();

    this.wsManager = new WebSocketManager(
      this.playerId,
      this.name,
      this.character,
    );
    this.playerManager = new PlayerManager(
      this,
      this.animationManager,
      this.playerId,
    );

    this.mapManager.create();
    const spawnTilePos = this.mapManager.getRandomSpawnPosition();
    const spawnPixel = tileToPixel(spawnTilePos.tileX, spawnTilePos.tileY);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    let wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (
      !wsBaseUrl ||
      (wsBaseUrl.includes("localhost") &&
        host !== "localhost" &&
        host !== "127.0.0.1")
    ) {
      wsBaseUrl = `${protocol}//${host}:8080`;
    }

    this.wsManager.connect(`${wsBaseUrl}/ws/${this.roomId}`, spawnTilePos);

    this.player = this.playerManager.createLocalPlayer(
      this.playerId,
      this.name,
      spawnPixel.x,
      spawnPixel.y,
      this.character,
    );

    const isMobile = !this.sys.game.device.os.desktop;
    this.movementManager = new MovementManager(
      this,
      this.player,
      this.animationManager,
      this.playerId,
      this.wsManager,
      isMobile,
    );

    this.sceneReady = true;

    this.callManager = new CallManager(this, this.wsManager, this.playerId);

    this.proximityManager = new ProximityManager(
      this,
      this.wsManager,
      this.playerManager,
      this.callManager,
      this.player,
      this.playerId,
    );

    this.mapManager.setupColliders(this.player);
    this.movementManager.setCollisionChecker((x: number, y: number) => {
      return this.mapManager.checkCollisionAt(x, y);
    });

    this.messageHandler = new MessageHandler(
      this,
      this.wsManager,
      this.playerManager,
      this.proximityManager,
      this.callManager,
      this.animationManager,
      this.playerId,
      this.player,
    );
    this.messageHandler.setSceneReady(true);
    this.wsManager.setOnMessage((msg: WebSocketMessage) => {
      this.messageHandler.handleMessage(msg);
    });

    this.cameras.main.setBounds(
      0,
      0,
      this.mapManager.getMapWidth(),
      this.mapManager.getMapHeight(),
    );
    this.cameras.main.startFollow(this.player);

    this.physics.world.setBounds(
      0,
      0,
      this.mapManager.getMapWidth(),
      this.mapManager.getMapHeight(),
    );

    this.camera.setZoom(1.2);
    this.camera.setDeadzone(200, 150);

    if (isMobile) {
      this.virtualJoystickManager = new VirtualJoystickManager(this);
    }

    this.handleSendChatMessage = ((event: CustomEvent) => {
      this.wsManager.send("chat", event.detail);
    }) as EventListener;

    this.handleInitiateCall = ((event: CustomEvent) => {
      const { playerId, type } = event.detail;
      this.proximityManager.initiateCall(playerId, type);
    }) as EventListener;

    this.handleStatusChange = ((event: CustomEvent) => {
      const { status } = event.detail;
      this.wsManager.send("status_change", { status });
      this.playerManager.updatePlayerStatus(this.playerId, status);
    }) as EventListener;

    this.handleChatFocused = () => this.movementManager.disableInput();
    this.handleChatBlurred = () => this.movementManager.enableInput();

    window.addEventListener("sendChatMessage", this.handleSendChatMessage);
    window.addEventListener("initiateCall", this.handleInitiateCall);
    window.addEventListener("statusChange", this.handleStatusChange);
    window.addEventListener("chatFocused", this.handleChatFocused);
    window.addEventListener("chatBlurred", this.handleChatBlurred);
  }

  update(_time: number, delta: number) {
    if (!this.player) return;

    this.playerManager.updateLocalPlayerNameTag(this.player.x, this.player.y);

    if (this.virtualJoystickManager) {
      const velocity = this.virtualJoystickManager.getVelocity();
      this.movementManager.setJoystickVelocity(velocity.x, velocity.y);
    } else {
      this.movementManager.setJoystickVelocity(0, 0);
    }

    this.movementManager.update(delta);
    this.proximityManager.update();
    this.playerManager.update();
  }

  public cleanup() {
    window.removeEventListener("sendChatMessage", this.handleSendChatMessage);
    window.removeEventListener("initiateCall", this.handleInitiateCall);
    window.removeEventListener("statusChange", this.handleStatusChange);
    window.removeEventListener("chatFocused", this.handleChatFocused);
    window.removeEventListener("chatBlurred", this.handleChatBlurred);

    this.wsManager.disconnect();
    this.playerManager.destroy();
    this.proximityManager.destroy();
    this.callManager.cleanup();
    this.virtualJoystickManager?.destroy();
  }
}

export default GameScene;
