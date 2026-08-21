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

    this.keys = scene.input.keyboard?.addKeys(
      {
        W: Phaser.Input.Keyboard.KeyCodes.W,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      },
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    scene.input.on("pointerdown", this.onPointerDown, this);
  }

  update(delta: number) {
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

    this.playAnimation(moving);
    this.syncManualMovement(manualMoved);
  }

  private readInput(): Vec {
    const joystick = this.joystick?.getVelocity();
    if (joystick && (joystick.x || joystick.y)) return joystick;
    if (!this.keys) return { x: 0, y: 0 };
    return {
      x: (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0),
      y: (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0),
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

    const goal = pixelToTile(pointer.worldX, pointer.worldY);
    const path = this.nav.buildPath(
      this.player.x,
      this.player.y,
      goal.tileX,
      goal.tileY,
    );
    if (!path.length) return;

    this.path = path;
    this.pulseTile(path[path.length - 1]);
    this.wsManager.send("walk_to", {
      tileX: goal.tileX,
      tileY: goal.tileY,
    });
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

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
  }
}
