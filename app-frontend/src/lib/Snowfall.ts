import * as Phaser from "phaser";

/** How many flakes are in view at once, and how fast they fall and drift (floor pixels a second). */
const FLAKES = 70;
const FALL = [14, 30];
const SWAY = 10;
const KEY = "snowflake";

/**
 * Snow drifting down over the floor (lib/christmas): a fixed set of flakes
 * that fall and sway through the view and wrap round it, so the cost stays
 * the same however far the view moves. Above the floor and everyone on it,
 * below nothing that matters: it's a few pale dots.
 */
export class Snowfall {
  private flakes: Array<{ image: Phaser.GameObjects.Image; speed: number; phase: number; sway: number }> = [];

  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists(KEY)) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
      g.generateTexture(KEY, 2, 2);
      g.destroy();
    }
    const view = scene.cameras.main.worldView;
    for (let n = 0; n < FLAKES; n++) {
      const big = Math.random() < 0.3;
      const image = scene.add
        .image(view.x + Math.random() * view.width, view.y + Math.random() * view.height, KEY)
        .setScale(big ? 1.5 : 1)
        .setAlpha(big ? 0.85 : 0.6)
        .setDepth(1e6);
      this.flakes.push({ image, speed: Phaser.Math.FloatBetween(FALL[0], FALL[1]) * (big ? 1.3 : 1), phase: Math.random() * Math.PI * 2, sway: Math.random() * SWAY });
    }
  }

  update(time: number, delta: number) {
    const view = this.scene.cameras.main.worldView;
    const dt = delta / 1000;
    for (const flake of this.flakes) {
      const { image } = flake;
      image.y += flake.speed * dt;
      image.x += Math.sin(time / 900 + flake.phase) * flake.sway * dt;
      // Out of view, it comes round again on the other side.
      if (image.y > view.bottom) image.y -= view.height;
      else if (image.y < view.y) image.y += view.height;
      if (image.x > view.right) image.x -= view.width;
      else if (image.x < view.x) image.x += view.width;
    }
  }

  destroy() {
    for (const flake of this.flakes) flake.image.destroy();
    this.flakes = [];
  }
}
