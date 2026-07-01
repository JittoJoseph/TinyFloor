import * as Phaser from "phaser";

export class VirtualJoystickManager {
  private scene: Phaser.Scene;
  private joystickBase!: Phaser.GameObjects.Graphics;
  private joystickThumb!: Phaser.GameObjects.Graphics;
  private joystickPointer?: Phaser.Input.Pointer;
  private joystickActive: boolean = false;
  private velocity = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupVirtualJoystick();
  }

  private setupVirtualJoystick() {
    const isMobile = this.scene.cameras.main.width < 640;
    const baseX = isMobile ? 90 : 120;
    // Position higher on mobile to avoid overlapping with the bottom control bar
    const baseY = this.scene.cameras.main.height - (isMobile ? 200 : 150);
    const baseRadius = isMobile ? 60 : 70;
    const thumbRadius = isMobile ? 25 : 30;
    const maxDistance = isMobile ? 35 : 40;

    this.joystickBase = this.scene.add.graphics();
    this.joystickBase.lineStyle(3, 0xffffff, 0.3);
    this.joystickBase.fillStyle(0x000000, 0.25);
    this.joystickBase.fillCircle(baseX, baseY, baseRadius);
    this.joystickBase.strokeCircle(baseX, baseY, baseRadius);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(100000);
    this.scene.children.bringToTop(this.joystickBase);

    this.joystickThumb = this.scene.add.graphics();
    this.joystickThumb.lineStyle(2, 0x000000, 0.2);
    this.joystickThumb.fillStyle(0xffffff, 0.95);
    this.joystickThumb.fillCircle(baseX, baseY, thumbRadius);
    this.joystickThumb.strokeCircle(baseX, baseY, thumbRadius);
    this.joystickThumb.setScrollFactor(0);
    this.joystickThumb.setDepth(100001);
    this.scene.children.bringToTop(this.joystickThumb);

    this.joystickBase.setInteractive(
      new Phaser.Geom.Circle(baseX, baseY, baseRadius),
      Phaser.Geom.Circle.Contains,
    );

    this.joystickBase.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.joystickActive = true;
      this.joystickPointer = pointer;
      this.updateJoystick(pointer, baseX, baseY, maxDistance, thumbRadius);
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer === this.joystickPointer) {
        this.updateJoystick(pointer, baseX, baseY, maxDistance, thumbRadius);
      }
    });

    this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer === this.joystickPointer) {
        this.joystickActive = false;
        this.joystickPointer = undefined;
        this.resetJoystick(baseX, baseY, thumbRadius);
      }
    });
  }

  private updateJoystick(
    pointer: Phaser.Input.Pointer,
    baseX: number,
    baseY: number,
    maxDistance: number,
    thumbRadius: number,
  ) {
    const dx = pointer.x - baseX;
    const dy = pointer.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    const thumbX = baseX + Math.cos(angle) * clampedDistance;
    const thumbY = baseY + Math.sin(angle) * clampedDistance;

    this.joystickThumb.clear();
    this.joystickThumb.lineStyle(2, 0x000000, 0.2);
    this.joystickThumb.fillStyle(0xffffff, 0.95);
    this.joystickThumb.fillCircle(thumbX, thumbY, thumbRadius);
    this.joystickThumb.strokeCircle(thumbX, thumbY, thumbRadius);

    if (clampedDistance > 0) {
      const angleDeg = (angle * 180) / Math.PI;
      if (angleDeg >= -22.5 && angleDeg < 22.5) {
        this.velocity.x = 1;
        this.velocity.y = 0;
      } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
        this.velocity.x = 0.707;
        this.velocity.y = 0.707;
      } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
        this.velocity.x = 0;
        this.velocity.y = 1;
      } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
        this.velocity.x = -0.707;
        this.velocity.y = 0.707;
      } else if (angleDeg >= 157.5 || angleDeg < -157.5) {
        this.velocity.x = -1;
        this.velocity.y = 0;
      } else if (angleDeg >= -157.5 && angleDeg < -112.5) {
        this.velocity.x = -0.707;
        this.velocity.y = -0.707;
      } else if (angleDeg >= -112.5 && angleDeg < -67.5) {
        this.velocity.x = 0;
        this.velocity.y = -1;
      } else if (angleDeg >= -67.5 && angleDeg < -22.5) {
        this.velocity.x = 0.707;
        this.velocity.y = -0.707;
      }
    } else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
  }

  private resetJoystick(baseX: number, baseY: number, thumbRadius: number) {
    this.joystickThumb.clear();
    this.joystickThumb.lineStyle(2, 0x000000, 0.2);
    this.joystickThumb.fillStyle(0xffffff, 0.95);
    this.joystickThumb.fillCircle(baseX, baseY, thumbRadius);
    this.joystickThumb.strokeCircle(baseX, baseY, thumbRadius);

    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  getVelocity() {
    return { ...this.velocity };
  }

  destroy() {
    this.joystickBase.destroy();
    this.joystickThumb.destroy();
  }
}
