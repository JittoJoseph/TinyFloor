import * as Phaser from "phaser";
import { AnimationManager, Direction } from "./AnimationManager";
import { TILE_SIZE, tileToPixel } from "./types";
import type { PlayerStatus } from "./types";

interface RemotePlayerState {
  targetX: number;
  targetY: number;
  tileX: number;
  tileY: number;
  direction: Direction;
  isMoving: boolean;
  lastUpdateTime: number;
  status: PlayerStatus;
}

interface NameTag {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  statusDot: Phaser.GameObjects.Graphics;
  width: number;
}

const INTERPOLATION_SPEED = 0.12;
const SNAP_THRESHOLD = TILE_SIZE * 6;
const IDLE_THRESHOLD = 3;

export class PlayerManager {
  private scene: Phaser.Scene;
  private animationManager: AnimationManager;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private nameTags: Map<string, NameTag> = new Map();
  private playerStates: Map<string, RemotePlayerState> = new Map();
  private remotePlayersGroup: Phaser.GameObjects.Group;
  private playerId: string;
  private localPlayer?: Phaser.Physics.Arcade.Sprite;

  private readonly COLORS = {
    background: 0x1f2937,
    backgroundAlpha: 0.85,
    text: 0xffffff,
    statusAvailable: 0x34d399, // green
    statusAway: 0xfbbf24, // yellow
    statusBusy: 0xf87171, // red
    statusInCall: 0xa78bfa, // purple
    border: 0x374151,
  };

  // Map status string to color key
  private statusColorMap: Record<string, number> = {
    available: 0x34d399,
    online: 0x34d399,
    away: 0xfbbf24,
    busy: 0xf87171,
    in_call: 0xa78bfa,
  };

  constructor(
    scene: Phaser.Scene,
    animationManager: AnimationManager,
    playerId: string,
  ) {
    this.scene = scene;
    this.animationManager = animationManager;
    this.playerId = playerId;
    this.remotePlayersGroup = this.scene.add.group();
  }

  createLocalPlayer(
    id: string,
    name: string,
    x: number,
    y: number,
    character: string,
  ): Phaser.Physics.Arcade.Sprite {
    const player = this.scene.physics.add.sprite(x, y, `${character}_idle`);
    player.setName("localPlayer");
    player.setScale(2.0);
    player.setOrigin(0.5, 1.0); // Origin at feet (bottom center)

    const animKey = this.animationManager.getAnimationKey(
      character,
      "idle",
      "down",
    );
    player.play(animKey);

    // Store reference to local player
    this.localPlayer = player;

    // Create cute name tag for local player
    const nameTag = this.createNameTag(id, name, player.x, player.y - 55, true);
    this.nameTags.set(id, nameTag);
    this.playerLabels.set(id, nameTag.nameText);

    return player;
  }

  private createNameTag(
    id: string,
    name: string,
    x: number,
    y: number,
    isLocal: boolean = false,
  ): NameTag {
    const container = this.scene.add.container(x, y);
    container.setDepth(25000);

    const tempText = this.scene.add.text(0, 0, name, {
      fontSize: "13px",
      fontFamily: "VT323, monospace",
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const padding = { x: 8, y: 4 };
    const dotRadius = 4;
    const bgWidth = textWidth + padding.x * 2 + dotRadius * 2 + 8;
    const bgHeight = 16;
    const cornerRadius = 8;

    const background = this.scene.add.graphics();
    background.fillStyle(this.COLORS.background, this.COLORS.backgroundAlpha);
    background.fillRoundedRect(
      -bgWidth / 2,
      -bgHeight / 2,
      bgWidth,
      bgHeight,
      cornerRadius,
    );

    background.lineStyle(1, this.COLORS.border, 0.5);
    background.strokeRoundedRect(
      -bgWidth / 2,
      -bgHeight / 2,
      bgWidth,
      bgHeight,
      cornerRadius,
    );
    container.add(background);

    const statusDot = this.scene.add.graphics();
    const dotX = -bgWidth / 2 + padding.x + dotRadius;
    statusDot.fillStyle(this.COLORS.statusAvailable, 1);
    statusDot.fillCircle(dotX, 0, dotRadius);
    container.add(statusDot);

    const nameText = this.scene.add.text(dotX + dotRadius + 6, 0, name, {
      fontSize: "13px",
      fontFamily: "VT323, monospace",
      color: "#ffffff",
      resolution: 2,
      strokeThickness: 0,
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    if (isLocal) {
      this.scene.tweens.add({
        targets: container,
        y: y - 2,
        duration: 1500,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }

    return { container, background, nameText, statusDot, width: bgWidth };
  }

  addPlayer(
    id: string,
    name: string,
    tileX: number,
    tileY: number,
    spriteKey: string = "Adam",
    status: PlayerStatus = "available",
  ) {
    if (this.players.has(id)) return;

    const pixelPos = tileToPixel(tileX, tileY);
    const x = pixelPos.x;
    const y = pixelPos.y;

    const validSprites = ["Adam", "Alex", "Amelia", "Bob"];
    const safeSpriteKey = validSprites.includes(spriteKey) ? spriteKey : "Adam";

    const container = this.scene.add.container(x, y);
    const sprite = this.scene.add.sprite(0, 0, `${safeSpriteKey}_idle`);
    sprite.setOrigin(0.5, 1.0);
    sprite.setData("spriteName", safeSpriteKey);
    sprite.setScale(2.0);

    const animKey = this.animationManager.getAnimationKey(
      safeSpriteKey,
      "idle",
      "down",
    );
    sprite.play(animKey);

    container.add(sprite);
    this.players.set(id, container);

    const nameTag = this.createNameTag(id, name, 0, -55, false);
    container.add(nameTag.container);
    nameTag.container.setPosition(0, -55);
    this.nameTags.set(id, nameTag);
    this.playerLabels.set(id, nameTag.nameText);

    container.setDepth(10000);

    this.scene.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(-12, -24);
    body.setImmovable(true);

    this.remotePlayersGroup.add(container);

    if (this.scene.physics.world) {
      this.scene.physics.add.collider(
        this.scene.children.getByName(
          "localPlayer",
        ) as Phaser.GameObjects.GameObject,
        container,
      );
    }

    this.playerStates.set(id, {
      targetX: x,
      targetY: y,
      tileX,
      tileY,
      direction: "down",
      isMoving: false,
      lastUpdateTime: this.scene.time.now,
      status,
    });

    this.updatePlayerStatus(id, status);
  }

  getRemotePlayersGroup(): Phaser.GameObjects.Group {
    return this.remotePlayersGroup;
  }

  updateLocalPlayerPosition(tileX: number, tileY: number) {
    if (!this.localPlayer) return;

    const pixelPos = tileToPixel(tileX, tileY);

    this.localPlayer.setPosition(pixelPos.x, pixelPos.y);

    this.updateLocalPlayerNameTag(pixelPos.x, pixelPos.y);
  }

  // Update only the local player's name tag position (for smooth movement)
  updateLocalPlayerNameTag(pixelX: number, pixelY: number) {
    const nameTag = this.nameTags.get(this.playerId);
    if (nameTag) {
      nameTag.container.setPosition(pixelX, pixelY - 55);
    }
  }

  updatePlayerStatus(id: string, status: PlayerStatus | "online") {
    const nameTag = this.nameTags.get(id);
    if (!nameTag) return;

    // Update state if exists
    const state = this.playerStates.get(id);
    if (state && status !== "online") {
      state.status = status as PlayerStatus;
    }

    const statusColor =
      this.statusColorMap[status] || this.statusColorMap["available"];

    const bgWidth = nameTag.width || 80;
    const padding = { x: 8 };
    const dotRadius = 4;
    const dotX = -bgWidth / 2 + padding.x + dotRadius;

    nameTag.statusDot.clear();
    nameTag.statusDot.fillStyle(statusColor, 1);
    nameTag.statusDot.fillCircle(dotX, 0, dotRadius);

    // Add pulse animation for in_call status
    if (status === "in_call") {
      this.scene.tweens.add({
        targets: nameTag.statusDot,
        alpha: 0.5,
        duration: 500,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(nameTag.statusDot);
      nameTag.statusDot.setAlpha(1);
    }
  }

  updatePlayerPosition(
    id: string,
    tileX: number,
    tileY: number,
    direction: Direction,
  ) {
    const state = this.playerStates.get(id);
    if (!state) return;

    const container = this.players.get(id);
    if (!container) return;

    const pixelPos = tileToPixel(tileX, tileY);

    state.tileX = tileX;
    state.tileY = tileY;
    state.targetX = pixelPos.x;
    state.targetY = pixelPos.y;
    state.direction = direction;
    state.lastUpdateTime = this.scene.time.now;
    state.isMoving = true;
  }

  update() {
    this.playerStates.forEach((state, id) => {
      const container = this.players.get(id);
      if (!container) return;

      const sprite = container.list[0] as Phaser.GameObjects.Sprite;
      const spriteName = sprite.getData("spriteName") || "Adam";

      const dx = state.targetX - container.x;
      const dy = state.targetY - container.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > SNAP_THRESHOLD) {
        container.setPosition(state.targetX, state.targetY);
        state.isMoving = false;
      } else if (distance > IDLE_THRESHOLD) {
        container.x += dx * INTERPOLATION_SPEED;
        container.y += dy * INTERPOLATION_SPEED;
        state.isMoving = true;
      } else {
        container.setPosition(state.targetX, state.targetY);
        state.isMoving = false;
      }

      // Update animation based on movement state
      const animState = state.isMoving ? "run" : "idle";
      const animKey = this.animationManager.getAnimationKey(
        spriteName,
        animState,
        state.direction,
      );

      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey, true);
      }
    });
  }

  removePlayer(id: string) {
    const container = this.players.get(id);
    if (container) {
      this.remotePlayersGroup.remove(container);
      container.destroy();
      this.players.delete(id);
    }

    const nameTag = this.nameTags.get(id);
    if (nameTag) {
      this.scene.tweens.killTweensOf(nameTag.container);
      this.scene.tweens.killTweensOf(nameTag.statusDot);
      if (!this.players.has(id)) {
        // Only destroy if it's not part of a player container
        nameTag.container.destroy();
      }
      this.nameTags.delete(id);
    }

    this.playerLabels.delete(id);
    this.playerStates.delete(id);
  }

  getPlayers(): Map<string, Phaser.GameObjects.Container> {
    return this.players;
  }

  getPlayerLabels(): Map<string, Phaser.GameObjects.Text> {
    return this.playerLabels;
  }

  getNameTag(id: string): NameTag | undefined {
    return this.nameTags.get(id);
  }

  getPlayerList(): Array<{ id: string; name: string }> {
    const list: Array<{ id: string; name: string }> = [];
    this.nameTags.forEach((tag, id) => {
      list.push({ id, name: tag.nameText.text });
    });
    return list;
  }

  getPlayerStatus(id: string): PlayerStatus | undefined {
    const state = this.playerStates.get(id);
    return state?.status;
  }

  destroy() {
    this.players.forEach((container) => container.destroy());
    this.players.clear();
    this.nameTags.forEach((tag) => {
      this.scene.tweens.killTweensOf(tag.container);
      this.scene.tweens.killTweensOf(tag.statusDot);
    });
    this.nameTags.clear();
    this.playerLabels.clear();
    this.playerStates.clear();
  }
}
