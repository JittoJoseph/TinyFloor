import * as Phaser from "phaser";
import { wasDrag } from "./CameraRig";
import { AnimationManager } from "./AnimationManager";
import { type CardinalDirection, facing } from "./facing";
import { NavGrid, Vec, advanceAlongPath, advanceHeading, headingVector, keyRunSpeed, pathLength, runSpeed, strideAt } from "./Navigation";
import { depthForY } from "./MapManager";
import type { SeatPose } from "./SeatManager";
import { SceneLabel } from "./SceneLabel";
import { cssZoom } from "./plates";
import { TILE_SIZE, MOVEMENT_SPEED, pixelToTile, tileToPixel } from "web-shared/lib/types";
import { statusColorValue } from "web-shared/lib/status";
import { liveBusy, liveNote, type CalendarBusy, type StatusNote } from "shared-protocol/messages";
import { sceneText } from "./sceneText";
import type { PlayerStatus } from "web-shared/lib/types";

/** Emoji drawn on the floor (a wave, a poke), in each system's own colour emoji. */
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

interface RemotePlayerState {
  path: Vec[];
  /** Set while they walk: they keep going this way until their next move. */
  heading: number | null;
  /** Whether the path is only to where they said they are, not a walk of theirs: they slide along it without turning. */
  correcting: boolean;
  /** Running (a long walk of theirs, or Shift held), eased the same way as on their own screen. */
  run: boolean;
  /** How far along their walk they are, and how long they've been running on keys, for that easing. */
  walked: number;
  runFor: number;
  status: PlayerStatus;
  guest: boolean;
  seat?: SeatPose;
  onArrive?: () => void;
}

const SNAP_THRESHOLD = TILE_SIZE * 6;
/** Walking back to a correction looks like a stumble, so small ones are ignored. */
const IGNORE_CORRECTION = TILE_SIZE / 4;
/** Behind the tile they say they're on, they walk a little faster to catch up. */
const MAX_CATCHUP = 1.8;
/**
 * Where a name tag's bottom edge sits: a character's art fills the bottom
 * three quarters of its 64-unit frame, so its hair starts 48 above its feet,
 * and the tag clears it by 4. Tags hang from their bottom edge (SceneLabel),
 * so a tag scaled up for a distant camera grows away from the head.
 */
const TAG_OFFSET_Y = -52;
/** Under the chair instead, for someone sitting with their back to us: its top edge just below the seat. */
const BEHIND_TAG_OFFSET_Y = 58;
/** A tag's height, before scaling (the taller of the canvas and HTML tags). */
const TAG_HEIGHT = 18;
const TAG_DEPTH = 100000;
type Box = { left: number; right: number; top: number; bottom: number };
/** How often crowded tags are sorted out, in milliseconds. */
const DECLUTTER_EVERY = 150;
/** Room kept between two tags before the farther one steps away, in screen pixels. */
const TAG_GAP = 4;
/** Past this many on the floor, only the names around you show (and anyone you point at): a busy floor reads as people, not a wall of labels. */
const BUSY_FLOOR = 6;
/** How far around you names show on a busy floor: a conversation's distance and a little more. */
const NEAR_TAGS = TILE_SIZE * 6;
const HOP_DURATION = 220;
const HOP_REACH = TILE_SIZE * 2;

/**
 * Sitting with your back to us puts your head over the desk, where a name would
 * cover it, so the name hangs under the chair instead.
 */
function nameTagOffset(seated?: CardinalDirection): number {
  return seated === "up" ? BEHIND_TAG_OFFSET_Y : TAG_OFFSET_Y;
}

export class PlayerManager {
  private scene: Phaser.Scene;
  private animationManager: AnimationManager;
  private nav: NavGrid;
  private playerId: string;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private nameTags: Map<string, SceneLabel> = new Map();
  private playerStates: Map<string, RemotePlayerState> = new Map();
  /** The note each person shows, you included, while it lasts; each with its timer to clear itself. */
  private notes: Map<string, StatusNote> = new Map();
  /** What each person wrote, and what their calendar says: a note they wrote is shown over a meeting. */
  private written: Map<string, StatusNote> = new Map();
  private meetings: Map<string, CalendarBusy> = new Map();
  /** How each person looks, for showing them off the floor as they look on it. */
  private looks: Map<string, string> = new Map();
  private noteTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private localPlayer?: Phaser.GameObjects.Sprite;
  private scratch: Vec = { x: 0, y: 0 };
  /** Everyone's last status, to tell a change from the first word on it. */
  private statuses = new Map<string, PlayerStatus>();
  /** A reaction under way on a sprite, stopped if another comes (react). */
  private reacting = new Map<Phaser.GameObjects.Sprite, Phaser.Tweens.TweenChain>();
  /** Name tags grow a little when the camera pulls back, so they stay readable. */
  private tagScale = 1;
  private declutterAt = 0;

  constructor(
    scene: Phaser.Scene,
    animationManager: AnimationManager,
    nav: NavGrid,
    playerId: string,
  ) {
    this.scene = scene;
    this.animationManager = animationManager;
    this.nav = nav;
    this.playerId = playerId;
  }

  createLocalPlayer(
    id: string,
    name: string,
    x: number,
    y: number,
    character: string,
  ): Phaser.GameObjects.Sprite {
    // Out of sight until the room says where you are (showLocalPlayer): you'd
    // otherwise appear here first and jump.
    const player = this.animationManager.sprite(x, y, character).setVisible(false);
    player.setName("localPlayer");
    this.animationManager.play(player, "idle", "down");

    // Positioned every frame by updateLocalPlayerNameTag; a tween on it would fight
    // that and leave the name behind while the character walks off.
    const tag = new SceneLabel(this.scene, x, y + TAG_OFFSET_Y, name, { person: true });
    tag.container.setDepth(TAG_DEPTH).setScale(this.tagScale).setVisible(false);

    this.localPlayer = player;
    this.clickable(player, id);
    this.nameTags.set(id, tag);
    this.looks.set(id, character);
    this.updatePlayerStatus(id, "available");

    return player;
  }

  addPlayer(
    id: string,
    name: string,
    tileX: number,
    tileY: number,
    spriteKey: string = "Adam",
    status: PlayerStatus = "available",
    guest: boolean = true,
  ) {
    if (this.players.has(id)) return;

    const pos = tileToPixel(tileX, tileY);
    const container = this.scene.add.container(pos.x, pos.y);
    const sprite = this.animationManager.sprite(0, 0, spriteKey);
    this.animationManager.play(sprite, "idle", "down");
    container.add(sprite);
    this.clickable(sprite, id);
    container.setDepth(depthForY(pos.y));

    const tag = new SceneLabel(this.scene, 0, TAG_OFFSET_Y, name, { person: true });
    tag.container.setScale(this.tagScale);
    container.add(tag.container);
    this.nameTags.set(id, tag);
    this.players.set(id, container);
    this.looks.set(id, spriteKey);

    this.playerStates.set(id, {
      path: [],
      heading: null,
      correcting: false,
      run: false,
      walked: 0,
      runFor: 0,
      status,
      guest,
    });

    this.updatePlayerStatus(id, status);
  }

  /** The room has placed you: you and your name come into view. */
  showLocalPlayer() {
    this.localPlayer?.setVisible(true);
    this.nameTags.get(this.playerId)?.container.setVisible(true);
  }

  /**
   * A hand goes up over someone for a moment: a wave, seen by everyone on the
   * floor. It rides with them if they walk off.
   */
  wave(id: string) {
    const container = this.players.get(id);
    const local = id === this.playerId ? this.localPlayer : undefined;
    if (!container && !local) return;
    const hand = this.scene.add
      .text(0, 0, "👋", { fontSize: "22px", fontFamily: EMOJI_FONT })
      .setOrigin(0.5, 1)
      .setScale(this.tagScale);
    // Just over the name tag, so it reads as theirs.
    const top = TAG_OFFSET_Y - (TAG_HEIGHT + 2) * this.tagScale;
    if (container) {
      hand.setPosition(0, top);
      container.add(hand);
    } else {
      hand.setPosition(local!.x, local!.y + top).setDepth(TAG_DEPTH + 1);
    }
    // Up, a few waves of the hand, then gone.
    this.scene.tweens.add({ targets: hand, y: hand.y - 6, duration: 280, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: hand, angle: { from: -16, to: 16 }, duration: 150, yoyo: true, repeat: 3, ease: "Sine.easeInOut" });
    this.scene.tweens.add({ targets: hand, alpha: 0, delay: 1500, duration: 350, onComplete: () => hand.destroy() });
  }

  updateLocalPlayerNameTag(
    pixelX: number,
    pixelY: number,
    seated?: CardinalDirection,
  ) {
    this.nameTags
      .get(this.playerId)
      ?.container.setPosition(pixelX, pixelY + nameTagOffset(seated));
  }

  setTagScale(scale: number) {
    this.tagScale = scale;
    this.nameTags.forEach((tag) => tag.container.setScale(scale));
  }

  /**
   * While we sit in a meeting the cards carry everyone's name, so the names of
   * the people at the table, ours included, come off the map.
   */
  hideNameTags(people: ReadonlySet<string> | null) {
    this.nameTags.forEach((tag, id) =>
      tag.container.setVisible(
        !people || (id !== this.playerId && !people.has(id)),
      ),
    );
  }

  /**
   * Where tags would cover each other, the nearer one stays and the farther one
   * steps away until there's room again, the way a map drops labels as it
   * fills up; a lone dot over someone's head would say little the avatar
   * doesn't. Yours always shows; the closer someone is to you, the more theirs does.
   * On a busy floor only the names around you show, and whoever you point at.
   */
  declutterTags(time: number) {
    if (time < this.declutterAt || !this.localPlayer) return;
    this.declutterAt = time + DECLUTTER_EVERY;
    const me = this.localPlayer;
    const busy = this.nameTags.size > BUSY_FLOOR;
    const pointer = this.scene.input.activePointer;
    const at = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tags: Array<{ tag: SceneLabel; x: number; y: number; distance: number }> = [];
    this.nameTags.forEach((tag, id) => {
      if (!tag.container.visible) return;
      const container = this.players.get(id);
      const x = container ? container.x + tag.container.x : tag.container.x;
      const y = container ? container.y + tag.container.y : tag.container.y;
      const distance = id === this.playerId ? -1 : Math.hypot(x - me.x, y - me.y);
      // Pointed at: the character under the pointer, from its feet to its hair.
      const body = container ?? me;
      const pointed = Math.abs(at.x - body.x) < 18 && at.y > body.y - 52 && at.y < body.y + 8;
      if (busy && distance > NEAR_TAGS && !pointed) return void tag.setCrowded(true);
      tags.push({ tag, x, y, distance: pointed ? -0.5 : distance });
    });
    tags.sort((a, b) => a.distance - b.distance);

    const zoom = cssZoom(this.scene);
    const height = TAG_HEIGHT * this.tagScale;
    const gap = TAG_GAP / zoom;
    const placed: Box[] = [];
    for (const { tag, x, y } of tags) {
      const boxOf = (width: number) => {
        const half = (width * this.tagScale) / 2;
        return { left: x - half - gap, right: x + half + gap, top: y - height - gap, bottom: y + gap };
      };
      const clashes = (box: Box) => placed.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
      const box = boxOf(tag.width);
      const crowded = clashes(box);
      tag.setCrowded(crowded);
      if (!crowded) placed.push(box);
    }
  }

  updatePlayerStatus(id: string, status: PlayerStatus) {
    const tag = this.nameTags.get(id);
    if (!tag) return;

    // A change (not the first word on it): they bob, so the eye goes to whoever's now free, busy or away.
    const before = this.statuses.get(id);
    this.statuses.set(id, status);
    if (before && before !== status) this.react(id, "bob");

    const state = this.playerStates.get(id);
    if (state) state.status = status;

    // The colour says it; the dot holds still, in a call like any other status.
    tag.setDot(statusColorValue(status));
  }

  /**
   * A small physical answer from someone, you included, the way a chair takes
   * your weight: a bob (a squash and a spring back, for a click, a wave, a new
   * status), a jolt (a startled tilt, for a poke) or a shake (a small "not
   * now", clicked while they're in a meeting). From the feet, in scale and
   * angle only, so it never fights where they're walking.
   */
  react(id: string, how: "bob" | "jolt" | "shake") {
    const sprite = this.spriteFor(id);
    if (!sprite || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    this.reacting.get(sprite)?.stop();
    sprite.setScale(1).setAngle(0);
    const steps = {
      bob: [
        { scaleX: 1.1, scaleY: 0.86, duration: 80, ease: "Quad.easeOut" },
        { scaleX: 0.95, scaleY: 1.08, duration: 110, ease: "Quad.easeInOut" },
        { scaleX: 1, scaleY: 1, duration: 170, ease: "Back.easeOut" },
      ],
      jolt: [
        { angle: -9, scaleX: 1.06, scaleY: 0.92, duration: 60, ease: "Quad.easeOut" },
        { angle: 7, duration: 70, ease: "Sine.easeInOut" },
        { angle: -4, duration: 70, ease: "Sine.easeInOut" },
        { angle: 0, scaleX: 1, scaleY: 1, duration: 140, ease: "Back.easeOut" },
      ],
      shake: [
        { angle: -4, duration: 50, ease: "Sine.easeOut" },
        { angle: 4, duration: 70, ease: "Sine.easeInOut" },
        { angle: -3, duration: 70, ease: "Sine.easeInOut" },
        { angle: 0, duration: 60, ease: "Sine.easeIn" },
      ],
    }[how];
    const chain = this.scene.tweens.chain({
      targets: sprite,
      tweens: steps,
      onComplete: () => this.reacting.delete(sprite),
      onStop: () => this.reacting.delete(sprite),
    });
    this.reacting.set(sprite, chain);
  }

  /**
   * A poke: a finger jabs at them twice from the poker's side, and they jolt.
   * Everyone sees it; it rides with them if they walk off.
   */
  poke(from: string, to: string) {
    const target = this.whereIs(to);
    if (!target) return;
    const source = this.whereIs(from);
    const side = source && source.x > target.x ? 1 : -1;
    const container = this.players.get(to);
    const finger = this.scene.add
      .text(0, 0, side > 0 ? "👈" : "👉", { fontSize: "20px", fontFamily: EMOJI_FONT })
      .setOrigin(0.5, 0.5)
      .setScale(this.tagScale)
      .setAlpha(0);
    // Beside them at shoulder height, on the side the poke came from.
    const x = side * 22;
    const y = -30;
    if (container) {
      finger.setPosition(x, y);
      container.add(finger);
    } else {
      finger.setPosition(target.x + x, target.y + y).setDepth(TAG_DEPTH + 1);
    }
    const restX = finger.x;
    this.scene.tweens.add({ targets: finger, alpha: 1, duration: 90 });
    this.scene.tweens.chain({
      targets: finger,
      tweens: [
        { x: restX - side * 7, duration: 90, ease: "Quad.easeIn", onComplete: () => this.react(to, "jolt") },
        { x: restX, duration: 120, ease: "Quad.easeOut" },
        { x: restX - side * 7, duration: 90, ease: "Quad.easeIn" },
        { x: restX + side * 2, duration: 140, ease: "Quad.easeOut" },
        { alpha: 0, delay: 350, duration: 220 },
      ],
      onComplete: () => finger.destroy(),
    });
  }

  private clicked?: (id: string) => void;
  /** What a click on someone does (GameScene): they answer it, and the floor under them doesn't. */
  onPersonClick(then: (id: string) => void) {
    this.clicked = then;
  }

  /**
   * Someone, you included, as something on the floor that answers a click,
   * the way a chair does: a hand cursor over them, no tile marked under them,
   * and in front of a chair they stand before (Phaser hands a click to the top
   * one). Only the character, not the empty margin of its frame.
   */
  private clickable(sprite: Phaser.GameObjects.Sprite, id: string) {
    sprite.setInteractive({
      hitArea: {},
      hitAreaCallback: (_: unknown, x: number, y: number) => {
        const { width, height } = sprite;
        return x > width * 0.28 && x < width * 0.72 && y > height * 0.3 && y <= height;
      },
      useHandCursor: true,
    });
    sprite.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0 || wasDrag(this.scene, pointer)) return;
      this.clicked?.(id);
    });
  }

  /** Where someone stands, you included. */
  private whereIs(id: string): { x: number; y: number } | null {
    if (id === this.playerId) return this.localPlayer ? { x: this.localPlayer.x, y: this.localPlayer.y } : null;
    return this.positionOf(id);
  }

  private spriteFor(id: string): Phaser.GameObjects.Sprite | undefined {
    if (id === this.playerId) return this.localPlayer;
    const container = this.players.get(id);
    return container && this.spriteOf(container);
  }

  /** How someone looks now, you included: they change over where they stand or sit. */
  changeLook(id: string, character: string) {
    this.looks.set(id, character);
    const container = this.players.get(id);
    const sprite = id === this.playerId ? this.localPlayer : container && this.spriteOf(container);
    if (sprite) this.animationManager.wear(sprite, character);
  }

  /** Someone's new name, on their tag. */
  renamePlayer(id: string, name: string) {
    this.nameTags.get(id)?.setText(name);
  }

  /** Music playing for them in TinyFloor: a small moving mark on their name tag. */
  updatePlayerListening(id: string, on: boolean) {
    this.nameTags.get(id)?.setListening(on);
  }

  /**
   * Someone's status note: its icon on their tag while it lasts, gone when its
   * time is up (and `expired` is told, so the lists can follow).
   */
  updatePlayerNote(id: string, note: StatusNote | null | undefined, expired?: () => void) {
    const live = liveNote(note);
    if (live) this.written.set(id, live);
    else this.written.delete(id);
    this.showNote(id, expired);
  }

  /** In a meeting by their calendar, or no longer: shown as a note while they haven't written one (lib/calendar). */
  updatePlayerCalendar(id: string, busy: CalendarBusy | null | undefined, expired?: () => void) {
    const live = liveBusy(busy);
    if (live) this.meetings.set(id, live);
    else this.meetings.delete(id);
    this.showNote(id, expired);
  }

  /** The note someone shows: the one they wrote, or else the meeting they're in, until either ends. */
  private showNote(id: string, expired?: () => void) {
    this.noteTimers.get(id)?.remove();
    this.noteTimers.delete(id);
    const written = liveNote(this.written.get(id));
    const meeting = liveBusy(this.meetings.get(id));
    const live = written ?? (meeting ? meetingNote(meeting) : null);
    if (live) this.notes.set(id, live);
    else this.notes.delete(id);
    // Words alone show as a speech bubble, so the tag still says there is a note.
    this.nameTags.get(id)?.setIcon(live ? (live.icon ?? "chat") : null);
    if (live?.until) {
      const timer = this.scene.time.delayedCall(Math.max(0, live.until - Date.now()), () => {
        this.showNote(id);
        expired?.();
      });
      this.noteTimers.set(id, timer);
    }
  }

  /**
   * Where they are, and which way they're walking. Between moves they keep
   * walking that way, so a straight walk arrives as one message. A correction
   * they have already walked past is ignored rather than stumbled back to.
   */
  updatePlayerPosition(id: string, tileX: number, tileY: number, heading?: number, run = false) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container || state.seat) return;

    const point = tileToPixel(tileX, tileY);
    const away = Phaser.Math.Distance.Between(container.x, container.y, point.x, point.y);
    const sameWay = heading !== undefined && heading === state.heading;
    // Still running after a turn: they carry on at the pace they'd reached.
    const running = heading !== undefined && run;
    state.runFor = state.run && running && state.heading !== null ? state.runFor : 0;
    state.heading = heading ?? null;
    state.run = running;
    state.path.length = 0;
    state.correcting = true;

    if (away > SNAP_THRESHOLD) {
      container.setPosition(point.x, point.y);
      return;
    }
    if (sameWay && away < TILE_SIZE) {
      const dir = headingVector(heading!);
      const ahead = (container.x - point.x) * dir.x + (container.y - point.y) * dir.y;
      const sideways = Math.abs((container.x - point.x) * dir.y - (container.y - point.y) * dir.x);
      if (ahead > 0 && sideways < IGNORE_CORRECTION) return;
    }
    state.path.push(point);
  }

  walkPlayerTo(id: string, tileX: number, tileY: number, run = false) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container || state.seat) return;

    state.heading = null;
    state.correcting = false;
    state.run = run;
    state.walked = 0;
    state.path = this.nav.buildPath(container.x, container.y, tileX, tileY);
    if (!state.path.length) {
      const point = tileToPixel(tileX, tileY);
      container.setPosition(point.x, point.y);
    }
  }

  /**
   * Walks someone to the spot beside the chair they took, then hops them onto
   * it. Players already seated when we arrive are placed there directly.
   */
  sitPlayer(id: string, pose: SeatPose, walk = true) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    if (!state || !container) return;

    this.scene.tweens.killTweensOf(container);
    state.seat = pose;
    state.heading = null;
    state.correcting = false;
    state.onArrive = undefined;
    state.path = [];

    if (!walk) {
      container.setPosition(pose.x, pose.y).setDepth(pose.depth);
      this.settle(id, pose);
      return;
    }

    const stand = pixelToTile(pose.standX, pose.standY);
    const goal = this.nav.nearestWalkable(stand.tileX, stand.tileY);
    if (goal) {
      state.path = this.nav.buildPath(container.x, container.y, goal.tileX, goal.tileY);
    }
    if (state.path.length) state.onArrive = () => this.hopOnto(id);
    else this.hopOnto(id);
  }

  standPlayer(id: string) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    const pose = state?.seat;
    if (!state || !container || !pose) return;

    this.scene.tweens.killTweensOf(container);
    state.seat = undefined;
    state.heading = null;
    state.onArrive = undefined;
    state.path = [];
    this.nameTags.get(id)?.container.setY(TAG_OFFSET_Y);

    const gap = Phaser.Math.Distance.Between(container.x, container.y, pose.standX, pose.standY);
    if (gap <= HOP_REACH) {
      this.glide(container, pose.standX, pose.standY);
      return;
    }
    // stood up before reaching the chair, so finish the walk to where they are
    const goal = pixelToTile(pose.standX, pose.standY);
    this.walkPlayerTo(id, goal.tileX, goal.tileY);
  }

  private hopOnto(id: string) {
    const state = this.playerStates.get(id);
    const container = this.players.get(id);
    const pose = state?.seat;
    if (!state || !container || !pose) return;

    this.animationManager.play(this.spriteOf(container), "run", pose.direction);
    this.glide(container, pose.x, pose.y, pose.depth, () => {
      if (state.seat === pose) this.settle(id, pose);
    });
  }

  /** A short eased move, holding a depth or following y when none is given. */
  private glide(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    depth?: number,
    onComplete?: () => void,
  ) {
    if (depth !== undefined) container.setDepth(depth);
    this.scene.tweens.add({
      targets: container,
      x,
      y,
      duration: HOP_DURATION,
      ease: "Sine.easeOut",
      onUpdate: () => {
        if (depth === undefined) this.sortBy(container);
      },
      onComplete,
    });
  }

  private spriteOf(container: Phaser.GameObjects.Container) {
    return container.list[0] as Phaser.GameObjects.Sprite;
  }

  private settle(id: string, pose: SeatPose) {
    const container = this.players.get(id);
    if (!container) return;
    this.animationManager.sit(this.spriteOf(container), pose.direction);
    this.nameTags.get(id)?.container.setY(nameTagOffset(pose.direction));
  }

  update(delta: number) {
    this.playerStates.forEach((state, id) => {
      const container = this.players.get(id);
      if (!container) return;
      const pos = this.scratch;
      pos.x = container.x;
      pos.y = container.y;

      // A walk of theirs runs eased along its length; keys run eased in time, as on their screen.
      if (state.run && state.heading !== null) state.runFor += delta / 1000;
      const walkingPath = state.path.length > 0 && state.heading === null && !state.correcting;
      const speed = !state.run
        ? MOVEMENT_SPEED
        : walkingPath
          ? runSpeed(state.walked, pathLength(pos, state.path))
          : keyRunSpeed(state.runFor);
      if (state.path.length) {
        // Behind where they said they are, they walk a little faster to catch up.
        const target = state.path[0];
        const remaining = Phaser.Math.Distance.Between(container.x, container.y, target.x, target.y);
        const catchup = state.heading === null ? 1 : Phaser.Math.Clamp(remaining / TILE_SIZE, 1, MAX_CATCHUP);
        advanceAlongPath(pos, state.path, (speed * catchup * delta) / 1000);
        if (walkingPath) state.walked += Math.hypot(pos.x - container.x, pos.y - container.y);
      } else if (state.heading !== null) {
        // Walking on the way they were last heading, until they say otherwise (or a wall stops them).
        advanceHeading(pos, state.heading, (speed * delta) / 1000, this.nav);
      } else if (state.seat) {
        return;
      }

      const [dx, dy] = [pos.x - container.x, pos.y - container.y];
      if (dx || dy) {
        container.setPosition(pos.x, pos.y);
        this.sortBy(container);
      }
      // Steering, they face the heading they sent, as they do on their own
      // screen; sliding to where they said they are, the way they already
      // face; on a walk of theirs, along it.
      const sprite = this.spriteOf(container);
      let faces = this.animationManager.facingOf(sprite);
      if (state.heading !== null) {
        const way = headingVector(state.heading);
        faces = facing(way.x, way.y, faces);
      } else if (!state.correcting) faces = facing(dx, dy, faces);
      const moving = !!(dx || dy || state.path.length);
      this.animationManager.play(sprite, moving ? "run" : "idle", faces);
      sprite.anims.timeScale = moving ? strideAt(speed) : 1;

      if (!state.path.length && state.onArrive) {
        const arrive = state.onArrive;
        state.onArrive = undefined;
        arrive();
      }
    });
  }

  /** Depth by where their feet are, set only on a change: setting it re-sorts the whole floor. */
  private sortBy(container: Phaser.GameObjects.Container) {
    const depth = depthForY(container.y);
    if (container.depth !== depth) container.setDepth(depth);
  }

  removePlayer(id: string) {
    const tag = this.nameTags.get(id);
    if (tag) {
      this.scene.tweens.killTweensOf(tag.container);
      this.nameTags.delete(id);
      // A remote tag goes with its container below; the local one stands alone.
      if (!this.players.has(id)) tag.container.destroy();
    }

    const container = this.players.get(id);
    if (container) {
      this.scene.tweens.killTweensOf(container);
      container.destroy();
    }
    this.players.delete(id);
    this.playerStates.delete(id);
    this.noteTimers.get(id)?.remove();
    this.noteTimers.delete(id);
    this.notes.delete(id);
    this.written.delete(id);
    this.meetings.delete(id);
    this.looks.delete(id);
  }

  getPlayers(): Map<string, Phaser.GameObjects.Container> {
    return this.players;
  }

  /** Where someone is standing, in world pixels, if they are on this floor. */
  positionOf(id: string): { x: number; y: number } | null {
    const container = this.players.get(id);
    return container ? { x: container.x, y: container.y } : null;
  }

  getPlayerName(id: string): string | undefined {
    return this.nameTags.get(id)?.text;
  }

  getPlayerStatus(id: string): PlayerStatus | undefined {
    return this.playerStates.get(id)?.status;
  }

  isGuest(id: string): boolean {
    return this.playerStates.get(id)?.guest !== false;
  }

  getPlayerList(): Array<{ id: string; name: string; character: string; status: PlayerStatus; note: StatusNote | null }> {
    return [...this.nameTags].map(([id, tag]) => ({
      id,
      name: tag.text,
      character: this.looks.get(id) ?? "",
      status: this.playerStates.get(id)?.status ?? "available",
      note: this.notes.get(id) ?? null,
    }));
  }

  getPlayerNote(id: string): StatusNote | null {
    return this.notes.get(id) ?? null;
  }

  destroy() {
    this.nameTags.forEach((tag) =>
      this.scene.tweens.killTweensOf(tag.container),
    );
    this.players.forEach((container) => {
      this.scene.tweens.killTweensOf(container);
      container.destroy();
    });
    this.players.clear();
    this.nameTags.clear();
    this.playerStates.clear();
    this.noteTimers.forEach((timer) => timer.remove());
    this.noteTimers.clear();
    this.notes.clear();
    this.written.clear();
    this.meetings.clear();
  }
}

/** A meeting on someone's calendar, as a note: its title if they share titles, or just that they're in one, and until when. */
function meetingNote(busy: CalendarBusy): StatusNote {
  const text = sceneText();
  const time = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { hour: "numeric", minute: "2-digit" }).format(busy.until);
  const words = busy.title ? text.meetingTitledUntil.replace("{title}", busy.title) : text.inMeetingUntil;
  return { icon: busy.call ? "call" : "meeting", text: words.replace("{time}", time), until: busy.until };
}
