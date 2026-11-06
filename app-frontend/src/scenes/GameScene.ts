import { floorStep, onFloorLook, onFloorRename, onFloorShown, WALK_TO_PERSON_EVENT, WAVE_EVENT } from "../lib/floor";
import type { StatusNote } from "shared-protocol/messages";
import * as Phaser from "phaser";
import type { RoomTicket } from "web-shared/lib/api";
import { RoomSocket } from "../lib/RoomSocket";
import { PlayerManager } from "../lib/PlayerManager";
import { ProximityManager } from "../lib/ProximityManager";
import { callManager } from "../lib/CallManager";
import { AnimationManager } from "../lib/AnimationManager";
import { MovementManager } from "../lib/MovementManager";
import { MapManager } from "../lib/MapManager";
import { SeatManager } from "../lib/SeatManager";
import { attachDesks } from "../lib/desks";
import { attachDecorate } from "../lib/decorate";
import { DeskDecorator } from "../lib/DeskDecorator";
import { MessageHandler } from "../lib/MessageHandler";
import { WhiteboardObject } from "../lib/WhiteboardObject";
import { whiteboard } from "../lib/WhiteboardManager";
import { doAction, offerAction, type ActionAt } from "../lib/actions";
import { typingElsewhere } from "../lib/typing";
import { setTouchInput } from "../lib/input";
import { touchFirst } from "../lib/touch";
import { TILE_SIZE, pixelToTile, tileToPixel } from "web-shared/lib/types";
import { MEETING_ROOM_EVENT, meetingOf, WALK_TO_MEETING_EVENT } from "../lib/meetings";
import { inZone, MEETING_ZONE, standingSpot } from "../lib/meetingRoom";
import type { MapAnchor } from "../lib/MapManager";
import { cssZoom } from "../lib/plates";
import { CameraRig } from "../lib/CameraRig";
import { WalkOverlay } from "../lib/WalkOverlay";

const CAMERA_LERP = 0.08;
/** How close the camera sits wherever there is room for it. */
const CAMERA_ZOOM = 1.2;
/** On a small screen it pulls back until at least this many tiles show each way... */
const MIN_TILES_SHORT = 15;
const MIN_TILES_LONG = 24;
/** ...but never so far that people and their names get too small to read. */
const MIN_ZOOM = 0.62;
/** Walking over to someone who has since moved further than this, we follow. */
const FOLLOW_AFTER = 2 * TILE_SIZE;
/** How far you can zoom from the usual view, out and in, a step at a time; remembered on this device. */
const ZOOM_RANGE: [number, number] = [0.4, 1.6];
const ZOOM_STEP = 1.15;
/** Zoomed all the way out, the view is at most this much of the floor each way, so there's always more to drag to. */
const MOST_IN_VIEW = 0.8;
const ZOOM_KEY = "tinyfloor:zoom";

function savedZoom(): number {
  try {
    const value = Number(localStorage.getItem(ZOOM_KEY));
    return value ? Phaser.Math.Clamp(value, ...ZOOM_RANGE) : 1;
  } catch {
    return 1;
  }
}

const tileKey = ({ tileX, tileY }: { tileX: number; tileY: number }) => `${tileX},${tileY}`;

/**
 * The camera's zoom for a floor this size. A big screen gets the usual close
 * view; a phone pulls back so you can see where you are going, with enough of
 * the room around you on both sides of the short edge.
 */
function zoomFor(width: number, height: number, mapWidth: number, mapHeight: number): number {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const fit = Math.min(short / (MIN_TILES_SHORT * TILE_SIZE), long / (MIN_TILES_LONG * TILE_SIZE));
  // Never so far out that the map stops short of an edge and leaves a void past it.
  const cover = Math.max(width / mapWidth, height / mapHeight);
  return Math.max(Phaser.Math.Clamp(fit, MIN_ZOOM, CAMERA_ZOOM), cover);
}

class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private wsManager!: RoomSocket;
  /** Left before or after starting (leave): the room isn't joined. */
  private left = false;
  /** Where you appear, chosen before the room is joined. */
  private spawnTile!: { tileX: number; tileY: number };
  private playerManager!: PlayerManager;
  private proximityManager!: ProximityManager;
  private animationManager!: AnimationManager;
  private movementManager!: MovementManager;
  private mapManager!: MapManager;
  private messageHandler!: MessageHandler;
  private whiteboardObject?: WhiteboardObject;
  private seatManager?: SeatManager;
  private deskDecorator?: DeskDecorator;
  private windowListeners: Array<[string, EventListener]> = [];
  private unsubscribeShown?: () => void;
  private unsubscribeRename?: () => void;
  private unsubscribeLook?: () => void;
  /** How much closer or further than the usual view you've zoomed (1 is the usual). */
  private userZoom = savedZoom();
  /** The floor's camera: following you, dragged, zoomed (lib/CameraRig). */
  private cameraRig?: CameraRig;
  /** Where you can walk, shown for working on the floor (lib/WalkOverlay). */
  private walkOverlay?: WalkOverlay;
  /** The meeting room, and whether we stand in it. */
  private meetingZone?: MapAnchor;
  private insideRoom = false;
  /** The meeting we are in, and whether we have reached the room since joining it. */
  private trackedMeeting: string | null = null;
  private reachedRoom = false;

  constructor(
    private name: string,
    private character: string,
    /** The signed-in person's id, which is also their id in the room. */
    private playerId: string,
    /** Gets a fresh ticket for this room from the API, for every connection attempt. */
    private ticketFor: () => Promise<RoomTicket>,
  ) {
    super({ key: "GameScene" });
  }

  preload() {
    floorStep("scene");
    this.mapManager = new MapManager(this);
    this.mapManager.preload();

    this.animationManager = new AnimationManager(this);
    this.animationManager.preload(this.character);

    const mapWidth = this.mapManager.getMapWidth();
    const mapHeight = this.mapManager.getMapHeight();
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setZoom(this.cameraZoom(this.scale.width, this.scale.height));
    this.spawnTile = this.mapManager.getRandomSpawnTile();

    // The room is joined now, while the files load and the floor is built, not
    // after: what it says meanwhile waits for create to listen (below). A
    // reconnect puts you back where you were, not at the spawn tile.
    this.wsManager = new RoomSocket(this.ticketFor, () => {
      const tile = this.player ? pixelToTile(this.player.x, this.player.y) : this.spawnTile;
      return { x: tile.tileX, y: tile.tileY };
    });
    if (!this.left) this.wsManager.connect();
  }

  /**
   * Leaving, whether or not the game ever got going: a game torn down while it
   * was still starting never joins the room, and one that has lets go of it.
   */
  leave() {
    this.left = true;
    this.wsManager?.disconnect();
  }

  create() {
    this.animationManager.create();
    this.mapManager.create();

    const nav = this.mapManager.getNavGrid();
    const spawn = tileToPixel(this.spawnTile.tileX, this.spawnTile.tileY);
    attachDesks((message) => this.wsManager.send(message));

    this.playerManager = new PlayerManager(this, this.animationManager, nav, this.playerId);
    this.player = this.playerManager.createLocalPlayer(this.playerId, this.name, spawn.x, spawn.y, this.character);

    // Phones and tablets steer with the on-screen joystick (components/room/Joystick.tsx),
    // including the ones that say they are desktops ("Desktop site", iPads).
    setTouchInput(touchFirst() || !this.sys.game.device.os.desktop);

    this.movementManager = new MovementManager(this, this.player, this.animationManager, this.wsManager, nav, (x, y) =>
      this.mapManager.checkCollisionAt(x, y),
    );

    this.seatManager = new SeatManager(
      this,
      this.player,
      this.animationManager,
      this.mapManager.getChairs(),
      this.playerId,
      this.mapManager.getTable(),
      (key, taken) => this.mapManager.press(key, taken),
    );
    const approach = (x: number, y: number, arrive: () => void) => this.movementManager.goTo(x, y, arrive);
    this.seatManager.attach(this.wsManager, (seated) => this.movementManager.setFrozen(seated, () => this.seatManager?.leave()), approach);
    this.meetingZone = this.mapManager.getZone(MEETING_ZONE);

    // Decorating your desk: the camera and your feet are the decorator's until it's done.
    attachDecorate((message) => this.wsManager.send(message), this.playerId);
    this.deskDecorator = new DeskDecorator(this, this.mapManager, (decorating) => {
      this.movementManager.setInputEnabled(!decorating);
      if (decorating) return this.cameraRig?.release();
      // Back to following you: the camera glides there.
      this.cameraRig?.follow();
    });

    callManager.attach(this.wsManager);
    whiteboard.attach(this.wsManager);
    const board = this.mapManager.getWhiteboard();
    if (board) {
      this.whiteboardObject = new WhiteboardObject(this, this.player, board, approach, (id) => this.playerManager.getPlayerName(id));
    }
    // E does whatever is at hand: sit, stand, open the whiteboard (lib/actions).
    this.input.keyboard?.on("keydown-E", () => !typingElsewhere() && doAction());
    // nobody calls into a meeting or out of one, or rings someone already on the line
    this.proximityManager = new ProximityManager(
      this,
      this.playerManager,
      this.player,
      (id) => !callManager.currentMeeting() && !meetingOf(id) && !callManager.isPeer(id),
    );

    this.messageHandler = new MessageHandler(
      this,
      this.playerManager,
      this.animationManager,
      this.seatManager,
      this.playerId,
      this.player,
      (message) => this.wsManager.send(message),
    );
    // Joining a meeting from anywhere walks you into the meeting room, where everyone sees you go.
    this.listen(WALK_TO_MEETING_EVENT, () => this.walkIntoMeetingRoom());

    // The floor fades in once the room has said where you are (MessageHandler), not at a spot you'd jump from.
    this.cameras.main.setAlpha(0);
    this.cameraRig = new CameraRig(this, this.player, CAMERA_LERP, () => !this.deskDecorator?.active());
    // Setting off yourself (a key, a click, an errand) brings the view back from looking round.
    this.movementManager.onSetOff(() => this.cameraRig?.comeBack());
    this.walkOverlay = new WalkOverlay(this, () => this.mapManager.getNavGrid(), () => this.mapManager.getSolids(), this.player);
    this.fitCamera(this.scale.width, this.scale.height);
    // The floor panel changes size with the window, a rotated phone or a
    // panel opening beside it; the view keeps up.
    const onResize = (size: Phaser.Structs.Size) => this.fitCamera(size.width, size.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    // Right-clicking the floor drags it (CameraRig), so no menu.
    this.input.mouse?.disableContextMenu();

    // Zooming: the wheel over the floor, or + and - (not while typing).
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      if (dy) this.zoomBy(dy > 0 ? 1 / ZOOM_STEP : ZOOM_STEP, { x: pointer.x, y: pointer.y });
    });
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (typingElsewhere() || event.ctrlKey || event.metaKey) return;
      if (event.key === "=" || event.key === "+") this.zoomBy(ZOOM_STEP);
      else if (event.key === "-" || event.key === "_") this.zoomBy(1 / ZOOM_STEP);
    });

    this.listen(WALK_TO_PERSON_EVENT, (event: CustomEvent<{ id: string }>) => this.walkOver(event.detail.id));
    this.listen("statusChange", (event: CustomEvent) => {
      this.wsManager.send({ t: "status", status: event.detail.status });
      this.playerManager.updatePlayerStatus(this.playerId, event.detail.status);
    });
    this.listen("noteChange", (event: CustomEvent<{ note: StatusNote | null }>) => {
      this.wsManager.send({ t: "note", note: event.detail.note });
      this.playerManager.updatePlayerNote(this.playerId, event.detail.note);
    });
    this.listen("listeningChange", (event: CustomEvent<{ on: boolean }>) => {
      this.wsManager.send({ t: "listening", on: event.detail.on });
      this.playerManager.updatePlayerListening(this.playerId, event.detail.on);
    });
    this.listen(WAVE_EVENT, (event: CustomEvent<{ id: string }>) => this.wsManager.send({ t: "wave", to: event.detail.id }));
    this.listen("chatFocused", () => this.movementManager.setInputEnabled(false));
    this.listen("chatBlurred", () => this.movementManager.setInputEnabled(!this.deskDecorator?.active()));

    // Under a view the floor isn't seen, so it isn't drawn; it keeps running.
    this.unsubscribeShown = onFloorShown((shown) => this.sys.setVisible(shown));
    this.unsubscribeRename = onFloorRename((name) => {
      this.wsManager.send({ t: "rename", name });
      this.playerManager.renamePlayer(this.playerId, name);
    });
    this.unsubscribeLook = onFloorLook((character) => {
      this.wsManager.send({ t: "look", character });
      this.playerManager.changeLook(this.playerId, character);
    });

    // Everything is listening now: what the room has said so far, its welcome first, is heard from here.
    floorStep("built");
    this.wsManager.listen((message) => this.messageHandler.handleMessage(message));
  }

  /** Canvas pixels per CSS pixel. */
  private get density(): number {
    return 1 / this.scale.zoom;
  }

  /** zoomFor, which works in CSS pixels, for a canvas this size, times how far you've zoomed; never so far out the whole floor fits, either way. */
  private cameraZoom(width: number, height: number, userZoom = this.userZoom): number {
    const density = this.density;
    const [mapWidth, mapHeight] = [this.mapManager.getMapWidth(), this.mapManager.getMapHeight()];
    const farthest = Math.max(width / density / mapWidth, height / density / mapHeight) / MOST_IN_VIEW;
    return Math.max(zoomFor(width / density, height / density, mapWidth, mapHeight) * userZoom, farthest) * density;
  }

  /** Zooms in or out a step, smoothly, on the pointer (canvas pixels) when there is one, and keeps it for next time. */
  private zoomBy(factor: number, anchor?: { x: number; y: number }) {
    // Stepped from what's shown: saved further out than this floor goes, the
    // first step back in should show, not undo steps that never did.
    const { width, height } = this.scale;
    const density = this.density;
    const usual = zoomFor(width / density, height / density, this.mapManager.getMapWidth(), this.mapManager.getMapHeight()) * density;
    const shown = this.cameraZoom(width, height) / usual;
    const next = Phaser.Math.Clamp(shown * factor, ...ZOOM_RANGE);
    if (next === this.userZoom || this.deskDecorator?.active()) return;
    // Out as far as this floor goes already.
    if (factor < 1 && this.cameraZoom(width, height, next) === this.cameraZoom(width, height)) return;
    this.userZoom = next;
    try {
      localStorage.setItem(ZOOM_KEY, String(next));
    } catch {
      // Private browsing: it's kept for this visit only.
    }
    this.cameraRig?.zoomTo(this.cameraZoom(width, height), anchor, () => this.fitTags());
  }

  /**
   * Zoom and deadzone for the floor's size, and name tags and desk claims kept
   * at one size on screen.
   */
  private fitCamera(width: number, height: number) {
    const camera = this.cameras.main;
    // Decorating holds its own close view; the usual one comes back when it's done.
    if (this.deskDecorator?.active()) return;
    const density = this.density;
    camera.setZoom(this.cameraZoom(width, height));
    camera.setDeadzone(Math.min(120 * density, width * 0.2), Math.min(90 * density, height * 0.12));
    this.fitTags();
  }

  /** Name tags and desk claims at one small size on screen, however near or far the camera is. */
  private fitTags() {
    const tagScale = (CAMERA_ZOOM * 0.9) / cssZoom(this);
    this.playerManager.setTagScale(tagScale);
    this.seatManager?.setClaimScale(tagScale);
  }

  /** Where everyone else on the floor is, in world pixels. */
  private others(): Array<{ x: number; y: number }> {
    const spots: Array<{ x: number; y: number }> = [];
    for (const [id, them] of this.playerManager.getPlayers()) if (id !== this.playerId) spots.push({ x: them.x, y: them.y });
    return spots;
  }

  /**
   * "Walk to" someone, from People or chat (floor.ts): to the free tile nearest
   * them, never onto them or anyone else, from our side of them. If they've
   * moved on by the time we get there, we follow, a few times at most.
   */
  private walkOver(id: string, tries = 3) {
    const them = this.playerManager.positionOf(id);
    if (!them || id === this.playerId) return;
    const taken = new Set(this.others().map(({ x, y }) => tileKey(pixelToTile(x, y))));
    this.movementManager.goTo(
      them.x,
      them.y,
      () => {
        const now = this.playerManager.positionOf(id);
        if (now && tries > 1 && Math.hypot(now.x - them.x, now.y - them.y) > FOLLOW_AFTER) this.walkOver(id, tries - 1);
      },
      { force: true, avoid: (tileX, tileY) => taken.has(tileKey({ tileX, tileY })) },
    );
  }

  /** Walks to a free place in the meeting room, unless we are already standing in it. */
  private walkIntoMeetingRoom() {
    const zone = this.meetingZone;
    if (!zone || inZone(zone, this.player.x, this.player.y)) return;
    const taken = this.others()
      .filter(({ x, y }) => inZone(zone, x, y))
      .map(({ x, y }) => pixelToTile(x, y));
    const spot = standingSpot({
      zone,
      table: this.mapManager.getTable(),
      nav: this.mapManager.getNavGrid(),
      chairs: this.mapManager.getChairs(),
      taken,
      seed: this.playerId,
    });
    if (spot) this.movementManager.goTo(spot.x, spot.y, undefined, { force: true });
  }

  /**
   * Whether we stand in the meeting room, told to the app when it changes (the
   * join prompt shows then). In a meeting, walking out of the room once you
   * have reached it is leaving the meeting.
   */
  private watchMeetingRoom() {
    const inside = inZone(this.meetingZone, this.player.x, this.player.y);
    if (inside !== this.insideRoom) {
      this.insideRoom = inside;
      window.dispatchEvent(new CustomEvent(MEETING_ROOM_EVENT, { detail: { inside } }));
    }
    const meeting = callManager.currentMeeting();
    if (meeting !== this.trackedMeeting) {
      this.trackedMeeting = meeting;
      this.reachedRoom = inside;
    }
    if (!meeting) return;
    if (inside) this.reachedRoom = true;
    else if (this.reachedRoom) {
      this.reachedRoom = false;
      callManager.walkedOut();
    }
  }

  private listen(type: string, handler: (event: CustomEvent) => void) {
    const listener = handler as EventListener;
    this.windowListeners.push([type, listener]);
    window.addEventListener(type, listener);
  }

  update(time: number, delta: number) {
    if (!this.player) return;

    this.movementManager.update(delta);
    this.cameraRig?.update(delta);
    this.walkOverlay?.update();
    this.seatManager?.update();
    this.playerManager.update(delta);
    this.playerManager.updateLocalPlayerNameTag(this.player.x, this.player.y, this.seatManager?.seatedDirection());
    this.playerManager.declutterTags(time);
    this.proximityManager.update();
    if (this.meetingZone) this.watchMeetingRoom();
    this.whiteboardObject?.update(time);
    this.deskDecorator?.update();
    this.offerNearestAction();
  }

  /** The nearest thing you could do where you stand, for E and its hint; nothing while the board is open. */
  private offerNearestAction() {
    let best: ActionAt | null = null;
    if (!whiteboard.getSnapshot().open) {
      for (const one of [this.seatManager?.action(), this.whiteboardObject?.action()]) {
        if (one && (!best || one.distance < best.distance)) best = one;
      }
    }
    offerAction(best);
  }

  public cleanup() {
    this.windowListeners.forEach(([type, listener]) => window.removeEventListener(type, listener));
    this.windowListeners.length = 0;
    this.input.keyboard?.off("keydown-E");
    this.input.keyboard?.off("keydown");
    this.input.off(Phaser.Input.Events.POINTER_WHEEL);
    this.cameraRig?.destroy();
    this.walkOverlay?.destroy();
    offerAction(null);
    this.unsubscribeShown?.();
    this.unsubscribeRename?.();
    this.unsubscribeLook?.();

    this.movementManager?.destroy();
    this.wsManager?.disconnect();
    this.playerManager?.destroy();
    this.proximityManager?.destroy();
    callManager.detach();
    attachDesks(null);
    this.deskDecorator?.destroy();
    attachDecorate(null, null);
    this.mapManager?.destroy();
    whiteboard.detach();
    this.whiteboardObject?.destroy();
    this.seatManager?.destroy();
  }
}

export default GameScene;
