import { typingElsewhere } from "./typing";
import * as Phaser from "phaser";
import {
  AnimationManager,
  Direction,
  directionFromVector,
} from "./AnimationManager";
import type { RoomSocket } from "./RoomSocket";
import { VirtualJoystickManager } from "./VirtualJoystickManager";
import { NavGrid, Vec, advanceAlongPath, advanceHeading, headingOf } from "./Navigation";
import { depthForY } from "./MapManager";
import { pixelToTile, isValidTile, MOVEMENT_SPEED, TILE_SIZE, tileToPixel } from "./types";

const ARRIVE_RANGE = 3;
/**
 * How far the others' copy of us may drift before we correct it. They walk our
 * last heading at our speed, so walking in a straight line costs one message,
 * not one per tile.
 */
const DRIFT_LIMIT = TILE_SIZE;

export class MovementManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private animationManager: AnimationManager;
  private wsManager: RoomSocket;
  private nav: NavGrid;
  private collides: (x: number, y: number) => boolean;
  private joystick?: VirtualJoystickManager;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private path: Vec[] = [];
  private arrive?: () => void;
  private release?: () => void;
  private currentDirection: Direction = "down";
  /** Where the others have us, walked forward the same way they do. */
  private shown = { x: 0, y: 0, heading: null as number | null, sent: false };
  private inputEnabled = true;
  private frozen = false;
  private movingBefore = false;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animationManager: AnimationManager,
    wsManager: RoomSocket,
    nav: NavGrid,
    collides: (x: number, y: number) => boolean,
    joystick?: VirtualJoystickManager,
  ) {
    this.scene = scene;
    this.player = player;
    this.animationManager = animationManager;
    this.wsManager = wsManager;
    this.nav = nav;
    this.collides = collides;
    this.joystick = joystick;

    // Phaser matches keys by the character they type, so AZERTY players get the
    // same physical cluster as Z/Q/S/D. Arrows work on every layout.
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.keys = scene.input.keyboard?.addKeys(
      {
        W: KeyCodes.W,
        Z: KeyCodes.Z,
        UP: KeyCodes.UP,
        S: KeyCodes.S,
        DOWN: KeyCodes.DOWN,
        A: KeyCodes.A,
        Q: KeyCodes.Q,
        LEFT: KeyCodes.LEFT,
        D: KeyCodes.D,
        RIGHT: KeyCodes.RIGHT,
      },
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    scene.input.on("pointerdown", this.onPointerDown, this);
  }

  update(delta: number) {
    const input = this.inputEnabled && !typingElsewhere() ? this.readInput() : { x: 0, y: 0 };
    if (this.frozen && (!(input.x || input.y) || !this.unfreeze())) return;

    const step = (MOVEMENT_SPEED * delta) / 1000;
    let manualMoved = false;
    let moving = false;
    let dx = input.x;
    let dy = input.y;

    if (dx || dy) {
      this.path.length = 0;
      this.arrive = undefined;
      const len = Math.hypot(dx, dy);
      manualMoved = this.moveBy((dx / len) * step, (dy / len) * step);
      moving = manualMoved;
      if (manualMoved && !this.movingBefore) this.signalMove("manual");
    } else if (this.path.length) {
      const pos = { x: this.player.x, y: this.player.y };
      advanceAlongPath(pos, this.path, step);
      dx = pos.x - this.player.x;
      dy = pos.y - this.player.y;
      moving = dx !== 0 || dy !== 0;
      if (moving) this.player.setPosition(pos.x, pos.y);
    }

    if (moving) {
      this.currentDirection = directionFromVector(dx, dy, this.currentDirection);
    }

    this.movingBefore = manualMoved;
    this.playAnimation(moving);
    this.syncManualMovement(manualMoved ? { x: dx, y: dy } : null, delta);
    // standing players sort by where their feet are; sitting sets its own depth
    this.player.setDepth(depthForY(this.player.y));

    if (this.arrive && !this.path.length) {
      const arrive = this.arrive;
      this.arrive = undefined;
      arrive();
    }
  }

  private readInput(): Vec {
    const joystick = this.joystick?.getVelocity();
    if (joystick && (joystick.x || joystick.y)) return joystick;
    const keys = this.keys;
    if (!keys) return { x: 0, y: 0 };
    const held = (...names: string[]) => (names.some((n) => keys[n].isDown) ? 1 : 0);
    return {
      x: held("D", "RIGHT") - held("A", "Q", "LEFT"),
      y: held("S", "DOWN") - held("W", "Z", "UP"),
    };
  }

  private moveBy(dx: number, dy: number): boolean {
    const { x, y } = this.player;
    let nx = x;
    let ny = y;
    if (dx && this.isFree(x + dx, y)) nx = x + dx;
    if (dy && this.isFree(nx, y + dy)) ny = y + dy;
    if (nx === x && ny === y) return false;
    this.player.setPosition(nx, ny);
    return true;
  }

  private isFree(x: number, y: number): boolean {
    const tile = pixelToTile(x, y);
    return isValidTile(tile.tileX, tile.tileY) && !this.collides(x, y);
  }

  private onPointerDown(
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ) {
    if (!this.inputEnabled || over.length || pointer.button !== 0) return;
    if (!this.unfreeze()) return;

    const goal = pixelToTile(pointer.worldX, pointer.worldY);
    const path = this.nav.buildPath(
      this.player.x,
      this.player.y,
      goal.tileX,
      goal.tileY,
    );
    if (!path.length) return;

    this.follow(path, goal.tileX, goal.tileY);
    this.signalMove("click");
    this.pulseTile(path[path.length - 1]);
  }

  /** Whether we are free to walk; heading somewhere else gets you out of a seat first. */
  private unfreeze(): boolean {
    if (this.frozen) this.release?.();
    return !this.frozen;
  }

  /** Every walk goes through here so everyone else sees it too. */
  private follow(path: Vec[], tileX: number, tileY: number) {
    this.path = path;
    // The others walk the path themselves, so our heading is theirs to forget.
    this.shown.sent = false;
    this.arrive = undefined;
    this.wsManager.send({ t: "walk_to", x: tileX, y: tileY });
  }

  /**
   * Walks to the reachable tile nearest a world point, then runs `arrive`.
   * Everything you click in the room goes through here, so using it from across
   * the room works the same with a mouse or a finger. Steering or clicking the
   * floor on the way drops the errand.
   */
  goTo(worldX: number, worldY: number, arrive: () => void) {
    if (!this.inputEnabled || !this.unfreeze()) return;

    const goal = pixelToTile(worldX, worldY);
    const here = pixelToTile(this.player.x, this.player.y);
    const spots: Array<{ tileX: number; tileY: number; away: number }> = [];
    for (let dy = -ARRIVE_RANGE; dy <= ARRIVE_RANGE; dy++) {
      for (let dx = -ARRIVE_RANGE; dx <= ARRIVE_RANGE; dx++) {
        const tileX = goal.tileX + dx;
        const tileY = goal.tileY + dy;
        if (this.nav.isWalkable(tileX, tileY)) {
          spots.push({ tileX, tileY, away: dx * dx + dy * dy });
        }
      }
    }
    spots.sort((a, b) => a.away - b.away);

    for (const spot of spots) {
      if (spot.tileX === here.tileX && spot.tileY === here.tileY) {
        this.path.length = 0;
        this.arrive = undefined;
        arrive();
        return;
      }
      const path = this.nav.buildPath(
        this.player.x,
        this.player.y,
        spot.tileX,
        spot.tileY,
      );
      if (!path.length) continue;
      this.follow(path, spot.tileX, spot.tileY);
      this.arrive = arrive;
      return;
    }
  }

  private signalMove(method: "manual" | "click") {
    window.dispatchEvent(
      new CustomEvent("playerMoved", { detail: { method } }),
    );
  }

  private pulseTile({ x, y }: Vec) {
    const ring = this.scene.add.circle(x, y, 9);
    ring.setStrokeStyle(2, 0xffffff, 0.8);
    ring.setDepth(900);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private playAnimation(moving: boolean) {
    this.player.play(
      this.animationManager.getAnimationKey(
        this.player.getData("spriteName") || "Adam",
        moving ? "run" : "idle",
        this.currentDirection,
      ),
      true,
    );
  }

  /**
   * Keeps everyone else's copy of us within a tile of where we are. While we
   * walk, their copy follows our last heading; we only speak up when the
   * heading changes, when their copy has drifted, and once when we stop.
   */
  private syncManualMovement(moved: Vec | null, delta: number) {
    const heading = moved ? headingOf(moved.x, moved.y) : null;

    if (heading === null) {
      // Only a walk of our own needs a full stop; a click-to-walk path ends by itself.
      if (this.shown.sent && this.shown.heading !== null) this.sendPosition(null);
      return;
    }

    if (heading !== this.shown.heading || !this.shown.sent) return this.sendPosition(heading);

    advanceHeading(this.shown, heading, (MOVEMENT_SPEED * delta) / 1000, this.nav);
    const drift = Math.hypot(this.shown.x - this.player.x, this.shown.y - this.player.y);
    if (drift > DRIFT_LIMIT) this.sendPosition(heading);
  }

  /** Our tile, with a heading while we are walking. Resets what the others see. */
  private sendPosition(heading: number | null) {
    const tile = pixelToTile(this.player.x, this.player.y);
    const centre = tileToPixel(tile.tileX, tile.tileY);
    this.shown = { ...centre, heading, sent: true };
    this.wsManager.send({ t: "move", x: tile.tileX, y: tile.tileY, ...(heading === null ? {} : { d: heading }) });
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }

  /**
   * Sitting holds the pose, so walking and the idle animation both stop.
   * `release` stands you up when you head somewhere else.
   */
  setFrozen(frozen: boolean, release?: () => void) {
    this.frozen = frozen;
    this.shown.sent = false;
    this.release = release;
    this.path.length = 0;
    this.arrive = undefined;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
  }
}
