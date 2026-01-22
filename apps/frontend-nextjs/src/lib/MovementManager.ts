import * as Phaser from "phaser";
import { AnimationManager, Direction } from "./AnimationManager";
import { WebSocketManager } from "./WebSocketManager";
import { TILE_SIZE, pixelToTile, isValidTile } from "./types";

const MOVEMENT_SPEED = 120; // pixels per second
const POSITION_UPDATE_INTERVAL = 100; // ms

export class MovementManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private animationManager: AnimationManager;
  private currentDirection: Direction = "down";
  private playerId: string;
  private wsManager: WebSocketManager;
  private isMobile: boolean;
  private joystickVelocity = { x: 0, y: 0 };
  private isMoving = false;
  private lastPositionUpdate = 0;
  private collisionChecker?: (x: number, y: number) => boolean;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animationManager: AnimationManager,
    playerId: string,
    wsManager: WebSocketManager,
    isMobile: boolean = false,
  ) {
    this.scene = scene;
    this.player = player;
    this.animationManager = animationManager;
    this.playerId = playerId;
    this.wsManager = wsManager;
    this.isMobile = isMobile;

    this.setupInput();
  }

  private setupInput() {
    if (!this.isMobile) {
      this.wasdKeys = this.scene.input.keyboard!.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<string, Phaser.Input.Keyboard.Key>;
    }
  }

  update(delta: number): { moved: boolean; direction: Direction } {
    const now = this.scene.time.now;
    let moved = false;
    let newDirection: Direction = this.currentDirection;

    if (this.isMobile) {
      if (
        Math.abs(this.joystickVelocity.x) > 0.1 ||
        Math.abs(this.joystickVelocity.y) > 0.1
      ) {
        const velocity = new Phaser.Math.Vector2(
          this.joystickVelocity.x,
          this.joystickVelocity.y,
        );
        velocity.normalize();
        velocity.scale((MOVEMENT_SPEED * delta) / 1000);

        const newX = this.player.x + velocity.x;
        const newY = this.player.y + velocity.y;

        if (this.isValidPosition(newX, newY)) {
          this.player.setPosition(newX, newY);
          newDirection = this.getDirectionFromVector(
            this.joystickVelocity.x,
            this.joystickVelocity.y,
          );
          this.isMoving = true;
          moved = true;
        }
      } else {
        this.isMoving = false;
      }
    } else {
      const moveVector = this.getKeyboardMovementVector();

      if (moveVector.x !== 0 || moveVector.y !== 0) {
        const velocity = new Phaser.Math.Vector2(moveVector.x, moveVector.y);
        velocity.normalize();
        velocity.scale((MOVEMENT_SPEED * delta) / 1000);

        const newX = this.player.x + velocity.x;
        const newY = this.player.y + velocity.y;

        if (this.isValidPosition(newX, newY)) {
          this.player.setPosition(newX, newY);
          newDirection = this.getDirectionFromVector(
            moveVector.x,
            moveVector.y,
          );
          this.isMoving = true;
          moved = true;
        }
      } else {
        this.isMoving = false;
      }
    }

    this.updateAnimation(newDirection);

    if (moved && now - this.lastPositionUpdate > POSITION_UPDATE_INTERVAL) {
      this.sendCurrentPosition();
      this.lastPositionUpdate = now;
    }

    this.currentDirection = newDirection;
    return { moved, direction: newDirection };
  }

  private getKeyboardMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.wasdKeys.W.isDown) y -= 1;
    if (this.wasdKeys.S.isDown) y += 1;
    if (this.wasdKeys.A.isDown) x -= 1;
    if (this.wasdKeys.D.isDown) x += 1;

    return { x, y };
  }

  private isValidPosition(pixelX: number, pixelY: number): boolean {
    const tile = pixelToTile(pixelX, pixelY);
    if (!isValidTile(tile.tileX, tile.tileY)) {
      return false;
    }

    if (this.collisionChecker) {
      return !this.collisionChecker(pixelX, pixelY);
    }

    return true;
  }

  private getDirectionFromVector(x: number, y: number): Direction {
    if (x > 0 && y < 0) return "up-right";
    if (x < 0 && y < 0) return "up-left";
    if (x > 0 && y > 0) return "down-right";
    if (x < 0 && y > 0) return "down-left";
    if (x > 0) return "right";
    if (x < 0) return "left";
    if (y < 0) return "up";
    if (y > 0) return "down";
    return this.currentDirection;
  }

  private updateAnimation(direction: Direction) {
    const spriteName = this.player.getData("spriteName") || "Adam";
    const state = this.isMoving ? "run" : "idle";
    const animKey = this.animationManager.getAnimationKey(
      spriteName,
      state,
      direction,
    );
    this.player.play(animKey, true);
  }

  private sendCurrentPosition() {
    const tilePos = pixelToTile(this.player.x, this.player.y);
    this.wsManager.send("move", {
      tileX: tilePos.tileX,
      tileY: tilePos.tileY,
      direction: this.currentDirection,
    });
  }

  setCollisionChecker(checker: (x: number, y: number) => boolean) {
    this.collisionChecker = checker;
  }

  setJoystickVelocity(vx: number, vy: number) {
    this.joystickVelocity.x = vx;
    this.joystickVelocity.y = vy;
  }

  getCurrentTile(): { x: number; y: number } {
    const tilePos = pixelToTile(this.player.x, this.player.y);
    return { x: tilePos.tileX, y: tilePos.tileY };
  }
}
