import * as Phaser from "phaser";
import { AnimationManager, CardinalDirection } from "./AnimationManager";
import { ChairSpec, MapAnchor, depthForY } from "./MapManager";
import { WebSocketManager } from "./WebSocketManager";
import { callManager } from "./CallManager";
import type { GoTo } from "./Interactable";
import { SceneLabel } from "./SceneLabel";
import { sceneText } from "./sceneText";
import { pixelToTile } from "./types";

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
const IDLE = 0x9ca3af;
const PROMPT_DEPTH = 99000;
const SELF = "self";

/** Chairs in this map zone put whoever sits down into the table's call. */
const MEETING_ZONE = "meeting";

export interface SeatPose {
  x: number;
  y: number;
  depth: number;
  frame: number;
  direction: CardinalDirection;
  standX: number;
  standY: number;
}

interface Seat extends ChairSpec {
  baseY: number;
  occupant?: string;
}

export class SeatManager {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private animations: AnimationManager;
  private ws?: WebSocketManager;
  private seats: Seat[] = [];
  private byId = new Map<number, Seat>();
  private ring: Phaser.GameObjects.Graphics;
  private prompt: SceneLabel;
  private tag?: SceneLabel;
  private hitAreas: Phaser.GameObjects.Zone[] = [];
  private nearest?: Seat;
  private seated?: Seat;
  private dirty = false;
  // the E hints mean nothing without a keyboard; on touch the outline and a tap do
  private keyboard: boolean;
  private onSitChange?: (seated: boolean, casual: boolean) => void;
  private goTo?: GoTo;
  private onMeetingChange?: (people: ReadonlySet<string> | null) => void;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    animations: AnimationManager,
    chairs: ChairSpec[],
    table?: MapAnchor,
  ) {
    this.scene = scene;
    this.player = player;
    this.animations = animations;
    this.keyboard = scene.sys.game.device.os.desktop;
    this.seats = chairs.map((c) => ({ ...c, baseY: c.y + 16 }));
    this.seats.forEach((seat) => this.byId.set(seat.id, seat));

    this.ring = scene.add.graphics();
    this.prompt = new SceneLabel(scene, 0, 0, "");
    this.prompt.container.setDepth(PROMPT_DEPTH).setVisible(false);

    // a tag in the middle of the meeting table, so anyone walking past can see
    // whether a call is on
    if (table && this.seats.some((seat) => seat.zone === MEETING_ZONE)) {
      this.tag = new SceneLabel(
        scene,
        table.x + table.width / 2,
        table.y + table.height / 2,
        "",
        true,
      );
      this.tag.container.setDepth(table.y + table.height + 1);
      this.changed();
    }

    this.seats.forEach((seat) => {
      const zone = scene.add
        .zone(seat.x, seat.y, 40, 44)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (this.seated === seat) return this.stand();
        if (seat.occupant) return;
        // walk over and sit, unless someone beats us to it; from a casual seat
        // this gets you up first, from a meeting chair it does nothing
        const { standX, standY } = this.poseFor(seat);
        this.goTo?.(standX, standY, () => {
          if (!seat.occupant && !this.seated) this.sit(seat);
        });
      });
      this.hitAreas.push(zone);
    });

    scene.input.keyboard?.on("keydown-E", () => this.toggle());
  }

  /**
   * `onSitChange` hears whether we sat or stood, and whether the seat is casual
   * enough to leave just by heading somewhere else. Meeting chairs are not.
   */
  attach(
    ws: WebSocketManager,
    onSitChange: (seated: boolean, casual: boolean) => void,
    goTo: GoTo,
    onMeetingChange: (people: ReadonlySet<string> | null) => void,
  ) {
    this.ws = ws;
    this.onSitChange = onSitChange;
    this.goTo = goTo;
    this.onMeetingChange = onMeetingChange;
  }

  seatedDirection(): CardinalDirection | undefined {
    return this.seated?.direction;
  }

  toggle() {
    if (this.seated) this.stand();
    else if (this.nearest && !this.nearest.occupant) this.sit(this.nearest);
  }

  leave() {
    this.stand();
  }

  poseFor(seat: Seat): SeatPose {
    const shift = SEAT[seat.direction];
    return {
      x: seat.x + shift.dx,
      y: seat.baseY + shift.dy,
      depth: depthForY(seat.baseY) + shift.depth,
      frame: this.animations.getSitFrame(seat.direction),
      direction: seat.direction,
      standX: seat.x,
      standY: seat.baseY + shift.exit,
    };
  }

  /** Someone else sat down, so the chair is theirs and no longer offered to us. */
  occupy(seatId: number, playerId: string): SeatPose | undefined {
    this.release(playerId);
    const seat = this.byId.get(seatId);
    if (!seat) return undefined;
    seat.occupant = playerId;
    this.changed();
    return this.poseFor(seat);
  }

  release(playerId: string) {
    this.seats.forEach((seat) => {
      if (seat.occupant === playerId) seat.occupant = undefined;
    });
    this.changed();
  }

  /** The server gave the chair to whoever asked first. */
  rejected() {
    this.stand();
  }

  /**
   * Keeps the table tag's count current, and while we are at the table tells
   * the scene who else is, since the cards carry their names then.
   */
  private changed() {
    this.dirty = true;
    const people = this.seats
      .filter((seat) => seat.zone === MEETING_ZONE && seat.occupant)
      .map((seat) => seat.occupant!);
    const label = sceneText().meeting;
    this.tag
      ?.setText(people.length ? `${label} · ${people.length}` : label)
      .setDot(people.length ? HIGHLIGHT : IDLE);
    this.onMeetingChange?.(
      this.seated?.zone === MEETING_ZONE ? new Set(people) : null,
    );
  }

  private sit(seat: Seat) {
    const pose = this.poseFor(seat);
    const meeting = seat.zone === MEETING_ZONE;
    this.seated = seat;
    seat.occupant = SELF;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setPosition(pose.x, pose.y);
    this.player.anims.stop();
    this.player.setFrame(pose.frame);
    this.player.setDepth(pose.depth);

    this.onSitChange?.(true, !meeting);
    this.changed();

    const tile = pixelToTile(seat.x, seat.y);
    this.ws?.send("sit", {
      seat: seat.id,
      tileX: tile.tileX,
      tileY: tile.tileY,
      meeting: meeting ? MEETING_ZONE : undefined,
    });
    this.ring.clear();
    // at the meeting table the call is the focus, and E still gets you up
    this.prompt
      .setText(sceneText().stand)
      .container.setVisible(this.keyboard && !meeting);
  }

  private stand() {
    const seat = this.seated;
    if (!seat) return;
    this.seated = undefined;
    if (seat.occupant === SELF) seat.occupant = undefined;

    const pose = this.poseFor(seat);
    this.player.setPosition(pose.standX, pose.standY);
    this.player.play(
      this.animations.getAnimationKey(
        this.player.getData("spriteName") || "Adam",
        "idle",
        seat.direction,
      ),
      true,
    );
    this.onSitChange?.(false, false);
    this.changed();

    if (seat.zone === MEETING_ZONE) callManager.leaveMeeting();
    const tile = pixelToTile(pose.standX, pose.standY);
    this.ws?.send("stand", { tileX: tile.tileX, tileY: tile.tileY });
    this.prompt.container.setVisible(false);
  }

  /**
   * Beside a far side chair the table is below you, so the hint rides above
   * your head; beside a near side chair it sits under the chair.
   */
  private placePrompt(seat: Seat) {
    this.prompt.container.setPosition(
      seat.x,
      seat.direction === "down" ? this.player.y - 80 : seat.baseY + 34,
    );
  }

  update() {
    if (this.seated) {
      this.placePrompt(this.seated);
      return;
    }

    let best: Seat | undefined;
    let bestDistance = REACH;
    for (const seat of this.seats) {
      if (seat.occupant) continue;
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

    if (best) this.placePrompt(best);
    if (best === this.nearest && !this.dirty) return;
    this.nearest = best;
    this.dirty = false;

    this.ring.clear();
    if (!best) {
      this.prompt.container.setVisible(false);
      return;
    }

    // sit the outline at the chair's own depth so a desk hides the half of it
    // that hides the chair
    this.ring.setDepth(
      depthForY(best.baseY) + (best.direction === "down" ? -0.5 : 0.5),
    );
    this.ring.lineStyle(2, HIGHLIGHT, 0.9);
    this.ring.strokeRoundedRect(best.x - 17, best.baseY - 44, 34, 46, 6);
    this.prompt
      .setText(
        best.zone === MEETING_ZONE ? sceneText().joinMeeting : sceneText().sit,
      )
      .container.setVisible(this.keyboard);
  }

  destroy() {
    this.scene.input.keyboard?.off("keydown-E");
    this.hitAreas.forEach((zone) => zone.destroy());
    this.ring.destroy();
    this.prompt.container.destroy();
    this.tag?.container.destroy();
  }
}
