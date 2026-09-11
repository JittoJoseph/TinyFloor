import * as Phaser from "phaser";
import { AnimationManager, CardinalDirection } from "./AnimationManager";
import { ChairSpec, depthForY } from "./MapManager";
import { WebSocketManager } from "./WebSocketManager";
import { sceneText } from "./sceneText";

/**
 * Where a seated character sits relative to the chair's base, and whether they
 * draw in front of the chair or behind it. Facing away puts you behind the
 * backrest, which is what makes the desk in front read as covering your legs.
 */
const SEAT: Record<
  CardinalDirection,
  { dx: number; dy: number; depth: number; exit: number }
> = {
  down: { dx: 0, dy: -12, depth: -0.5, exit: -54 },
  up: { dx: 0, dy: -32, depth: -2, exit: 20 },
  left: { dx: 0, dy: -20, depth: 2, exit: 20 },
  right: { dx: 0, dy: -20, depth: 2, exit: 20 },
};

const REACH = 56;
const HIGHLIGHT = 0xff4e00;
const PROMPT_DEPTH = 99000;

interface Seat extends ChairSpec {
  baseY: number;
  taken: boolean;
}

export class SeatManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private animations: AnimationManager;
  private ws?: WebSocketManager;
  private seats: Seat[] = [];
  private ring: Phaser.GameObjects.Graphics;
  private prompt: Phaser.GameObjects.Container;
  private promptLabel: Phaser.GameObjects.Text;
  private hitAreas: Phaser.GameObjects.Zone[] = [];
  private nearest?: Seat;
  private seated?: Seat;
  private onSitChange?: (seated: boolean) => void;
  private onApproach?: (x: number, y: number) => void;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animations: AnimationManager,
    chairs: ChairSpec[],
  ) {
    this.scene = scene;
    this.player = player;
    this.animations = animations;
    this.seats = chairs.map((c) => ({ ...c, baseY: c.y + 16, taken: false }));

    this.ring = scene.add.graphics();
    this.promptLabel = scene.add
      .text(0, 0, "", {
        fontSize: "13px",
        fontFamily: "VT323, monospace",
        color: "#ffffff",
        resolution: 2,
      })
      .setOrigin(0.5);
    const background = scene.add.graphics();
    this.prompt = scene.add
      .container(0, 0, [background, this.promptLabel])
      .setDepth(PROMPT_DEPTH)
      .setVisible(false);
    this.prompt.setData("background", background);

    this.seats.forEach((seat) => {
      const zone = scene.add
        .zone(seat.x, seat.y, 40, 44)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (this.seated) this.stand();
        else if (this.nearest === seat) this.sit(seat);
        else this.onApproach?.(seat.x, seat.baseY);
      });
      this.hitAreas.push(zone);
    });

    scene.input.keyboard?.on("keydown-E", () => this.toggle());
  }

  attach(
    ws: WebSocketManager,
    onSitChange: (seated: boolean) => void,
    onApproach: (x: number, y: number) => void,
  ) {
    this.ws = ws;
    this.onSitChange = onSitChange;
    this.onApproach = onApproach;
  }

  isSeated(): boolean {
    return Boolean(this.seated);
  }

  toggle() {
    if (this.seated) this.stand();
    else if (this.nearest) this.sit(this.nearest);
  }

  private sit(seat: Seat) {
    const shift = SEAT[seat.direction];
    this.seated = seat;
    seat.taken = true;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setPosition(seat.x + shift.dx, seat.baseY + shift.dy);
    this.player.anims.stop();
    this.player.setFrame(this.animations.getSitFrame(seat.direction));
    this.player.setDepth(depthForY(seat.baseY) + shift.depth);

    this.onSitChange?.(true);
    this.ws?.send("sit", {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      direction: seat.direction,
    });
    this.drawPrompt(sceneText().stand);
  }

  private stand() {
    const seat = this.seated;
    if (!seat) return;
    this.seated = undefined;
    seat.taken = false;

    this.player.setPosition(seat.x, seat.baseY + SEAT[seat.direction].exit);
    this.player.play(
      this.animations.getAnimationKey(
        this.player.getData("spriteName") || "Adam",
        "idle",
        seat.direction,
      ),
      true,
    );
    this.onSitChange?.(false);
    this.ws?.send("stand", {});
  }

  private drawPrompt(text: string) {
    this.promptLabel.setText(text);
    const background = this.prompt.getData(
      "background",
    ) as Phaser.GameObjects.Graphics;
    const width = this.promptLabel.width + 20;
    background.clear();
    background.fillStyle(0x1f2937, 0.9);
    background.fillRoundedRect(-width / 2, -11, width, 22, 11);
  }

  update() {
    if (this.seated) {
      this.prompt.setVisible(true);
      this.prompt.setPosition(this.seated.x, this.seated.baseY + 26);
      this.ring.clear();
      return;
    }

    let best: Seat | undefined;
    let bestDistance = REACH;
    for (const seat of this.seats) {
      if (seat.taken) continue;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        seat.x,
        seat.baseY,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = seat;
      }
    }

    if (best === this.nearest) {
      if (best) this.player.setDepth(depthForY(this.player.y));
      return;
    }
    this.nearest = best;

    this.ring.clear();
    if (!best) {
      this.prompt.setVisible(false);
      return;
    }

    // sit the outline at the chair's own depth so a desk hides the half of it
    // that hides the chair
    this.ring.setDepth(
      depthForY(best.baseY) + (best.direction === "down" ? -0.5 : 0.5),
    );
    this.ring.lineStyle(2, HIGHLIGHT, 0.9);
    this.ring.strokeRoundedRect(best.x - 17, best.baseY - 44, 34, 46, 6);
    this.drawPrompt(sceneText().sit);
    this.prompt.setVisible(true);
    this.prompt.setPosition(best.x, best.baseY + 22);
  }

  destroy() {
    this.scene.input.keyboard?.off("keydown-E");
    this.hitAreas.forEach((zone) => zone.destroy());
    this.ring.destroy();
    this.prompt.destroy();
  }
}
