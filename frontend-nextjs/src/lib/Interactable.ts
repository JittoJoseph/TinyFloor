import * as Phaser from "phaser";
import { SceneLabel } from "./SceneLabel";

const REACH = 210;
const HINT_GAP = 20;
const HINT_RISE = 6;
const STAND_GAP = 32;

/** Walk next to a world point, then run `arrive`. */
export type GoTo = (x: number, y: number, arrive: () => void) => void;

/**
 * Something in the room you use by clicking or tapping it. From any distance
 * that walks you over and uses it on arrival; its hint fades in while you are
 * close. `anchor` is the bottom centre of the thing.
 */
export class Interactable {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private anchor: { x: number; y: number };
  private hint: Phaser.GameObjects.Container;
  private onReach: (inReach: boolean) => void;
  private inReach = false;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    anchor: { x: number; y: number },
    target: Phaser.GameObjects.Zone | Phaser.GameObjects.Image,
    label: string,
    goTo: GoTo,
    use: () => void,
    onReach: (inReach: boolean) => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.anchor = anchor;
    this.onReach = onReach;
    this.hint = new SceneLabel(scene, anchor.x, anchor.y + HINT_GAP, label)
      .container.setDepth(anchor.y + 0.2)
      .setAlpha(0)
      .setVisible(false);

    target
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        goTo(anchor.x, anchor.y + STAND_GAP, use);
      });
  }

  /** How far the player is, for things that also fade with distance. */
  update(): number {
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.anchor.x,
      this.anchor.y,
    );
    const inReach = distance < REACH;
    if (inReach === this.inReach) return distance;

    this.inReach = inReach;
    this.onReach(inReach);
    this.hint.setVisible(true);
    this.scene.tweens.add({
      targets: this.hint,
      alpha: inReach ? 1 : 0,
      y: this.anchor.y + HINT_GAP - (inReach ? HINT_RISE : 0),
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => this.hint.setVisible(this.inReach),
    });
    return distance;
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.hint);
    this.hint.destroy();
  }
}
