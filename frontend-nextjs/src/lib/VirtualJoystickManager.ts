import * as Phaser from "phaser";

const OCTANT = Math.PI / 4;

const round = (value: number) => Math.round(value * 1000) / 1000;

export class VirtualJoystickManager {
  private scene: Phaser.Scene;
  private base!: Phaser.GameObjects.Graphics;
  private thumb!: Phaser.GameObjects.Graphics;
  private pointer?: Phaser.Input.Pointer;
  private velocity = { x: 0, y: 0 };
  private baseX: number;
  private baseY: number;
  private thumbRadius: number;
  private maxDistance: number;
  private onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  private onPointerUp: (pointer: Phaser.Input.Pointer) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const compact = scene.cameras.main.width < 640;
    this.baseX = compact ? 90 : 120;
    this.baseY = scene.cameras.main.height - (compact ? 200 : 150);
    this.thumbRadius = compact ? 25 : 30;
    this.maxDistance = compact ? 35 : 40;
    const baseRadius = compact ? 60 : 70;

    this.base = scene.add.graphics();
    this.base.lineStyle(3, 0xffffff, 0.3);
    this.base.fillStyle(0x000000, 0.25);
    this.base.fillCircle(this.baseX, this.baseY, baseRadius);
    this.base.strokeCircle(this.baseX, this.baseY, baseRadius);
    this.base.setScrollFactor(0).setDepth(100000);
    this.base.setInteractive(
      new Phaser.Geom.Circle(this.baseX, this.baseY, baseRadius),
      Phaser.Geom.Circle.Contains,
    );

    this.thumb = scene.add.graphics();
    this.thumb.setScrollFactor(0).setDepth(100001);
    this.drawThumb(this.baseX, this.baseY);

    this.onPointerMove = (pointer) => {
      if (pointer === this.pointer) this.moveThumb(pointer);
    };
    this.onPointerUp = (pointer) => {
      if (pointer !== this.pointer) return;
      this.pointer = undefined;
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.drawThumb(this.baseX, this.baseY);
    };

    this.base.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointer = pointer;
      this.moveThumb(pointer);
    });
    scene.input.on("pointermove", this.onPointerMove);
    scene.input.on("pointerup", this.onPointerUp);
  }

  private moveThumb(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const distance = Math.min(Math.hypot(dx, dy), this.maxDistance);
    const angle = Math.atan2(dy, dx);

    this.drawThumb(
      this.baseX + Math.cos(angle) * distance,
      this.baseY + Math.sin(angle) * distance,
    );

    const snapped = Math.round(angle / OCTANT) * OCTANT;
    this.velocity.x = distance > 0 ? round(Math.cos(snapped)) : 0;
    this.velocity.y = distance > 0 ? round(Math.sin(snapped)) : 0;
  }

  private drawThumb(x: number, y: number) {
    this.thumb.clear();
    this.thumb.lineStyle(2, 0x000000, 0.2);
    this.thumb.fillStyle(0xffffff, 0.95);
    this.thumb.fillCircle(x, y, this.thumbRadius);
    this.thumb.strokeCircle(x, y, this.thumbRadius);
  }

  getVelocity() {
    return this.velocity;
  }

  destroy() {
    this.scene.input.off("pointermove", this.onPointerMove);
    this.scene.input.off("pointerup", this.onPointerUp);
    this.base.destroy();
    this.thumb.destroy();
  }
}
