import * as Phaser from 'phaser';
import { WebSocketManager, WebSocketMessage } from '../lib/WebSocketManager';
import { PlayerManager } from '../lib/PlayerManager';
import { ProximityManager } from '../lib/ProximityManager';
import { CallManager } from '../lib/CallManager';
import { AnimationManager, Direction } from '../lib/AnimationManager';
import { MovementManager } from '../lib/MovementManager';

class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private wsManager!: WebSocketManager;
  private playerManager!: PlayerManager;
  private proximityManager!: ProximityManager;
  private callManager!: CallManager;
  private animationManager!: AnimationManager;
  private movementManager!: MovementManager;
  private playerId: string;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private sceneReady: boolean = false;

  constructor(private name: string) {
    super({ key: "GameScene" });
    this.playerId = Phaser.Utils.String.UUID();
  }

  preload() {
    this.load.tilemapTiledJSON("office", "/tilesets/office-map.tmj");
    this.load.image("RoomBuilder", "/tilesets/textures/Room_Builder_Office_32x32.png");
    this.load.image("ModernOffice", "/tilesets/textures/Modern_Office_Black_Shadow_32x32.png");

    this.animationManager = new AnimationManager(this);
    this.animationManager.preload();

    this.load.on("loaderror", (file: unknown) => {
      console.error("Failed to load file:", file);
    });
  }

  create() {
    this.camera = this.cameras.main;

    this.animationManager.create();

    this.wsManager = new WebSocketManager(this.playerId, this.name);
    this.playerManager = new PlayerManager(this, this.animationManager);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:8080/ws`;
    this.wsManager.connect(wsUrl);

    this.wsManager.setOnMessage((msg: WebSocketMessage) => {
      this.handleMessage(msg);
    });

    const map = this.make.tilemap({ key: "office" });
    const rb = map.addTilesetImage("Room_Builder_Office_32x32", "RoomBuilder");
    const mo = map.addTilesetImage("Modern_Office_Black_Shadow_32x32", "ModernOffice");

    if (!rb || !mo) {
      throw new Error("Tilesets not found");
    }

    map.createLayer("Ground", [rb, mo], 0, 0)!.setDepth(0);
    map.createLayer("Walls", [rb, mo], 0, 0)!.setDepth(10);
    map.createLayer("DesksBack", [rb, mo], 0, 0)!.setDepth(20);
    map.createLayer("DeskItems_Back", [rb, mo], 0, 0)!.setDepth(25);

    this.createCurrentPlayer();

    this.movementManager = new MovementManager(this, this.player, this.animationManager, this.playerId, this.wsManager);

    this.sceneReady = true;

    this.callManager = new CallManager(this, this.wsManager, this.playerId);

    this.proximityManager = new ProximityManager(this, this.wsManager, this.playerManager, this.callManager, this.player, this.playerId);

    // Build colliders from object layer
    const collLayer = map.getObjectLayer("Colliders");
    const solids = this.physics.add.staticGroup();

    if (collLayer && collLayer.objects) {
      collLayer.objects.forEach((obj: unknown) => {
        const o = obj as { x: number; y: number; width?: number; height?: number };
        const cx = o.x + (o.width || 0) / 2;
        const cy = o.y + (o.height || 0) / 2;

        const rect = this.add.rectangle(
          cx,
          cy,
          o.width || 1,
          o.height || 1,
          0x000000,
          0
        );
        this.physics.add.existing(rect, true);
        const body = rect.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(o.width, o.height);
        body.setOffset(0, 0);
        solids.add(rect);
      });
    }

    // Add physics to player
    if (this.player) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      // Adjust body size for 16x16 sprite (scaled up or not?)
      // Assuming 16x16 sprite, we might want to scale it up to look good in 32x32 tiles
      this.player.setScale(2); 
      playerBody.setSize(10, 8).setOffset(3, 24); // Adjust hitbox for 16x32 sprite scaled 2x
      playerBody.setCollideWorldBounds(true);
      this.physics.add.collider(this.player, solids);
    }

    // Set player depth
    if (this.player) {
      this.player.setDepth(10000);
    }

    // Create front layers
    map.createLayer("Dividers", [mo], 0, 0)!.setDepth(1000);
    map.createLayer("DesksFront", [mo], 0, 0)!.setDepth(1010);
    map.createLayer("DeskItems_Front", [mo], 0, 0)!.setDepth(1020);

    // Create over player layer
    map.createLayer("OverPlayer_Layer", [rb, mo], 0, 0)!.setDepth(20000);

    // Set camera bounds
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);

    // Set physics world bounds
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  private createCurrentPlayer() {
    this.player = this.physics.add.sprite(5 * 32 + 16, 5 * 32 + 16, "Adam_idle");
    this.player.setScale(1.5);
    
    const animKey = this.animationManager.getAnimationKey('Adam', 'idle', 'down');
    this.player.play(animKey);

    const label = this.add.text(this.player.x, this.player.y - 20, this.name, {
      fontSize: "12px",
      color: "#000",
      backgroundColor: "#ffffff80"
    });
    label.setOrigin(0.5);
    this.playerManager.getPlayerLabels().set(this.playerId, label);
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

  handleSpaceJoined(data: Record<string, unknown>) {
    const spawnX = data.spawnX as number;
    const spawnY = data.spawnY as number;
    const sprite = data.sprite as string;
    const existingUsers = data.existingUsers as Array<{id: string; name: string; x: number; y: number; sprite: string}>;
    this.player.setPosition(spawnX, spawnY);
    
    if (sprite) {
      const validSprites = ['Adam', 'Alex', 'Amelia', 'Bob'];
      const spriteName = validSprites.includes(sprite) ? sprite : 'Adam';
      this.player.setData('spriteName', spriteName);
      this.player.play(this.animationManager.getAnimationKey(spriteName, 'idle', 'down'));
    }

    existingUsers.forEach((user) => {
      this.playerManager.addPlayer(user.id, user.name, user.x, user.y, user.sprite);
    });
  }

  handleMovementRejected(data: Record<string, unknown>) {
    const { x, y } = data as { x: number; y: number };
    this.player.setPosition(x, y);
  }

  handleMovement(data: Record<string, unknown>) {
    const { id, x, y, direction } = data as { id: string; x: number; y: number; direction: string };
    if (id !== this.playerId) {
      this.playerManager.updatePlayerPosition(id, x, y, direction as Direction);
    }
  }

  handleUserLeft(data: Record<string, unknown>) {
    const { id } = data as { id: string };
    this.playerManager.removePlayer(id);
    this.proximityManager.destroyProximityCard(id);
    this.callManager.endCall(id, "user_left");
  }

  handleUserJoin(data: Record<string, unknown>) {
    const { id, name, x, y, sprite } = data as { id: string; name: string; x: number; y: number; sprite: string };
    this.playerManager.addPlayer(id, name, x, y, sprite);
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