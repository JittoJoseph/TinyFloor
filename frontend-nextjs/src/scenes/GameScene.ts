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
import { TutorialGuide } from "../lib/TutorialGuide";
import { WhiteboardObject } from "../lib/WhiteboardObject";
import { whiteboard } from "../lib/WhiteboardManager";
import { JukeboxObject } from "../lib/JukeboxObject";
import { jukebox } from "../lib/JukeboxManager";
import { tutorialDone, setTouchInput } from "../lib/tutorial";
import { tileToPixel } from "../lib/types";

const CAMERA_LERP = 0.08;
const CAMERA_ZOOM = 1.2;
const NARROW_WIDTH = 768;

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
  private tutorialGuide?: TutorialGuide;
  private whiteboardObject?: WhiteboardObject;
  private jukeboxObject?: JukeboxObject;
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
    const mapWidth = this.mapManager.getMapWidth();
    const mapHeight = this.mapManager.getMapHeight();
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setZoom(CAMERA_ZOOM);

    const keepCentered =
      !tutorialDone() && this.cameras.main.width < NARROW_WIDTH;
    const spawnTile = this.mapManager.getRandomSpawnTile(keepCentered);
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

    const touchInput = !this.sys.game.device.os.desktop;
    setTouchInput(touchInput);
    if (touchInput) {
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
    whiteboard.attach(this.wsManager);
    this.whiteboardObject = new WhiteboardObject(this, this.player);
    jukebox.attach(this.wsManager);
    this.jukeboxObject = new JukeboxObject(this, this.player);
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

    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setDeadzone(120, 90);

    this.listen("sendChatMessage", (event: CustomEvent) =>
      this.wsManager.send("chat", event.detail),
    );
    this.listen("statusChange", (event: CustomEvent) => {
      this.wsManager.send("status_change", { status: event.detail.status });
      this.playerManager.updatePlayerStatus(this.playerId, event.detail.status);
    });
    if (!tutorialDone()) {
      this.tutorialGuide = new TutorialGuide(
        this,
        this.playerManager,
        nav,
        this.player,
      );
    }

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

  update(time: number, delta: number) {
    if (!this.player) return;

    this.movementManager.update(delta);
    this.playerManager.update(delta);
    this.playerManager.updateLocalPlayerNameTag(this.player.x, this.player.y);
    this.proximityManager.update();
    this.whiteboardObject?.update();
    this.jukeboxObject?.update(time, delta);
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
    whiteboard.detach();
    this.whiteboardObject?.destroy();
    jukebox.detach();
    this.jukeboxObject?.destroy();
    this.virtualJoystickManager?.destroy();
    this.tutorialGuide?.destroy();
  }
}

export default GameScene;
