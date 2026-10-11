import * as Phaser from "phaser";
import type { ClientMessage, MeetingUsage, PlayerState, ServerMessage } from "@shared/messages";
import { PlayerManager } from "./PlayerManager";
import { SeatManager } from "./SeatManager";
import { callManager } from "./CallManager";
import { whiteboard } from "./WhiteboardManager";
import { jukebox } from "./JukeboxManager";
import { AnimationManager } from "./AnimationManager";
import { playSound } from "./sounds";
import { tileToPixel } from "@/lib/types";
import { DEFAULT_CHARACTER, isCharacter } from "@shared/profile";
import { setMeetings, setMeetingUsage } from "./meetings";
import { deskOf, deskState, setDesks } from "./desks";
import { myStatus, TEAMMATE_ARRIVED_EVENT, WAVED_AT_YOU_EVENT } from "./floor";
import { track } from "@/lib/analytics";

/** Applies what the room says to the scene and the React overlays. */
export class MessageHandler {
  /** Welcomed once already: every later welcome is a return after a dropped connection. */
  private arrived = false;

  constructor(
    private scene: Phaser.Scene,
    private playerManager: PlayerManager,
    private animationManager: AnimationManager,
    private seats: SeatManager,
    private playerId: string,
    private player: Phaser.GameObjects.Sprite,
    private send: (message: ClientMessage) => void,
  ) {}

  handleMessage(message: ServerMessage) {
    switch (message.t) {
      case "welcome":
        setDesks(message.desks ?? []);
        this.welcome(message.self, message.players);
        jukebox.handleMusic(message.music);
        whiteboard.sync();
        setMeetings(message.meetings ?? []);
        if (message.usage) this.meetingUsage(message.usage);
        callManager.welcomed(message.self.id);
        break;
      case "desks":
        setDesks(message.desks);
        break;
      case "player_joined":
        if (message.player.id === this.playerId) return;
        this.addUser(message.player);
        this.dispatchPlayerList();
        playSound("join");
        // Walked in, not back after a dropped connection: the floor can say hello (docs/product.md).
        if (message.arrived) this.tell(TEAMMATE_ARRIVED_EVENT, message.player.id);
        break;
      case "waved":
        this.playerManager.wave(message.from);
        if (message.to === this.playerId) this.tell(WAVED_AT_YOU_EVENT, message.from);
        break;
      case "player_left":
        this.handleUserLeft(message.id);
        break;
      case "moved":
        if (message.id !== this.playerId) {
          this.playerManager.updatePlayerPosition(message.id, message.x, message.y, message.d);
        }
        break;
      case "walking":
        if (message.id !== this.playerId) this.playerManager.walkPlayerTo(message.id, message.x, message.y);
        break;
      case "move_rejected":
        this.snapLocalPlayer(message.x, message.y);
        break;
      case "sat":
        this.seatPlayer(message.id, message.seat, true);
        break;
      case "stood":
        this.seats.release(message.id);
        this.playerManager.standPlayer(message.id);
        break;
      case "sit_rejected":
        this.seats.rejected();
        break;
      case "meeting_joined":
      case "meeting_member_joined":
      case "meeting_member_left":
      case "meetings":
      case "speaking":
      case "meeting_invited":
      case "meeting_error":
      case "sfu":
        callManager.handleMeeting(message);
        break;
      case "meeting_usage":
        this.meetingUsage(message.usage);
        break;
      case "call":
        callManager.handleCall(message);
        break;
      case "status":
        this.playerManager.updatePlayerStatus(message.id, message.status);
        this.dispatchPlayerList();
        window.dispatchEvent(new CustomEvent("playerStatusChanged", { detail: { id: message.id, status: message.status } }));
        break;
      case "board_state":
      case "board_draw":
      case "board_clear":
        whiteboard.handleMessage(message);
        break;
      case "music":
        jukebox.handleMusic(message);
        break;
    }
  }

  /** Past the place's meeting hours, meetings go voice only until they reset (docs/pricing.md). */
  private meetingUsage(usage: MeetingUsage) {
    setMeetingUsage(usage);
    callManager.setVideoPaused(usage.paused);
  }

  /** Arriving, or coming back after a reconnect: the room's word replaces whatever we had. */
  private welcome(self: PlayerState, players: PlayerState[]) {
    // A new connection starts you as available; busy, away or on a call is said again.
    const status = myStatus();
    if (status !== self.status && status !== "offline") this.send({ t: "status", status });
    // Everyone else; our own sprite and nameplate stay.
    for (const { id } of this.playerManager.getPlayerList()) {
      if (id === this.playerId) continue;
      this.seats.release(id);
      this.playerManager.removePlayer(id);
    }

    const spawn = tileToPixel(self.x, self.y);
    this.player.setPosition(spawn.x, spawn.y);
    this.playerManager.showLocalPlayer();
    // The view starts where you are, rather than sweeping over from where it was.
    this.scene.cameras.main.centerOn(spawn.x, spawn.y);
    const spriteName = isCharacter(self.character) ? self.character : DEFAULT_CHARACTER;
    this.player.setData("spriteName", spriteName);
    this.player.play(this.animationManager.getAnimationKey(spriteName, "idle", "down"));

    players.forEach((player) => this.addUser(player));
    this.dispatchPlayerList();
    // Arriving, the room put you a few steps from your desk: walk in and sit
    // down (docs/product.md). Back after a dropped connection, to the chair you were on.
    if (this.arrived) return this.seats.resit();
    this.arrived = true;
    // Who shows up, and with how many already there: whether a team is on the floor together.
    track("floor_entered", { people_here: players.length });
    this.scene.tweens.add({ targets: this.scene.cameras.main, alpha: 1, duration: 260, ease: "Cubic.easeOut" });
    const desk = deskOf(deskState().desks, this.playerId);
    if (desk) this.seats.walkToDesk(desk.seat);
  }

  private addUser(player: PlayerState) {
    this.playerManager.addPlayer(player.id, player.name, player.x, player.y, player.character, player.status, player.guest);
    if (player.seat !== null) this.seatPlayer(player.id, player.seat, false);
  }

  private seatPlayer(id: string, seat: number, walk: boolean) {
    if (id === this.playerId || !Number.isFinite(seat)) return;
    const pose = this.seats.occupy(seat, id);
    if (pose) this.playerManager.sitPlayer(id, pose, walk);
  }

  private snapLocalPlayer(x: number, y: number) {
    const target = tileToPixel(x, y);
    this.scene.tweens.add({ targets: this.player, x: target.x, y: target.y, duration: 150, ease: "Power2" });
  }

  private handleUserLeft(id: string) {
    this.seats.release(id);
    this.playerManager.removePlayer(id);
    callManager.dropPeer(id);
    this.dispatchPlayerList();
  }

  /** Tells the page about someone, by id and the name the floor knows them by. */
  private tell(type: string, id: string) {
    const name = this.playerManager.getPlayerName(id);
    if (name) window.dispatchEvent(new CustomEvent(type, { detail: { id, name } }));
  }

  private dispatchPlayerList() {
    window.dispatchEvent(new CustomEvent("playerListUpdated", { detail: this.playerManager.getPlayerList() }));
  }
}
