import * as Phaser from "phaser";
import { WebSocketManager, WebSocketMessage } from "../lib/WebSocketManager";
import { PlayerManager } from "../lib/PlayerManager";
import { ProximityManager } from "../lib/ProximityManager";
import { callManager } from "../lib/CallManager";
import { AnimationManager } from "../lib/AnimationManager";
import { MovementManager } from "../lib/MovementManager";
import { MapManager } from "../lib/MapManager";
import { MessageHandler } from "../lib/MessageHandler";
import { VirtualJoystickManager } from "../lib/VirtualJoystickManager";
import { tileToPixel } from "../lib/types";

const CAMERA_LERP = 0.08;

class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private wsManager!: WebSocketManager;
  private playerManager!: PlayerManager;
  private proximityManager!: ProximityManager;
  private animationManager!: AnimationManager;
  private movementManager!: MovementManager;
  private mapManager!: MapManager;
  private messageHandler!: MessageHandler;
  private virtualJoystickManager?: VirtualJoystickManager;
  private playerId: string;
  private windowListeners: Array<[string, EventListener]> = [];

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
    this.animationManager.create();
    this.mapManager.create();

    const nav = this.mapManager.getNavGrid();
    const spawnTile = this.mapManager.getRandomSpawnTile();
    const spawn = tileToPixel(spawnTile.tileX, spawnTile.tileY);

    this.wsManager = new WebSocketManager(
      this.playerId,
      this.name,
      this.character,
    );
    this.wsManager.connect(`${this.getWsBaseUrl()}/ws/${this.roomId}`, spawnTile);

    this.playerManager = new PlayerManager(
      this,
      this.animationManager,
      nav,
      this.playerId,
    );
    this.player = this.playerManager.createLocalPlayer(
      this.playerId,
      this.name,
      spawn.x,
      spawn.y,
      this.character,
    );
    this.mapManager.setupColliders(this.player);

    if (!this.sys.game.device.os.desktop) {
      this.virtualJoystickManager = new VirtualJoystickManager(this);
    }

    this.movementManager = new MovementManager(
      this,
      this.player,
      this.animationManager,
      this.wsManager,
      nav,
      (x, y) => this.mapManager.checkCollisionAt(x, y),
      this.virtualJoystickManager,
    );

    callManager.attach(this.wsManager, this.playerId);
    this.proximityManager = new ProximityManager(
      this,
      this.playerManager,
      this.player,
    );

    this.messageHandler = new MessageHandler(
      this,
      this.playerManager,
      this.animationManager,
      this.playerId,
      this.player,
    );
    this.wsManager.setOnMessage((msg: WebSocketMessage) =>
      this.messageHandler.handleMessage(msg),
    );

    const mapWidth = this.mapManager.getMapWidth();
    const mapHeight = this.mapManager.getMapHeight();
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setDeadzone(120, 90);

    this.listen("sendChatMessage", (event: CustomEvent) =>
      this.wsManager.send("chat", event.detail),
    );
    this.listen("statusChange", (event: CustomEvent) => {
      this.wsManager.send("status_change", { status: event.detail.status });
      this.playerManager.updatePlayerStatus(this.playerId, event.detail.status);
    });
    this.listen("chatFocused", () => this.movementManager.setInputEnabled(false));
    this.listen("chatBlurred", () => this.movementManager.setInputEnabled(true));
  }

  private getWsBaseUrl(): string {
    const host = window.location.hostname;
    const configured = process.env.NEXT_PUBLIC_WS_URL;
    const isStaleLocalhost =
      configured?.includes("localhost") &&
      host !== "localhost" &&
      host !== "127.0.0.1";

    if (!configured || isStaleLocalhost) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${host}:8080`;
    }
    return configured;
  }

  private listen(type: string, handler: (event: CustomEvent) => void) {
    const listener = handler as EventListener;
    this.windowListeners.push([type, listener]);
    window.addEventListener(type, listener);
  }

  update(_time: number, delta: number) {
    if (!this.player) return;

    this.movementManager.update(delta);
    this.playerManager.update(delta);
    this.playerManager.updateLocalPlayerNameTag(this.player.x, this.player.y);
    this.proximityManager.update();
  }

  public cleanup() {
    this.windowListeners.forEach(([type, listener]) =>
      window.removeEventListener(type, listener),
    );
    this.windowListeners.length = 0;

    this.movementManager?.destroy();
    this.wsManager?.disconnect();
    this.playerManager?.destroy();
    this.proximityManager?.destroy();
    callManager.detach();
    this.virtualJoystickManager?.destroy();
  }
}

export default GameScene;
