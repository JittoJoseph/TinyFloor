import * as Phaser from "phaser";
import {
  AnimationManager,
  AnimationState,
  CardinalDirection,
  Direction,
  directionFromVector,
} from "./AnimationManager";
import { NavGrid, Vec, advanceAlongPath, advanceHeading, headingVector } from "./Navigation";
import { depthForY } from "./MapManager";
import type { SeatPose } from "./SeatManager";
import { SceneLabel } from "./SceneLabel";
import { TILE_SIZE, MOVEMENT_SPEED, pixelToTile, tileToPixel } from "./types";
import { GUIDE_ID } from "./tutorial";
import { statusColorValue } from "./status";
import { DEFAULT_CHARACTER, isCharacter } from "@shared/profile";
import type { PlayerStatus } from "./types";

interface RemotePlayerState {
  path: Vec[];
  direction: Direction;
  isMoving: boolean;
  /** Set while they walk: they keep going this way until their next move. */
  heading: number | null;
  status: PlayerStatus;
  guest: boolean;
  lastDirection?: Direction;
  lastMoving?: boolean;
  seat?: SeatPose;
  onArrive?: () => void;
}

const SNAP_THRESHOLD = TILE_SIZE * 6;
/** Walking back to a correction looks like a stumble, so small ones are ignored. */
const IGNORE_CORRECTION = TILE_SIZE / 4;
/** Behind the tile they say they're on, they walk a little faster to catch up. */
const MAX_CATCHUP = 1.8;
const TAG_OFFSET_Y = -55;
const BEHIND_TAG_OFFSET_Y = 40;
const TAG_DEPTH = 100000;
const HOP_DURATION = 220;
const HOP_REACH = TILE_SIZE * 2;

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

    // Positioned every frame by updateLocalPlayerNameTag; a tween on it would fight
    // that and leave the name behind while the character walks off.
    const tag = new SceneLabel(this.scene, x, y + TAG_OFFSET_Y, name, true);
    tag.container.setDepth(TAG_DEPTH);

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
    const safeSpriteKey = isCharacter(spriteKey) ? spriteKey : DEFAULT_CHARACTER;

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
      heading: null,
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

    tag.setDot(statusColorValue(status));
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

  /**
   * Where they are, and which way they're walking. Between moves they keep
   * walking that way, so a straight walk arrives as one message. A correction
   * they have already walked past is ignored rather than stumbled back to.
   */
  updatePlayerPosition(id: string, tileX: number, tileY: number, heading?: number) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container || state.seat) return;

    const point = tileToPixel(tileX, tileY);
    const away = Phaser.Math.Distance.Between(container.x, container.y, point.x, point.y);
    const sameWay = heading !== undefined && heading === state.heading;
    state.heading = heading ?? null;
    state.path.length = 0;

    if (away > SNAP_THRESHOLD) {
      container.setPosition(point.x, point.y);
      return;
    }
    if (sameWay && away < TILE_SIZE) {
      const dir = headingVector(heading!);
      const ahead = (container.x - point.x) * dir.x + (container.y - point.y) * dir.y;
      const sideways = Math.abs((container.x - point.x) * dir.y - (container.y - point.y) * dir.x);
      if (ahead > 0 && sideways < IGNORE_CORRECTION) return;
    }
    state.path.push(point);
  }

  walkPlayerTo(id: string, tileX: number, tileY: number) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container || state.seat) return;

    state.heading = null;
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
    state.heading = null;
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
    state.heading = null;
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
        // Behind where they said they are, they walk a little faster to catch up.
        const target = state.path[0];
        const remaining = Phaser.Math.Distance.Between(container.x, container.y, target.x, target.y);
        const catchup = state.heading === null ? 1 : Phaser.Math.Clamp(remaining / TILE_SIZE, 1, MAX_CATCHUP);
        const pos = this.scratch;
        pos.x = container.x;
        pos.y = container.y;
        advanceAlongPath(pos, state.path, (MOVEMENT_SPEED * catchup * delta) / 1000);
        this.place(container, state, pos);

        if (!state.path.length && state.onArrive) {
          const arrive = state.onArrive;
          state.onArrive = undefined;
          arrive();
          return;
        }
      } else if (state.heading !== null) {
        // Walking on the way they were last heading, until they say otherwise.
        const pos = this.scratch;
        pos.x = container.x;
        pos.y = container.y;
        if (advanceHeading(pos, state.heading, (MOVEMENT_SPEED * delta) / 1000, this.nav)) {
          this.place(container, state, pos);
        } else {
          state.isMoving = false;
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

  /** Moves someone to a new spot, facing the way they went. */
  private place(container: Phaser.GameObjects.Container, state: RemotePlayerState, pos: Vec) {
    const dx = pos.x - container.x;
    const dy = pos.y - container.y;
    container.setPosition(pos.x, pos.y);
    container.setDepth(depthForY(pos.y));
    state.direction = directionFromVector(dx, dy, state.direction);
    state.isMoving = dx !== 0 || dy !== 0 || state.path.length > 0;
  }

  removePlayer(id: string) {
    const tag = this.nameTags.get(id);
    if (tag) {
      this.scene.tweens.killTweensOf([tag.container, tag.dot]);
      this.nameTags.delete(id);
      // A remote tag goes with its container below; the local one stands alone.
      if (!this.players.has(id)) tag.container.destroy();
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

  getPlayerList(): Array<{ id: string; name: string; status: PlayerStatus }> {
    return [...this.nameTags]
      .filter(([id]) => id !== GUIDE_ID)
      .map(([id, tag]) => ({ id, name: tag.text, status: this.playerStates.get(id)?.status ?? "available" }));
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
