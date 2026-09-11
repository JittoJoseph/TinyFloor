import * as Phaser from "phaser";
import {
  AnimationManager,
  Direction,
  directionFromVector,
} from "./AnimationManager";
import { WebSocketManager } from "./WebSocketManager";
import { VirtualJoystickManager } from "./VirtualJoystickManager";
import { NavGrid, Vec, advanceAlongPath } from "./Navigation";
import { pixelToTile, isValidTile, MOVEMENT_SPEED } from "./types";

const APPROACH_RANGE = 3;

export class MovementManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private animationManager: AnimationManager;
  private wsManager: WebSocketManager;
  private nav: NavGrid;
  private collides: (x: number, y: number) => boolean;
  private joystick?: VirtualJoystickManager;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private path: Vec[] = [];
  private currentDirection: Direction = "down";
  private lastSentTile = "";
  private needsFinalSend = false;
  private inputEnabled = true;
  private frozen = false;
  private movingBefore = false;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animationManager: AnimationManager,
    wsManager: WebSocketManager,
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
    if (this.frozen) return;
    const step = (MOVEMENT_SPEED * delta) / 1000;
    const input = this.inputEnabled ? this.readInput() : { x: 0, y: 0 };
    let manualMoved = false;
    let moving = false;
    let dx = input.x;
    let dy = input.y;

    if (dx || dy) {
      this.path.length = 0;
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
    this.syncManualMovement(manualMoved);
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
    if (this.frozen || !this.inputEnabled || over.length || pointer.button !== 0)
      return;

    const goal = pixelToTile(pointer.worldX, pointer.worldY);
    const path = this.nav.buildPath(
      this.player.x,
      this.player.y,
      goal.tileX,
      goal.tileY,
    );
    if (!path.length) return;

    this.path = path;
    this.signalMove("click");
    this.pulseTile(path[path.length - 1]);
    this.wsManager.send("walk_to", {
      tileX: goal.tileX,
      tileY: goal.tileY,
    });
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

  private syncManualMovement(manualMoved: boolean) {
    const tile = pixelToTile(this.player.x, this.player.y);
    const key = `${tile.tileX},${tile.tileY}`;

    if (manualMoved) {
      this.needsFinalSend = true;
      if (key === this.lastSentTile) return;
    } else if (this.needsFinalSend && !this.path.length) {
      this.needsFinalSend = false;
    } else {
      return;
    }

    this.lastSentTile = key;
    this.wsManager.send("move", { tileX: tile.tileX, tileY: tile.tileY });
  }

  /**
   * Walks to the closest walkable tile beside a world point, so clicking a chair
   * or the board from across the room takes you there instead of doing nothing.
   */
  approach(worldX: number, worldY: number): boolean {
    if (this.frozen || !this.inputEnabled) return false;
    const goal = pixelToTile(worldX, worldY);
    const candidates: Array<{ tileX: number; tileY: number; away: number }> = [];
    for (let dy = -APPROACH_RANGE; dy <= APPROACH_RANGE; dy++) {
      for (let dx = -APPROACH_RANGE; dx <= APPROACH_RANGE; dx++) {
        const tileX = goal.tileX + dx;
        const tileY = goal.tileY + dy;
        if (!isValidTile(tileX, tileY)) continue;
        if (!this.nav.isWalkable(tileX, tileY)) continue;
        candidates.push({ tileX, tileY, away: dx * dx + dy * dy });
      }
    }
    candidates.sort((a, b) => a.away - b.away);
    for (const candidate of candidates) {
      const path = this.nav.buildPath(
        this.player.x,
        this.player.y,
        candidate.tileX,
        candidate.tileY,
      );
      if (path.length) {
        this.path = path;
        return true;
      }
    }
    return false;
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }

  /** Sitting holds the pose, so movement and the idle animation both stop. */
  setFrozen(frozen: boolean) {
    this.frozen = frozen;
    if (frozen) {
      this.path.length = 0;
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
  }
}
