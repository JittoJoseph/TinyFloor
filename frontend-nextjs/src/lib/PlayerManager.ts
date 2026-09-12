import * as Phaser from "phaser";
import {
  AnimationManager,
  AnimationState,
  CardinalDirection,
  Direction,
  directionFromVector,
} from "./AnimationManager";
import { NavGrid, Vec, advanceAlongPath } from "./Navigation";
import { depthForY } from "./MapManager";
import type { SeatPose } from "./SeatManager";
import { SceneLabel } from "./SceneLabel";
import { TILE_SIZE, MOVEMENT_SPEED, pixelToTile, tileToPixel } from "./types";
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
  seat?: SeatPose;
  onArrive?: () => void;
}

const SNAP_THRESHOLD = TILE_SIZE * 6;
const MAX_CATCHUP = 1.8;
const TAG_OFFSET_Y = -55;
const BEHIND_TAG_OFFSET_Y = 40;
const TAG_DEPTH = 100000;
const VALID_SPRITES = ["Adam", "Alex", "Amelia", "Bob"];
const HOP_DURATION = 220;
const HOP_REACH = TILE_SIZE * 2;

const STATUS_COLORS: Record<string, number> = {
  available: 0x34d399,
  away: 0xfbbf24,
  busy: 0xf87171,
  in_call: 0xa78bfa,
  offline: 0x9ca3af,
};

/**
 * Sitting with your back to us puts your head over the desk, where a name would
 * cover it, so the name hangs under the chair instead.
 */
function nameTagOffset(seated?: CardinalDirection): number {
  return seated === "up" ? BEHIND_TAG_OFFSET_Y : TAG_OFFSET_Y;
}

export class PlayerManager {
  private scene: Phaser.Scene;
  private animationManager: AnimationManager;
  private nav: NavGrid;
  private playerId: string;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private nameTags: Map<string, SceneLabel> = new Map();
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
    const player = this.scene.physics.add.sprite(x, y, character);
    player.setName("localPlayer");
    player.setScale(2.0);
    player.setOrigin(0.5, 1.0);
    player.setData("spriteName", character);
    player.play(this.animationManager.getAnimationKey(character, "idle", "down"));

    const tag = new SceneLabel(this.scene, x, y + TAG_OFFSET_Y, name, true);
    tag.container.setDepth(TAG_DEPTH);
    this.scene.tweens.add({
      targets: tag.container,
      y: y + TAG_OFFSET_Y - 2,
      duration: 1500,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    this.localPlayer = player;
    this.nameTags.set(id, tag);
    this.updatePlayerStatus(id, "available");

    return player;
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
    const sprite = this.scene.add.sprite(0, 0, safeSpriteKey);
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(2.0);
    sprite.setData("spriteName", safeSpriteKey);
    sprite.play(
      this.animationManager.getAnimationKey(safeSpriteKey, "idle", "down"),
    );
    container.add(sprite);
    container.setDepth(depthForY(pos.y));

    const tag = new SceneLabel(this.scene, 0, TAG_OFFSET_Y, name, true);
    container.add(tag.container);
    this.nameTags.set(id, tag);
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

  updateLocalPlayerNameTag(
    pixelX: number,
    pixelY: number,
    seated?: CardinalDirection,
  ) {
    this.nameTags
      .get(this.playerId)
      ?.container.setPosition(pixelX, pixelY + nameTagOffset(seated));
  }

  /**
   * While we sit in a meeting the cards carry everyone's name, so the names of
   * the people at the table, ours included, come off the map.
   */
  hideNameTags(people: ReadonlySet<string> | null) {
    this.nameTags.forEach((tag, id) =>
      tag.container.setVisible(
        !people || (id !== this.playerId && !people.has(id)),
      ),
    );
  }

  updatePlayerStatus(id: string, status: PlayerStatus) {
    const tag = this.nameTags.get(id);
    if (!tag?.dot) return;

    const state = this.playerStates.get(id);
    if (state) state.status = status;

    tag.setDot(STATUS_COLORS[status] ?? STATUS_COLORS.available);
    this.scene.tweens.killTweensOf(tag.dot);
    tag.dot.setAlpha(1);
    if (status === "in_call") {
      this.scene.tweens.add({
        targets: tag.dot,
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
    if (!state || !container || state.seat) return;

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
    if (!state || !container || state.seat) return;

    state.streaming = false;
    state.path = this.nav.buildPath(container.x, container.y, tileX, tileY);
    if (!state.path.length) {
      const point = tileToPixel(tileX, tileY);
      container.setPosition(point.x, point.y);
    }
  }

  /**
   * Walks someone to the spot beside the chair they took, then hops them onto
   * it. Players already seated when we arrive are placed there directly.
   */
  sitPlayer(id: string, pose: SeatPose, walk = true) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container) return;

    this.scene.tweens.killTweensOf(container);
    state.seat = pose;
    state.streaming = false;
    state.onArrive = undefined;
    state.path = [];

    if (!walk) {
      container.setPosition(pose.x, pose.y).setDepth(pose.depth);
      this.settle(id, pose);
      return;
    }

    const stand = pixelToTile(pose.standX, pose.standY);
    const goal = this.nav.nearestWalkable(stand.tileX, stand.tileY);
    if (goal) {
      state.path = this.nav.buildPath(container.x, container.y, goal.tileX, goal.tileY);
    }
    if (state.path.length) state.onArrive = () => this.hopOnto(id);
    else this.hopOnto(id);
  }

  standPlayer(id: string) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    const pose = state?.seat;
    if (!state || !container || !pose) return;

    this.scene.tweens.killTweensOf(container);
    state.seat = undefined;
    state.onArrive = undefined;
    state.path = [];
    state.direction = pose.direction;
    state.lastMoving = undefined;
    this.nameTags.get(id)?.container.setY(TAG_OFFSET_Y);

    const gap = Phaser.Math.Distance.Between(container.x, container.y, pose.standX, pose.standY);
    if (gap <= HOP_REACH) {
      this.glide(container, pose.standX, pose.standY);
      return;
    }
    // stood up before reaching the chair, so finish the walk to where they are
    const goal = pixelToTile(pose.standX, pose.standY);
    this.walkPlayerTo(id, goal.tileX, goal.tileY);
  }

  private hopOnto(id: string) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    const pose = state?.seat;
    if (!state || !container || !pose) return;

    state.isMoving = false;
    state.lastMoving = undefined;
    this.animate(container, "run", pose.direction);
    this.glide(container, pose.x, pose.y, pose.depth, () => {
      if (state.seat === pose) this.settle(id, pose);
    });
  }

  /** A short eased move, holding a depth or following y when none is given. */
  private glide(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    depth?: number,
    onComplete?: () => void,
  ) {
    if (depth !== undefined) container.setDepth(depth);
    this.scene.tweens.add({
      targets: container,
      x,
      y,
      duration: HOP_DURATION,
      ease: "Sine.easeOut",
      onUpdate: () => {
        if (depth === undefined) container.setDepth(depthForY(container.y));
      },
      onComplete,
    });
  }

  private spriteOf(container: Phaser.GameObjects.Container) {
    return container.list[0] as Phaser.GameObjects.Sprite;
  }

  private animate(
    container: Phaser.GameObjects.Container,
    state: AnimationState,
    direction: Direction,
  ) {
    const sprite = this.spriteOf(container);
    sprite.play(
      this.animationManager.getAnimationKey(
        sprite.getData("spriteName") || "Adam",
        state,
        direction,
      ),
      true,
    );
  }

  private settle(id: string, pose: SeatPose) {
    const container = this.players.get(id);
    if (!container) return;
    const sprite = this.spriteOf(container);
    sprite.anims.stop();
    sprite.setFrame(pose.frame);
    this.nameTags.get(id)?.container.setY(nameTagOffset(pose.direction));
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
        container.setDepth(depthForY(pos.y));
        state.direction = directionFromVector(dx, dy, state.direction);
        state.isMoving = state.path.length > 0 || dx !== 0 || dy !== 0;

        if (!state.path.length && state.onArrive) {
          const arrive = state.onArrive;
          state.onArrive = undefined;
          arrive();
          return;
        }
      } else if (state.seat) {
        return;
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
      this.animate(container, state.isMoving ? "run" : "idle", state.direction);
    });
  }

  removePlayer(id: string) {
    const tag = this.nameTags.get(id);
    if (tag) {
      this.scene.tweens.killTweensOf([tag.container, tag.dot]);
      this.nameTags.delete(id);
    }

    const container = this.players.get(id);
    if (container) {
      this.scene.tweens.killTweensOf(container);
      container.destroy();
    }
    this.players.delete(id);
    this.playerStates.delete(id);
  }

  getPlayers(): Map<string, Phaser.GameObjects.Container> {
    return this.players;
  }

  getPlayerName(id: string): string | undefined {
    return this.nameTags.get(id)?.text;
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
      .map(([id, tag]) => ({ id, name: tag.text }));
  }

  destroy() {
    this.nameTags.forEach((tag) =>
      this.scene.tweens.killTweensOf([tag.container, tag.dot]),
    );
    this.players.forEach((container) => {
      this.scene.tweens.killTweensOf(container);
      container.destroy();
    });
    this.players.clear();
    this.nameTags.clear();
    this.playerStates.clear();
  }
}
