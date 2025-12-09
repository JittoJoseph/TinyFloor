import * as Phaser from 'phaser';
import { AnimationManager, Direction } from './AnimationManager';
import { WebSocketManager } from './WebSocketManager';

export class MovementManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private animationManager: AnimationManager;
  private currentDirection: Direction = 'down';
  private playerId: string;
  private wsManager: WebSocketManager;
  private isMobile: boolean;
  private joystickVelocity = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animationManager: AnimationManager,
    playerId: string,
    wsManager: WebSocketManager,
    isMobile: boolean = false
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
      this.cursors = this.scene.input.keyboard!.createCursorKeys();
      this.wasdKeys = this.scene.input.keyboard!.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as Record<string, Phaser.Input.Keyboard.Key>;
    }
  }

  update(): { moved: boolean; direction: Direction } {
    if (!this.player.body) return { moved: false, direction: this.currentDirection };

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    let velocityX = 0;
    let velocityY = 0;

    if (this.isMobile) {
      velocityX = this.joystickVelocity.x;
      velocityY = this.joystickVelocity.y;
    } else {
      if (this.wasdKeys.A.isDown) velocityX = -1;
      else if (this.wasdKeys.D.isDown) velocityX = 1;

      if (this.wasdKeys.W.isDown) velocityY = -1;
      else if (this.wasdKeys.S.isDown) velocityY = 1;
    }

    let moved = false;
    if (velocityX !== 0 || velocityY !== 0) {
      // Normalize vector to prevent faster diagonal movement
      const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      velocityX = (velocityX / length) * 100; // speed
      velocityY = (velocityY / length) * 100;

      body.setVelocity(velocityX, velocityY);
      moved = true;

      // Calculate direction based on velocity vector
      this.currentDirection = this.calculateDirection(velocityX, velocityY);

      // Play run animation
      const spriteName = this.player.getData('spriteName') || 'Adam';
      const animKey = this.animationManager.getAnimationKey(spriteName, 'run', this.currentDirection);
      this.player.play(animKey, true);
    } else {
      // Play idle animation
      const spriteName = this.player.getData('spriteName') || 'Adam';
      const animKey = this.animationManager.getAnimationKey(spriteName, 'idle', this.currentDirection);
      this.player.play(animKey, true);
    }

    return { moved, direction: this.currentDirection };
  }

  private calculateDirection(dx: number, dy: number): Direction {
    if (dx === 0 && dy === 0) return this.currentDirection;

    // For diagonal movement, determine the primary direction based on angle
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Define angle ranges for each direction
    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= -135 && angle < -45) return 'up';
    return 'left';
  }

  sendMovement() {
    if (this.wsManager) {
      this.wsManager.send("move", {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        direction: this.currentDirection,
      });
    }
  }

  setJoystickVelocity(vx: number, vy: number) {
    this.joystickVelocity.x = vx;
    this.joystickVelocity.y = vy;
  }
}