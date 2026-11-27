import { typingElsewhere } from "./typing";
import * as Phaser from "phaser";
import { AnimationManager } from "./AnimationManager";
import { facing } from "./facing";
import type { RoomSocket } from "./RoomSocket";
import { joystick } from "./joystick";
import { NavGrid, Vec, advanceAlongPath, advanceHeading, headingOf, headingVector, keyRunSpeed, pathLength, runSpeed, strideAt } from "./Navigation";
import { depthForY } from "./MapManager";
import { pixelToTile, MOVEMENT_SPEED, RUN_FROM_TILES, TILE_SIZE, tileToPixel } from "web-shared/lib/types";
import { isValidTile } from "shared-protocol/map";
import { wasDrag } from "./CameraRig";
import { TileHover } from "./TileHover";

const ARRIVE_RANGE = 3;
/**
 * How far the others' copy of us may drift before we correct it. They walk our
 * last heading at our speed, so walking in a straight line costs one message,
 * not one per tile.
 */
const DRIFT_LIMIT = TILE_SIZE;

/** Walk next to a world point, then run `arrive` (MovementManager.goTo). */
export type GoTo = (x: number, y: number, arrive: () => void) => void;

export class MovementManager {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private animationManager: AnimationManager;
  private wsManager: RoomSocket;
  private nav: NavGrid;
  private collides: (x: number, y: number) => boolean;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private path: Vec[] = [];
  private arrive?: () => void;
  private release?: () => void;
  /** Where the others have us, walked forward the same way they do. */
  private shown = { x: 0, y: 0, heading: null as number | null, run: false, runFor: 0, sent: false };
  /** The path is a long one, so it's run (follow), and how far along it we are, for its easing (runSpeed). */
  private pathRun = false;
  private walked = 0;
  /** How long Shift has been held while steering, for the keys' easing into a run (keyRunSpeed). */
  private keyRunFor = 0;
  private inputEnabled = true;
  /** The tile under the mouse, marked where a click would walk you. */
  private tileHover: TileHover;
  private frozen = false;
  private movingBefore = false;
  /** Walking or running this frame, by keys or along a path. */
  private moving = false;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    animationManager: AnimationManager,
    wsManager: RoomSocket,
    nav: NavGrid,
    collides: (x: number, y: number) => boolean,
  ) {
    this.scene = scene;
    this.player = player;
    this.animationManager = animationManager;
    this.wsManager = wsManager;
    this.nav = nav;
    this.collides = collides;

    // Phaser matches keys by the character they type, so AZERTY players get the
    // same physical cluster as Z/Q/S/D. Arrows work on every layout.
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.keys = scene.input.keyboard?.addKeys(
      {
        W: KeyCodes.W,
        Z: KeyCodes.Z,
        UP: KeyCodes.UP,
        S: KeyCodes.S,
        DOWN: KeyCodes.DOWN,
        A: KeyCodes.A,
        Q: KeyCodes.Q,
        LEFT: KeyCodes.LEFT,
        D: KeyCodes.D,
        RIGHT: KeyCodes.RIGHT,
        SHIFT: KeyCodes.SHIFT,
      },
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    scene.input.on("pointerup", this.onPointerUp, this);
    this.tileHover = new TileHover(scene, nav, () => this.inputEnabled);
  }

  private setOff?: () => void;

  /** Calls `then` whenever we set off ourselves: a key, a click on the floor, an errand. */
  onSetOff(then: () => void) {
    this.setOff = then;
  }

  update(delta: number) {
    const input = this.inputEnabled && !typingElsewhere() ? this.readInput() : { x: 0, y: 0, run: false };
    if (this.frozen && (!(input.x || input.y) || !this.unfreeze())) return;

    // Keys walk, and run with Shift; a path runs when it's a long one (follow). Both ease into it and a path out of it.
    const steering = !!(input.x || input.y);
    const running = steering ? input.run : this.path.length > 0 && this.pathRun;
    this.keyRunFor = steering && input.run ? this.keyRunFor + delta / 1000 : 0;
    const speed = !running
      ? MOVEMENT_SPEED
      : steering
        ? keyRunSpeed(this.keyRunFor)
        : runSpeed(this.walked, pathLength({ x: this.player.x, y: this.player.y }, this.path));
    const step = (speed * delta) / 1000;
    let manualMoved = false;
    let moving = false;
    let dx = input.x;
    let dy = input.y;

    if (dx || dy) {
      this.path.length = 0;
      this.arrive = undefined;
      const len = Math.hypot(dx, dy);
      manualMoved = this.moveBy((dx / len) * step, (dy / len) * step);
      moving = manualMoved;
      if (manualMoved && !this.movingBefore) {
        this.signalMove("manual");
        this.setOff?.();
      }
    } else if (this.path.length) {
      const pos = { x: this.player.x, y: this.player.y };
      advanceAlongPath(pos, this.path, step);
      dx = pos.x - this.player.x;
      dy = pos.y - this.player.y;
      moving = dx !== 0 || dy !== 0;
      if (moving) this.player.setPosition(pos.x, pos.y);
      this.walked += Math.hypot(dx, dy);
    }

    // Steering, facing the heading the others are sent (syncManualMovement), so they turn the same way; on a path, along it.
    let faces = this.animationManager.facingOf(this.player);
    if (manualMoved) {
      const way = headingVector(headingOf(dx, dy)!);
      faces = facing(way.x, way.y, faces);
    } else if (moving) faces = facing(dx, dy, faces);
    this.animationManager.play(this.player, moving ? "run" : "idle", faces);
    this.player.anims.timeScale = moving ? strideAt(speed) : 1;

    this.moving = moving;
    this.movingBefore = manualMoved;
    this.syncManualMovement(manualMoved ? { x: dx, y: dy } : null, delta, manualMoved && running);
    // standing players sort by where their feet are; sitting sets its own depth.
    // Only on a change: setting it at all re-sorts everything on the floor.
    const depth = depthForY(this.player.y);
    if (this.player.depth !== depth) this.player.setDepth(depth);

    if (this.arrive && !this.path.length) {
      const arrive = this.arrive;
      this.arrive = undefined;
      arrive();
    }
  }

  /** Which way the keys (or the joystick) steer, and whether Shift is held to run. */
  private readInput(): Vec & { run: boolean } {
    const stick = joystick();
    if (stick.x || stick.y) return { x: stick.x, y: stick.y, run: false };
    const keys = this.keys;
    if (!keys) return { x: 0, y: 0, run: false };
    const held = (...names: string[]) => (names.some((n) => keys[n].isDown) ? 1 : 0);
    return {
      x: held("D", "RIGHT") - held("A", "Q", "LEFT"),
      y: held("S", "DOWN") - held("W", "Z", "UP"),
      run: keys.SHIFT.isDown,
    };
  }

  private moveBy(dx: number, dy: number): boolean {
    const { x, y } = this.player;
    let nx = x;
    let ny = y;
    if (dx && this.isFree(x + dx, y)) nx = x + dx;
    if (dy && this.isFree(nx, y + dy)) ny = y + dy;
    if (nx === x && ny === y) return false;
    this.player.setPosition(nx, ny);
    return true;
  }

  private isFree(x: number, y: number): boolean {
    const tile = pixelToTile(x, y);
    return isValidTile(tile.tileX, tile.tileY) && !this.collides(x, y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) {
    if (!this.inputEnabled || over.length || pointer.button !== 0 || wasDrag(this.scene, pointer)) return;
    if (!this.unfreeze()) return;

    // On a wall, a desk, a tree or beside a wall: as near it as you can stand.
    const clicked = pixelToTile(pointer.worldX, pointer.worldY);
    const goal = this.nav.isWalkable(clicked.tileX, clicked.tileY) ? clicked : this.nav.nearestWalkable(clicked.tileX, clicked.tileY);
    if (!goal) return;
    const path = this.nav.buildPath(this.player.x, this.player.y, goal.tileX, goal.tileY);
    if (!path.length) return;

    this.follow(path, goal.tileX, goal.tileY);
    this.signalMove("click");
    this.pulseTile(path[path.length - 1]);
  }

  /** Whether we are free to walk; heading somewhere else gets you out of a seat first. */
  private unfreeze(): boolean {
    if (this.frozen) this.release?.();
    return !this.frozen;
  }

  /**
   * Every walk goes through here so everyone else sees it too. A long one is
   * run, a few steps walked, and the others are told which so they match.
   */
  private follow(path: Vec[], tileX: number, tileY: number) {
    this.path = path;
    this.pathRun = pathLength({ x: this.player.x, y: this.player.y }, path) > RUN_FROM_TILES * TILE_SIZE;
    this.walked = 0;
    this.setOff?.();
    // The others walk the path themselves, so our heading is theirs to forget.
    this.shown.sent = false;
    this.arrive = undefined;
    this.wsManager.send({ t: "walk_to", x: tileX, y: tileY, ...(this.pathRun ? { r: 1 as const } : {}) });
  }

  /**
   * Walks to the reachable tile nearest a world point, then runs `arrive`.
   * Everything you click in the room, and every errand the app sends you on,
   * goes through here, so it works the same from across the room with a mouse
   * or a finger. Steering or clicking the floor on the way drops the errand.
   * `force`: the app sent you (into a meeting, over to someone), so it goes even
   * while you're typing. `avoid`: tiles not to stop on, such as where people stand.
   */
  goTo(
    worldX: number,
    worldY: number,
    arrive?: () => void,
    { force = false, avoid }: { force?: boolean; avoid?: (tileX: number, tileY: number) => boolean } = {},
  ) {
    if ((!force && !this.inputEnabled) || !this.unfreeze()) return;

    const goal = pixelToTile(worldX, worldY);
    const here = pixelToTile(this.player.x, this.player.y);
    const spots: Array<{ tileX: number; tileY: number; away: number; near: number }> = [];
    for (let dy = -ARRIVE_RANGE; dy <= ARRIVE_RANGE; dy++) {
      for (let dx = -ARRIVE_RANGE; dx <= ARRIVE_RANGE; dx++) {
        const tileX = goal.tileX + dx;
        const tileY = goal.tileY + dy;
        if (!this.nav.isWalkable(tileX, tileY) || avoid?.(tileX, tileY)) continue;
        spots.push({ tileX, tileY, away: dx * dx + dy * dy, near: (tileX - here.tileX) ** 2 + (tileY - here.tileY) ** 2 });
      }
    }
    // Nearest the goal first; between equals, the one on our side, so we don't walk round to the far one.
    spots.sort((a, b) => a.away - b.away || a.near - b.near);

    for (const spot of spots) {
      if (spot.near === 0) {
        // Stopping here, partway along a walk the others are finishing for us by themselves: they're told where we are.
        const walking = this.path.length > 0;
        this.path.length = 0;
        this.arrive = undefined;
        if (walking) this.sendPosition(null, false);
        arrive?.();
        return;
      }
      const path = this.nav.buildPath(this.player.x, this.player.y, spot.tileX, spot.tileY);
      if (!path.length) continue;
      this.follow(path, spot.tileX, spot.tileY);
      this.arrive = arrive;
      return;
    }
  }

  private signalMove(method: "manual" | "click") {
    window.dispatchEvent(new CustomEvent("playerMoved", { detail: { method } }));
  }

  private pulseTile({ x, y }: Vec) {
    const ring = this.scene.add.circle(x, y, 9);
    ring.setStrokeStyle(2, 0xffffff, 0.8);
    ring.setDepth(900);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Keeps everyone else's copy of us within a tile of where we are. While we
   * walk, their copy follows our last heading; we only speak up when the
   * heading changes, when their copy has drifted, and once when we stop.
   */
  private syncManualMovement(moved: Vec | null, delta: number, run: boolean) {
    const heading = moved ? headingOf(moved.x, moved.y) : null;

    if (heading === null) {
      // Only a walk of our own needs a full stop; a click-to-walk path ends by itself.
      if (this.shown.sent && this.shown.heading !== null) this.sendPosition(null, false);
      return;
    }

    // A new heading, or Shift pressed or let go: they need telling.
    if (heading !== this.shown.heading || run !== this.shown.run || !this.shown.sent) return this.sendPosition(heading, run);

    // Walked forward as the others walk it: running, easing in from when they were told.
    if (run) this.shown.runFor += delta / 1000;
    advanceHeading(this.shown, heading, ((run ? keyRunSpeed(this.shown.runFor) : MOVEMENT_SPEED) * delta) / 1000, this.nav);
    const drift = Math.hypot(this.shown.x - this.player.x, this.shown.y - this.player.y);
    if (drift > DRIFT_LIMIT) this.sendPosition(heading, run);
  }

  /** Our tile, with a heading (and whether we run) while we are walking. Resets what the others see. */
  private sendPosition(heading: number | null, run: boolean) {
    const tile = pixelToTile(this.player.x, this.player.y);
    const centre = tileToPixel(tile.tileX, tile.tileY);
    // Still running after a turn: the others carry on at the pace they'd reached, as we do.
    const runFor = this.shown.run && run && this.shown.heading !== null && heading !== null ? this.shown.runFor : 0;
    this.shown = { ...centre, heading, run: heading !== null && run, runFor, sent: true };
    this.wsManager.send({
      t: "move",
      x: tile.tileX,
      y: tile.tileY,
      ...(heading === null ? {} : { d: heading, ...(run ? { r: 1 as const } : {}) }),
    });
  }

  /** Whether you're on the move: what's at hand only counts once you've stopped. */
  isMoving(): boolean {
    return this.moving;
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    if (!enabled) this.tileHover.hide();
  }

  /**
   * Sitting holds the pose, so walking and the idle animation both stop.
   * `release` stands you up when you head somewhere else.
   */
  /**
   * The room put us where it says (a reconnect's welcome): a walk under way
   * stops there, since nobody on the new connection was told of it, and the
   * next click starts afresh.
   */
  halt() {
    this.path.length = 0;
    this.arrive = undefined;
    this.moving = false;
    this.shown.sent = false;
  }

  setFrozen(frozen: boolean, release?: () => void) {
    this.frozen = frozen;
    this.moving = false;
    this.shown.sent = false;
    this.release = release;
    this.path.length = 0;
    this.arrive = undefined;
    this.player.anims.timeScale = 1;
  }

  destroy() {
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.tileHover.destroy();
  }
}
