import * as Phaser from 'phaser';

export type CharacterName = 'Adam' | 'Alex' | 'Amelia' | 'Bob';
export type AnimationState = 'idle' | 'run';
export type Direction = 'right' | 'up' | 'left' | 'down' | 'up-right' | 'up-left' | 'down-right' | 'down-left';

export class AnimationManager {
  private scene: Phaser.Scene;
  private static readonly CHARACTERS: CharacterName[] = ['Adam', 'Alex', 'Amelia', 'Bob'];
  private static readonly FRAME_RATE = 10;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    AnimationManager.CHARACTERS.forEach(char => {
      // Load Idle Spritesheet (384x32 -> 24 frames of 16x32)
      this.scene.load.spritesheet(`${char}_idle`, `/characters/${char}_idle_anim_16x16.png`, {
        frameWidth: 16,
        frameHeight: 32
      });

      // Load Run Spritesheet (384x32 -> 24 frames of 16x32)
      this.scene.load.spritesheet(`${char}_run`, `/characters/${char}_run_16x16.png`, {
        frameWidth: 16,
        frameHeight: 32
      });
    });
  }

  create() {
    AnimationManager.CHARACTERS.forEach(char => {
      this.createAnimSet(char, 'idle');
      this.createAnimSet(char, 'run');
    });
  }

  private createAnimSet(char: CharacterName, state: AnimationState) {
    const keyBase = `${char}_${state}`;
    
    // Right: Frames 0-5
    this.scene.anims.create({
      key: `${keyBase}_right`,
      frames: this.scene.anims.generateFrameNumbers(keyBase, { start: 0, end: 5 }),
      frameRate: AnimationManager.FRAME_RATE,
      repeat: -1
    });

    // Up: Frames 6-11
    this.scene.anims.create({
      key: `${keyBase}_up`,
      frames: this.scene.anims.generateFrameNumbers(keyBase, { start: 6, end: 11 }),
      frameRate: AnimationManager.FRAME_RATE,
      repeat: -1
    });

    // Left: Frames 12-17
    this.scene.anims.create({
      key: `${keyBase}_left`,
      frames: this.scene.anims.generateFrameNumbers(keyBase, { start: 12, end: 17 }),
      frameRate: AnimationManager.FRAME_RATE,
      repeat: -1
    });

    // Down: Frames 18-23
    this.scene.anims.create({
      key: `${keyBase}_down`,
      frames: this.scene.anims.generateFrameNumbers(keyBase, { start: 18, end: 23 }),
      frameRate: AnimationManager.FRAME_RATE,
      repeat: -1
    });
  }

  getAnimationKey(char: string, state: AnimationState, direction: Direction): string {
    // Map diagonal directions to cardinal directions for animation
    const animDirection = this.getAnimationDirection(direction);
    return `${char}_${state}_${animDirection}`;
  }

  private getAnimationDirection(direction: Direction): 'right' | 'up' | 'left' | 'down' {
    switch (direction) {
      case 'up-right':
      case 'right':
        return 'right';
      case 'up-left':
      case 'up':
        return 'up';
      case 'down-left':
      case 'left':
        return 'left';
      case 'down-right':
      case 'down':
        return 'down';
      default:
        return 'down';
    }
  }
}
