import { WALK_TO_PERSON_EVENT } from "../lib/floor";
import * as Phaser from "phaser";
import type { RoomTicket } from "../lib/api";
import { RoomSocket } from "../lib/RoomSocket";
import { PlayerManager } from "../lib/PlayerManager";
import { ProximityManager } from "../lib/ProximityManager";
import { callManager } from "../lib/CallManager";
import { AnimationManager } from "../lib/AnimationManager";
import { MovementManager } from "../lib/MovementManager";
import { MapManager } from "../lib/MapManager";
import { SeatManager } from "../lib/SeatManager";
import { MessageHandler } from "../lib/MessageHandler";
import { TutorialGuide } from "../lib/TutorialGuide";
import { WhiteboardObject } from "../lib/WhiteboardObject";
import { whiteboard } from "../lib/WhiteboardManager";
import { JukeboxObject } from "../lib/JukeboxObject";
import { jukebox } from "../lib/JukeboxManager";
import { tutorialDone, setTouchInput } from "../lib/tutorial";
import { touchFirst } from "../lib/touch";
import { TILE_SIZE, pixelToTile, tileToPixel } from "../lib/types";
import { MEETING_ROOM_EVENT, meetingOf, WALK_TO_MEETING_EVENT } from "../lib/meetings";
import { inZone, MEETING_ZONE, standingSpot } from "../lib/meetingRoom";
import type { MapAnchor } from "../lib/MapManager";

const CAMERA_LERP = 0.08;
/** How close the camera sits wherever there is room for it. */
const CAMERA_ZOOM = 1.2;
/** On a small screen it pulls back until at least this many tiles show each way... */
const MIN_TILES_SHORT = 15;
const MIN_TILES_LONG = 24;
/** ...but never so far that people and their names get too small to read. */
const MIN_ZOOM = 0.62;
const NARROW_WIDTH = 768;

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
  private player!: Phaser.Physics.Arcade.Sprite;
  private wsManager!: RoomSocket;
  private playerManager!: PlayerManager;
  private proximityManager!: ProximityManager;
  private animationManager!: AnimationManager;
  private movementManager!: MovementManager;
  private mapManager!: MapManager;
  private messageHandler!: MessageHandler;
  private tutorialGuide?: TutorialGuide;
  private whiteboardObject?: WhiteboardObject;
  private jukeboxObject?: JukeboxObject;
  private seatManager?: SeatManager;
  private windowListeners: Array<[string, EventListener]> = [];
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
    this.mapManager = new MapManager(this);
    this.mapManager.preload();

    this.animationManager = new AnimationManager(this);
    this.animationManager.preload();
  }

  create() {
    this.animationManager.create();
    this.mapManager.create();

    const nav = this.mapManager.getNavGrid();
    const mapWidth = this.mapManager.getMapWidth();
    const mapHeight = this.mapManager.getMapHeight();
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.setZoom(zoomFor(this.scale.width, this.scale.height, mapWidth, mapHeight));

    const keepCentered =
      !tutorialDone() && this.cameras.main.width < NARROW_WIDTH;
    const spawnTile = this.mapManager.getRandomSpawnTile(keepCentered);
    const spawn = tileToPixel(spawnTile.tileX, spawnTile.tileY);

    // A reconnect puts you back where you were standing, not at the spawn tile.
    this.wsManager = new RoomSocket(this.ticketFor, () => {
      const tile = this.player ? pixelToTile(this.player.x, this.player.y) : spawnTile;
      return { x: tile.tileX, y: tile.tileY };
    });

    this.playerManager = new PlayerManager(
      this,
      this.animationManager,
      nav,
      this.playerId,
    );
    this.player = this.playerManager.createLocalPlayer(
      this.playerId,
      this.name,
      spawn.x,
      spawn.y,
      this.character,
    );
    this.mapManager.setupColliders(this.player);

    // Phones and tablets steer with the on-screen joystick (components/room/Joystick.tsx),
    // including the ones that say they are desktops ("Desktop site", iPads).
    setTouchInput(touchFirst() || !this.sys.game.device.os.desktop);

    this.movementManager = new MovementManager(
      this,
      this.player,
      this.animationManager,
      this.wsManager,
      nav,
      (x, y) => this.mapManager.checkCollisionAt(x, y),
    );

    this.seatManager = new SeatManager(
      this,
      this.player,
      this.animationManager,
      this.mapManager.getChairs(),
      this.mapManager.getAnchors("Table")[0],
    );
    const approach = (x: number, y: number, arrive: () => void) =>
      this.movementManager.goTo(x, y, arrive);
    this.seatManager.attach(
      this.wsManager,
      (seated) =>
        this.movementManager.setFrozen(seated, () => this.seatManager?.leave()),
      approach,
    );
    this.meetingZone = this.mapManager.getAnchors("Zones").find((zone) => zone.name === MEETING_ZONE);

    callManager.attach(this.wsManager);
    whiteboard.attach(this.wsManager);
    const board = this.mapManager.getAnchors("Whiteboard")[0];
    if (board) {
      this.whiteboardObject = new WhiteboardObject(
        this,
        this.player,
        { x: board.x, y: board.y + 10, width: board.width, height: 52 },
        approach,
      );
    }
    jukebox.attach(this.wsManager);
    const speaker = this.mapManager.getAnchors("Speaker")[0];
    if (speaker) {
      this.jukeboxObject = new JukeboxObject(
        this,
        this.player,
        { x: speaker.x, y: speaker.y },
        approach,
      );
    }
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
    );
    this.wsManager.setOnMessage((message) => this.messageHandler.handleMessage(message));
    // Joining a meeting from anywhere walks you into the meeting room, where everyone sees you go.
    this.listen(WALK_TO_MEETING_EVENT, () => this.walkIntoMeetingRoom());

    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, false, CAMERA_LERP, CAMERA_LERP);
    this.fitCamera(this.scale.width, this.scale.height);
    // The floor panel changes size with the window, a rotated phone or a
    // panel opening beside it; the view keeps up.
    const onResize = (size: Phaser.Structs.Size) => this.fitCamera(size.width, size.height);
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));

    // "Walk to" beside someone in People or chat: the same walk a click on the
    // floor makes, to the free tile nearest them.
    this.listen(WALK_TO_PERSON_EVENT, (event: CustomEvent<{ id: string }>) => {
      const spot = this.playerManager.positionOf(event.detail.id);
      if (spot) this.movementManager.goTo(spot.x, spot.y, () => {});
    });
    this.listen("statusChange", (event: CustomEvent) => {
      this.wsManager.send({ t: "status", status: event.detail.status });
      this.playerManager.updatePlayerStatus(this.playerId, event.detail.status);
    });
    if (!tutorialDone()) {
      this.tutorialGuide = new TutorialGuide(
        this,
        this.playerManager,
        nav,
        this.player,
      );
    }

    this.listen("chatFocused", () =>
      this.movementManager.setInputEnabled(false),
    );
    this.listen("chatBlurred", () =>
      this.movementManager.setInputEnabled(true),
    );

    // Everything is listening now, so nothing the room says first is missed.
    this.wsManager.connect();
  }

  /**
   * Zoom and deadzone for the floor's size, and name tags kept readable as the
   * camera pulls back: they shrink with the map only down to about their
   * usual size on screen.
   */
  private fitCamera(width: number, height: number) {
    const camera = this.cameras.main;
    const zoom = zoomFor(width, height, this.mapManager.getMapWidth(), this.mapManager.getMapHeight());
    camera.setZoom(zoom);
    camera.setDeadzone(Math.min(120, width * 0.2), Math.min(90, height * 0.12));
    this.playerManager.setTagScale(Math.max(1, (CAMERA_ZOOM * 0.9) / zoom));
  }

  /** Walks to a free place in the meeting room, unless we are already standing in it. */
  private walkIntoMeetingRoom() {
    const zone = this.meetingZone;
    if (!zone || inZone(zone, this.player.x, this.player.y)) return;
    const taken: Array<{ tileX: number; tileY: number }> = [];
    for (const [id] of this.playerManager.getPlayers()) {
      if (id === this.playerId) continue;
      const at = this.playerManager.positionOf(id);
      if (at && inZone(zone, at.x, at.y)) taken.push(pixelToTile(at.x, at.y));
    }
    const spot = standingSpot({
      zone,
      table: this.mapManager.getAnchors("Table")[0],
      nav: this.mapManager.getNavGrid(),
      chairs: this.mapManager.getChairs(),
      taken,
      seed: this.playerId,
    });
    if (spot) this.movementManager.goTo(spot.x, spot.y, () => {}, true);
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
    this.seatManager?.update();
    this.playerManager.update(delta);
    this.playerManager.updateLocalPlayerNameTag(
      this.player.x,
      this.player.y,
      this.seatManager?.seatedDirection(),
    );
    this.proximityManager.update();
    if (this.meetingZone) this.watchMeetingRoom();
    this.whiteboardObject?.update();
    this.jukeboxObject?.update(time, delta);
  }

  public cleanup() {
    this.windowListeners.forEach(([type, listener]) =>
      window.removeEventListener(type, listener),
    );
    this.windowListeners.length = 0;

    this.movementManager?.destroy();
    this.wsManager?.disconnect();
    this.playerManager?.destroy();
    this.proximityManager?.destroy();
    callManager.detach();
    whiteboard.detach();
    this.whiteboardObject?.destroy();
    jukebox.detach();
    this.jukeboxObject?.destroy();
    this.seatManager?.destroy();
    this.tutorialGuide?.destroy();
  }
}

export default GameScene;
