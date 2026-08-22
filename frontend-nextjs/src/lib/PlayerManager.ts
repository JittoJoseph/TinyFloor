import * as Phaser from "phaser";
import {
  AnimationManager,
  Direction,
  directionFromVector,
} from "./AnimationManager";
import { NavGrid, Vec, advanceAlongPath } from "./Navigation";
import { TILE_SIZE, MOVEMENT_SPEED, tileToPixel } from "./types";
import { GUIDE_ID } from "./tutorial";
import type { PlayerStatus } from "./types";

interface RemotePlayerState {
  path: Vec[];
  direction: Direction;
  isMoving: boolean;
  streaming: boolean;
  status: PlayerStatus;
  guest: boolean;
  lastDirection?: Direction;
  lastMoving?: boolean;
}

interface NameTag {
  container: Phaser.GameObjects.Container;
  nameText: Phaser.GameObjects.Text;
  statusDot: Phaser.GameObjects.Graphics;
  width: number;
}

const SNAP_THRESHOLD = TILE_SIZE * 6;
const MAX_CATCHUP = 1.8;
const TAG_OFFSET_Y = -55;
const VALID_SPRITES = ["Adam", "Alex", "Amelia", "Bob"];

const STATUS_COLORS: Record<string, number> = {
  available: 0x34d399,
  away: 0xfbbf24,
  busy: 0xf87171,
  in_call: 0xa78bfa,
  offline: 0x9ca3af,
};

export class PlayerManager {
  private scene: Phaser.Scene;
  private animationManager: AnimationManager;
  private nav: NavGrid;
  private playerId: string;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private nameTags: Map<string, NameTag> = new Map();
  private playerStates: Map<string, RemotePlayerState> = new Map();
  private localPlayer?: Phaser.Physics.Arcade.Sprite;
  private scratch: Vec = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    animationManager: AnimationManager,
    nav: NavGrid,
    playerId: string,
  ) {
    this.scene = scene;
    this.animationManager = animationManager;
    this.nav = nav;
    this.playerId = playerId;
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
    player.setOrigin(0.5, 1.0);
    player.setData("spriteName", character);
    player.play(this.animationManager.getAnimationKey(character, "idle", "down"));

    this.localPlayer = player;
    this.nameTags.set(id, this.createNameTag(name, x, y + TAG_OFFSET_Y, true));
    this.updatePlayerStatus(id, "available");

    return player;
  }

  private createNameTag(
    name: string,
    x: number,
    y: number,
    isLocal: boolean,
  ): NameTag {
    const container = this.scene.add.container(x, y);
    container.setDepth(25000);

    const font = { fontSize: "13px", fontFamily: "VT323, monospace" };
    const measure = this.scene.add.text(0, 0, name, font);
    const textWidth = measure.width;
    measure.destroy();

    const paddingX = 8;
    const dotRadius = 4;
    const width = textWidth + paddingX * 2 + dotRadius * 2 + 8;
    const height = 16;

    const background = this.scene.add.graphics();
    background.fillStyle(0x1f2937, 0.85);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    background.lineStyle(1, 0x374151, 0.5);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    container.add(background);

    const statusDot = this.scene.add.graphics();
    container.add(statusDot);

    const dotX = -width / 2 + paddingX + dotRadius;
    const nameText = this.scene.add.text(dotX + dotRadius + 6, 0, name, {
      ...font,
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

    return { container, nameText, statusDot, width };
  }

  addPlayer(
    id: string,
    name: string,
    tileX: number,
    tileY: number,
    spriteKey: string = "Adam",
    status: PlayerStatus = "available",
    guest: boolean = true,
  ) {
    if (this.players.has(id)) return;

    const pos = tileToPixel(tileX, tileY);
    const safeSpriteKey = VALID_SPRITES.includes(spriteKey)
      ? spriteKey
      : "Adam";

    const container = this.scene.add.container(pos.x, pos.y);
    const sprite = this.scene.add.sprite(0, 0, `${safeSpriteKey}_idle`);
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(2.0);
    sprite.setData("spriteName", safeSpriteKey);
    sprite.play(
      this.animationManager.getAnimationKey(safeSpriteKey, "idle", "down"),
    );
    container.add(sprite);
    container.setDepth(10000);

    const nameTag = this.createNameTag(name, 0, TAG_OFFSET_Y, false);
    container.add(nameTag.container);
    this.nameTags.set(id, nameTag);
    this.players.set(id, container);

    this.scene.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(-12, -24);
    body.setImmovable(true);

    if (this.localPlayer) {
      this.scene.physics.add.collider(this.localPlayer, container);
    }

    this.playerStates.set(id, {
      path: [],
      direction: "down",
      isMoving: false,
      streaming: false,
      status,
      guest,
    });

    this.updatePlayerStatus(id, status);
  }

  updateLocalPlayerNameTag(pixelX: number, pixelY: number) {
    this.nameTags
      .get(this.playerId)
      ?.container.setPosition(pixelX, pixelY + TAG_OFFSET_Y);
  }

  updatePlayerStatus(id: string, status: PlayerStatus) {
    const nameTag = this.nameTags.get(id);
    if (!nameTag) return;

    const state = this.playerStates.get(id);
    if (state) state.status = status;

    const dotX = -nameTag.width / 2 + 12;
    nameTag.statusDot.clear();
    nameTag.statusDot.fillStyle(
      STATUS_COLORS[status] ?? STATUS_COLORS.available,
      1,
    );
    nameTag.statusDot.fillCircle(dotX, 0, 4);

    this.scene.tweens.killTweensOf(nameTag.statusDot);
    nameTag.statusDot.setAlpha(1);
    if (status === "in_call") {
      this.scene.tweens.add({
        targets: nameTag.statusDot,
        alpha: 0.5,
        duration: 500,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }

  updatePlayerPosition(id: string, tileX: number, tileY: number) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container) return;

    state.streaming = true;

    const point = tileToPixel(tileX, tileY);
    const gap = Phaser.Math.Distance.Between(
      container.x,
      container.y,
      point.x,
      point.y,
    );

    if (gap > SNAP_THRESHOLD) {
      state.path.length = 0;
      container.setPosition(point.x, point.y);
    } else {
      state.path = [point];
    }
  }

  walkPlayerTo(id: string, tileX: number, tileY: number) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container) return;

    state.streaming = false;
    state.path = this.nav.buildPath(container.x, container.y, tileX, tileY);
    if (!state.path.length) {
      const point = tileToPixel(tileX, tileY);
      container.setPosition(point.x, point.y);
    }
  }

  update(delta: number) {
    this.playerStates.forEach((state, id) => {
      const container = this.players.get(id);
      if (!container) return;

      if (state.path.length) {
        const target = state.path[0];
        const catchup = state.streaming
          ? Phaser.Math.Clamp(
              Phaser.Math.Distance.Between(
                container.x,
                container.y,
                target.x,
                target.y,
              ) / TILE_SIZE,
              1,
              MAX_CATCHUP,
            )
          : 1;
        const pos = this.scratch;
        pos.x = container.x;
        pos.y = container.y;
        advanceAlongPath(pos, state.path, (MOVEMENT_SPEED * catchup * delta) / 1000);
        const dx = pos.x - container.x;
        const dy = pos.y - container.y;
        container.setPosition(pos.x, pos.y);
        state.direction = directionFromVector(dx, dy, state.direction);
        state.isMoving = state.path.length > 0 || dx !== 0 || dy !== 0;
      } else {
        state.isMoving = false;
      }

      if (
        state.isMoving === state.lastMoving &&
        state.direction === state.lastDirection
      ) {
        return;
      }
      state.lastMoving = state.isMoving;
      state.lastDirection = state.direction;

      const sprite = container.list[0] as Phaser.GameObjects.Sprite;
      sprite.play(
        this.animationManager.getAnimationKey(
          sprite.getData("spriteName") || "Adam",
          state.isMoving ? "run" : "idle",
          state.direction,
        ),
        true,
      );
    });
  }

  removePlayer(id: string) {
    const nameTag = this.nameTags.get(id);
    if (nameTag) {
      this.scene.tweens.killTweensOf(nameTag.container);
      this.scene.tweens.killTweensOf(nameTag.statusDot);
      this.nameTags.delete(id);
    }

    this.players.get(id)?.destroy();
    this.players.delete(id);
    this.playerStates.delete(id);
  }

  getPlayers(): Map<string, Phaser.GameObjects.Container> {
    return this.players;
  }

  getPlayerName(id: string): string | undefined {
    return this.nameTags.get(id)?.nameText.text;
  }

  getPlayerStatus(id: string): PlayerStatus | undefined {
    return this.playerStates.get(id)?.status;
  }

  isGuest(id: string): boolean {
    return this.playerStates.get(id)?.guest !== false;
  }

  getPlayerList(): Array<{ id: string; name: string }> {
    return [...this.nameTags]
      .filter(([id]) => id !== GUIDE_ID)
      .map(([id, tag]) => ({ id, name: tag.nameText.text }));
  }

  destroy() {
    this.nameTags.forEach((tag) => {
      this.scene.tweens.killTweensOf(tag.container);
      this.scene.tweens.killTweensOf(tag.statusDot);
    });
    this.players.forEach((container) => container.destroy());
    this.players.clear();
    this.nameTags.clear();
    this.playerStates.clear();
  }
}
