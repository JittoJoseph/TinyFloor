import * as Phaser from "phaser";
import { AnimationManager, CardinalDirection } from "./AnimationManager";
import { ChairSpec, MapAnchor, depthForY } from "./MapManager";
import type { RoomSocket } from "./RoomSocket";
import type { GoTo } from "./MovementManager";
import { learned, type ActionAt } from "./actions";
import { meetingsState, peopleInMeetings, subscribeMeetings } from "./meetings";
import { SceneLabel } from "./SceneLabel";
import { sceneText } from "./sceneText";
import { pixelToTile } from "@/lib/types";
import { isDesk } from "@shared/map";
import { deskAt, deskState, setMySeat, subscribeDesks } from "./desks";
import { floorStatusOf, subscribeFloor } from "./floor";
import { DeskPlate } from "./DeskPlate";

/**
 * Where a seated character sits relative to the chair's base, and whether they
 * draw in front of the chair or behind it. Facing away puts you behind the
 * backrest, which is what makes the desk in front read as covering your legs.
 */
const SEAT: Record<CardinalDirection, { dx: number; dy: number; depth: number; exit: number }> = {
  down: { dx: 0, dy: -12, depth: -0.5, exit: -54 },
  up: { dx: 0, dy: -32, depth: -2, exit: 20 },
  left: { dx: 0, dy: -20, depth: 2, exit: 20 },
  right: { dx: 0, dy: -20, depth: 2, exit: 20 },
};

const REACH = 56;
/** How close a desk's plate shows: about the desk you're at or walking past. */
const PLATE_REACH = 96;
const HIGHLIGHT = 0xff4e00;
const IDLE = 0x9ca3af;
const SELF = "self";

/** The meeting room's zone: its table carries a tag saying whether a meeting is on. */
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
  private player: Phaser.GameObjects.Sprite;
  private animations: AnimationManager;
  private ws?: RoomSocket;
  private seats: Seat[] = [];
  private byId = new Map<number, Seat>();
  private ring: Phaser.GameObjects.Graphics;
  private tag?: SceneLabel;
  private hitAreas: Phaser.GameObjects.Zone[] = [];
  private nearest?: { seat: Seat; distance: number };
  private seated?: Seat;
  private dirty = false;
  private onSitChange?: (seated: boolean) => void;
  private goTo?: GoTo;
  private unsubscribe?: () => void;
  private unsubscribeDesks: () => void;
  private unsubscribeFloor: () => void;
  /** Whose desk it is, on each desk while its owner is away (docs/product.md). */
  private plates = new Map<number, DeskPlate>();
  /** How many the table's tag says are in meetings; who's talking changes often, the count rarely. */
  private inMeetings = -1;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    animations: AnimationManager,
    chairs: ChairSpec[],
    private readonly selfId: string,
    table?: MapAnchor,
  ) {
    this.scene = scene;
    this.player = player;
    this.animations = animations;
    this.seats = chairs.map((c) => ({ ...c, baseY: c.y + 16 }));
    this.seats.forEach((seat) => this.byId.set(seat.id, seat));

    this.ring = scene.add.graphics();

    // a tag in the middle of the meeting table, so anyone walking past can see
    // whether a meeting is on, and how many are in it
    if (table && this.seats.some((seat) => seat.zone === MEETING_ZONE)) {
      this.tag = new SceneLabel(scene, table.x + table.width / 2, table.y + table.height / 2, "");
      this.tag.container.setDepth(table.y + table.height + 1);
      this.showMeetings();
      this.unsubscribe = subscribeMeetings(() => this.showMeetings());
    }

    // A plate on each desk, on the desktop: above a chair facing up, below one facing down.
    this.seats.forEach((seat) => {
      if (!isDesk(seat.id)) return;
      const up = seat.direction === "up";
      const y = up ? seat.y - 38 : seat.baseY - 2;
      this.plates.set(
        seat.id,
        new DeskPlate(
          scene,
          seat.x,
          y,
          depthForY(up ? seat.baseY : seat.baseY + 48) + 1,
          () => sceneText().yourDesk,
          () => this.goToDesk(seat.id),
        ),
      );
    });
    this.unsubscribeDesks = subscribeDesks(() => this.changed());
    // An owner's dot follows them in and out of the office.
    this.unsubscribeFloor = subscribeFloor(() => this.showPlates());

    this.seats.forEach((seat) => {
      const zone = scene.add.zone(seat.x, seat.y, 40, 44).setOrigin(0.5).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        if (this.seated === seat) return this.stand();
        if (seat.occupant || this.reserved(seat)) return;
        this.walkTo(seat);
      });
      this.hitAreas.push(zone);
    });
  }

  attach(ws: RoomSocket, onSitChange: (seated: boolean) => void, goTo: GoTo) {
    this.ws = ws;
    this.onSitChange = onSitChange;
    this.goTo = goTo;
  }

  seatedDirection(): CardinalDirection | undefined {
    return this.seated?.direction;
  }

  /** What you can do here: stand up while sitting, or sit on the free chair beside you. */
  action(): ActionAt | null {
    if (this.seated) return { action: "stand", distance: 0, run: () => this.stand() };
    const near = this.nearest;
    return near ? { action: "sit", distance: near.distance, run: () => !near.seat.occupant && this.sit(near.seat) } : null;
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

  /** Walks over and sits, unless someone beats us to it; from another seat this gets you up first. */
  private walkTo(seat: Seat, byYou = true) {
    const { standX, standY } = this.poseFor(seat);
    this.goTo?.(standX, standY, () => {
      if (!seat.occupant && !this.seated) this.sit(seat, byYou);
    });
  }

  /**
   * Arrived a few steps from your desk (docs/product.md): walk in and sit down, in
   * sight of everyone. Steering or clicking elsewhere on the way lets it go. It
   * isn't you sitting, so the hint for sitting still shows.
   */
  walkToDesk(seatId: number) {
    const seat = this.byId.get(seatId);
    if (seat && !this.seated) this.walkTo(seat, false);
  }

  /** Your desk's chip was pressed: walk there and sit, getting up first if you're sitting elsewhere. */
  private goToDesk(seatId: number) {
    const seat = this.byId.get(seatId);
    if (!seat || this.seated === seat) return;
    if (this.seated) this.stand();
    this.walkTo(seat);
  }

  /** Someone else's desk: nobody but its owner sits there. */
  private reserved(seat: Seat): boolean {
    const desk = deskAt(deskState().desks, seat.id);
    return !!desk && desk.userId !== this.selfId;
  }

  /** Each desk's plate: whose it is while they're away from it, "Your desk" for yours, nothing on a free one. */
  private showPlates() {
    const { desks } = deskState();
    this.plates.forEach((plate, id) => {
      const desk = deskAt(desks, id);
      const seat = this.byId.get(id);
      const mine = desk?.userId === this.selfId;
      const there = !!seat && (seat.occupant === desk?.userId || (mine && seat.occupant === SELF));
      plate.show(desk && !there ? { userId: desk.userId, name: desk.name, mine, status: mine ? null : floorStatusOf(desk.userId) } : null);
    });
  }

  /** After a reconnect the room has forgotten where we sat, so sit down again. */
  resit() {
    const seat = this.seated;
    if (!seat) return;
    this.seated = undefined;
    seat.occupant = undefined;
    this.sit(seat, false);
  }

  /** The server gave the chair to whoever asked first. */
  rejected() {
    this.stand(false);
  }

  private changed() {
    this.dirty = true;
    this.showPlates();
  }

  /** The table's tag: "Meeting", and how many are in meetings when any are on. */
  private showMeetings() {
    const people = peopleInMeetings(meetingsState().meetings);
    if (people === this.inMeetings) return;
    this.inMeetings = people;
    const label = sceneText().meeting;
    this.tag?.setText(people ? `${label} · ${people}` : label).setDot(people ? HIGHLIGHT : IDLE);
  }

  /** Sits down here, and tells the room; `byYou` unless the floor sat you (arriving at your desk, a reconnect). */
  private sit(seat: Seat, byYou = true) {
    if (byYou) learned("sit");
    const pose = this.poseFor(seat);
    this.seated = seat;
    seat.occupant = SELF;

    this.player.setPosition(pose.x, pose.y);
    this.player.anims.stop();
    this.player.setFrame(pose.frame);
    this.player.setDepth(pose.depth);

    this.onSitChange?.(true);
    this.changed();

    setMySeat(seat.id);
    const tile = pixelToTile(seat.x, seat.y);
    this.ws?.send({ t: "sit", seat: seat.id, x: tile.tileX, y: tile.tileY });
    this.ring.clear();
  }

  /** Gets up and tells the room; `byYou` unless the room gave the chair to someone else. */
  private stand(byYou = true) {
    const seat = this.seated;
    if (!seat) return;
    if (byYou) learned("stand");
    this.seated = undefined;
    if (seat.occupant === SELF) seat.occupant = undefined;

    const pose = this.poseFor(seat);
    this.player.setPosition(pose.standX, pose.standY);
    this.player.play(this.animations.getAnimationKey(this.player.getData("spriteName") || "Adam", "idle", seat.direction), true);
    this.onSitChange?.(false);
    setMySeat(null);
    this.changed();

    const tile = pixelToTile(pose.standX, pose.standY);
    this.ws?.send({ t: "stand", x: tile.tileX, y: tile.tileY });
  }

  update() {
    if (!this.seated) this.findNearest();
    this.plates.forEach((plate, id) => {
      const seat = this.byId.get(id)!;
      // At the chair itself its outline says it; the plate folds back rather than cover your name.
      const at = this.nearest?.seat === seat;
      plate.setNear(!at && Phaser.Math.Distance.Between(this.player.x, this.player.y, seat.x, seat.baseY) < PLATE_REACH);
    });
  }

  /** The free chair within reach, outlined: what E or its hint sits you on. */
  private findNearest() {
    let best: { seat: Seat; distance: number } | undefined;
    for (const seat of this.seats) {
      if (seat.occupant || this.reserved(seat)) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, seat.x, seat.baseY);
      if (distance < (best?.distance ?? REACH)) best = { seat, distance };
    }

    const same = best?.seat === this.nearest?.seat;
    this.nearest = best;
    if (same && !this.dirty) return;
    this.dirty = false;

    this.ring.clear();
    if (!best) return;

    // sit the outline at the chair's own depth so a desk hides the half of it
    // that hides the chair
    const { seat } = best;
    this.ring.setDepth(depthForY(seat.baseY) + (seat.direction === "down" ? -0.5 : 0.5));
    this.ring.lineStyle(2, HIGHLIGHT, 0.9);
    this.ring.strokeRoundedRect(seat.x - 17, seat.baseY - 44, 34, 46, 6);
  }

  destroy() {
    this.unsubscribe?.();
    this.unsubscribeDesks();
    this.unsubscribeFloor();
    this.plates.forEach((plate) => plate.destroy());
    setMySeat(null);
    this.hitAreas.forEach((zone) => zone.destroy());
    this.ring.destroy();
    this.tag?.container.destroy();
  }
}
