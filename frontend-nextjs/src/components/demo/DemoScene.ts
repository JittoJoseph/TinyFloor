import * as Phaser from "phaser";
import { AnimationManager, type CardinalDirection } from "@/lib/AnimationManager";
import { MapManager, depthForY, type ChairSpec } from "@/lib/MapManager";
import { PlayerManager } from "@/lib/PlayerManager";
import type { SeatPose } from "@/lib/SeatManager";
import type { NavGrid } from "@/lib/Navigation";
import { pixelToTile, tileToPixel, type PlayerStatus } from "@/lib/types";

/*
 * The real floor, for the video: the app's own map, characters, name tags and
 * pathfinding (MapManager, AnimationManager, PlayerManager, NavGrid), with a
 * scripted cast instead of a room socket. The game loop is put to sleep and
 * stepped from outside, so every frame is the same on every run.
 */

export interface CastMember {
  id: string;
  name: string;
  character: string;
  status: PlayerStatus;
  /** wander: walks about; sit: works at a desk; stand: stands at a spot, turning now and then. */
  mode: "wander" | "sit" | "stand" | "you";
  seed: number;
  /** A chair's tile (x, y in map pixels of the chair object) for sitters. */
  chair?: [number, number];
  /** Where a stander stands, or where a wanderer or you start, in tiles. */
  tile?: [number, number];
  /** Sitters who get up at this time and wander off. */
  standAt?: number;
  /** You: the walk you take at the start, stop by stop (tile, then how long you pause there). */
  route?: Array<{ tile: [number, number]; pause: number; face?: CardinalDirection }>;
}

export const PREROLL = 2;

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEAT: Record<CardinalDirection, { dx: number; dy: number; depth: number; exit: number }> = {
  down: { dx: 0, dy: -12, depth: -0.5, exit: -54 },
  up: { dx: 0, dy: -32, depth: -2, exit: 20 },
  left: { dx: 0, dy: -20, depth: 2, exit: 20 },
  right: { dx: 0, dy: -20, depth: 2, exit: 20 },
};

interface Mind {
  member: CastMember;
  next: () => number;
  target?: { x: number; y: number };
  waitUntil: number;
  seated: boolean;
  turnAt: number;
  /** You: set off for the end, and got there. */
  going?: boolean;
  there?: boolean;
  /** Where along your opening walk you are. */
  leg?: number;
}

export interface DemoDirections {
  /** You, walking over: the time you set off and the tile you walk to. */
  youWalkAt: number;
  youGoal: [number, number];
  /** Wanderers stay out of these tiles (x0, y0, x1, y1) from this time on, so the end stays clear. */
  clearFrom: number;
  clear: [number, number, number, number];
  /** Which way you face once there, and which way the one you walked to turns. */
  youFace: CardinalDirection;
  standFace: CardinalDirection;
}

export class DemoScene extends Phaser.Scene {
  private map!: MapManager;
  private animations!: AnimationManager;
  private players!: PlayerManager;
  private nav!: NavGrid;
  private chairs: ChairSpec[] = [];
  private minds: Mind[] = [];
  /** The scene runs a little before the video starts, so nobody begins mid-stride from a standstill. */
  private clock = -PREROLL;
  ready = false;

  constructor(
    private cast: CastMember[],
    private directions: DemoDirections,
  ) {
    super({ key: "DemoScene" });
  }

  preload() {
    this.map = new MapManager(this);
    this.map.preload();
    this.animations = new AnimationManager(this);
    this.animations.preload();
  }

  create() {
    this.animations.create();
    this.map.create();
    this.nav = this.map.getNavGrid();
    this.chairs = this.map.getChairs();
    this.players = new PlayerManager(this, this.animations, this.nav, "nobody");
    this.cameras.main.setBounds(0, 0, this.map.getMapWidth(), this.map.getMapHeight());

    for (const member of this.cast) {
      const next = random(member.seed);
      const start = member.tile ?? this.randomTile(next);
      this.players.addPlayer(member.id, member.name, start[0], start[1], member.character, member.status, false);
      const mind: Mind = { member, next, waitUntil: next() * 1.5, seated: false, turnAt: 1 + next() * 3 };
      if (member.mode === "sit" && member.chair) {
        this.players.sitPlayer(member.id, this.poseAt(member.chair), false);
        mind.seated = true;
      }
      if (member.mode === "stand") this.face(member.id, "down");
      this.minds.push(mind);
    }
    (window as unknown as { __nav: NavGrid }).__nav = this.nav;
    this.ready = true;
  }

  /** A chair's seated pose, the same arithmetic as SeatManager.poseFor. */
  private poseAt([x, y]: [number, number]): SeatPose {
    const chair = this.chairs.find((one) => Math.abs(one.x - (x + 16)) < 1 && Math.abs(one.y - (y - 16)) < 1)!;
    const baseY = chair.y + 16;
    const shift = SEAT[chair.direction];
    return {
      x: chair.x + shift.dx,
      y: baseY + shift.dy,
      depth: depthForY(baseY) + shift.depth,
      frame: this.animations.getSitFrame(chair.direction),
      direction: chair.direction,
      standX: chair.x,
      standY: baseY + shift.exit,
    };
  }

  private randomTile(next: () => number, avoid?: [number, number, number, number]): [number, number] {
    for (;;) {
      const tx = 1 + Math.floor(next() * 46);
      const ty = 2 + Math.floor(next() * 29);
      if (!this.nav.isWalkable(tx, ty)) continue;
      if (avoid && tx >= avoid[0] && tx <= avoid[2] && ty >= avoid[1] && ty <= avoid[3]) continue;
      return [tx, ty];
    }
  }

  /** Steps the script by one frame. */
  tick(delta: number) {
    this.clock += delta / 1000;
    const t = this.clock;
    const { youWalkAt, youGoal, clearFrom, clear } = this.directions;

    for (const mind of this.minds) {
      const { member } = mind;
      const at = this.players.positionOf(member.id);
      if (!at) continue;

      if (member.mode === "you") {
        if (t >= youWalkAt) {
          if (!mind.going) {
            this.players.walkPlayerTo(member.id, youGoal[0], youGoal[1]);
            mind.target = tileToPixel(youGoal[0], youGoal[1]);
            mind.going = true;
          } else if (!mind.there && Math.hypot(at.x - mind.target!.x, at.y - mind.target!.y) < 1) {
            // Arrived: turn to the person you walked up to.
            this.players.update(0);
            this.face(member.id, this.directions.youFace);
            mind.there = true;
          }
          continue;
        }
        // The opening walk: each stop in turn, pausing at each.
        const route = member.route ?? [];
        if (t < 0.3) continue;
        const leg = mind.leg ?? -1;
        const go = (index: number) => {
          if (index >= route.length) return;
          const tile = route[index].tile;
          const goal = this.nav.nearestWalkable(tile[0], tile[1]) ?? { tileX: tile[0], tileY: tile[1] };
          this.players.walkPlayerTo(member.id, goal.tileX, goal.tileY);
          mind.target = tileToPixel(goal.tileX, goal.tileY);
          mind.leg = index;
          mind.waitUntil = Infinity;
        };
        if (leg === -1) go(0);
        else if (mind.target && Math.hypot(at.x - mind.target.x, at.y - mind.target.y) < 1) {
          if (mind.waitUntil === Infinity) {
            // Just arrived at this stop: look the way it says and wait.
            const stop = route[leg];
            this.players.update(0);
            if (stop.face) this.face(member.id, stop.face);
            mind.waitUntil = t + stop.pause;
          } else if (t >= mind.waitUntil) go(leg + 1);
        }
        continue;
      }

      if (mind.seated) {
        if (member.standAt !== undefined && t >= member.standAt) {
          this.players.standPlayer(member.id);
          mind.seated = false;
          mind.waitUntil = t + 0.6;
        }
        continue;
      }

      if (member.mode === "stand") {
        // Once you're on your way over, they look up and turn to you.
        if (t >= youWalkAt + 1.5) {
          if (mind.turnAt !== Infinity) this.face(member.id, this.directions.standFace);
          mind.turnAt = Infinity;
          continue;
        }
        if (t >= mind.turnAt) {
          const looks: CardinalDirection[] = ["down", "left", "right", "down", "up"];
          this.face(member.id, looks[Math.floor(mind.next() * looks.length)]);
          mind.turnAt = t + 2.5 + mind.next() * 3.5;
        }
        continue;
      }

      // Wandering: walk somewhere, pause a moment (now and then longer), look about, go again.
      if (mind.target) {
        if (Math.hypot(at.x - mind.target.x, at.y - mind.target.y) > 1) continue;
        mind.target = undefined;
        const long = mind.next() < 0.25;
        mind.waitUntil = t + (long ? 2.2 + mind.next() * 2.8 : 0.3 + mind.next() * 1.3);
        if (mind.next() < 0.45) {
          const looks: CardinalDirection[] = ["down", "left", "right", "up"];
          this.face(member.id, looks[Math.floor(mind.next() * 4)]);
        }
        continue;
      }
      if (t < mind.waitUntil) continue;
      const avoid = t >= clearFrom ? clear : undefined;
      let goal = this.randomTile(mind.next, avoid);
      const from = pixelToTile(at.x, at.y);
      for (let tries = 0; tries < 12 && Math.hypot(goal[0] - from.tileX, goal[1] - from.tileY) < 6; tries++) {
        goal = this.randomTile(mind.next, avoid);
      }
      this.players.walkPlayerTo(member.id, goal[0], goal[1]);
      mind.target = tileToPixel(goal[0], goal[1]);
    }

    this.players.update(delta);
  }

  private face(id: string, direction: CardinalDirection) {
    const container = this.players.getPlayers().get(id);
    const sprite = container?.list[0] as Phaser.GameObjects.Sprite | undefined;
    const name = sprite?.getData("spriteName");
    if (sprite && name) sprite.play(this.animations.getAnimationKey(name, "idle", direction), true);
  }

  setStatus(id: string, status: string) {
    this.players.updatePlayerStatus(id, status as PlayerStatus);
  }

  positionOf(id: string) {
    return this.players.positionOf(id);
  }
}
