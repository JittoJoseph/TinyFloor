import * as Phaser from "phaser";
import type { PlayerState, ServerMessage } from "@shared/messages";
import { PlayerManager } from "./PlayerManager";
import { SeatManager } from "./SeatManager";
import { callManager } from "./CallManager";
import { whiteboard } from "./WhiteboardManager";
import { jukebox } from "./JukeboxManager";
import { AnimationManager } from "./AnimationManager";
import { playSound } from "./sounds";
import { tileToPixel } from "./types";

const VALID_SPRITES = ["Adam", "Alex", "Amelia", "Ash", "Bob", "Dan", "Lucy", "Molly"];

/** Applies what the room says to the scene and the React overlays. */
export class MessageHandler {
  constructor(
    private scene: Phaser.Scene,
    private playerManager: PlayerManager,
    private animationManager: AnimationManager,
    private seats: SeatManager,
    private playerId: string,
    private player: Phaser.Physics.Arcade.Sprite,
  ) {}

  handleMessage(message: ServerMessage) {
    switch (message.t) {
      case "welcome":
        this.welcome(message.self, message.players);
        jukebox.handleMusic(message.music);
        whiteboard.sync();
        break;
      case "player_joined":
        if (message.player.id === this.playerId) return;
        this.addUser(message.player);
        this.dispatchPlayerList();
        playSound("join");
        break;
      case "player_left":
        this.handleUserLeft(message.id);
        break;
      case "moved":
        if (message.id !== this.playerId) {
          this.playerManager.updatePlayerPosition(message.id, message.x, message.y, message.ox, message.oy);
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
      case "sfu":
        callManager.handleMeeting(message);
        break;
      case "call":
        callManager.handleCall(message);
        break;
      case "status":
        this.playerManager.updatePlayerStatus(message.id, message.status);
        window.dispatchEvent(
          new CustomEvent("playerStatusChanged", { detail: { id: message.id, status: message.status } }),
        );
        break;
      case "chat":
        // Your own messages are already in the panel; the room echoes them to everyone.
        if (message.id === this.playerId) return;
        playSound("message");
        window.dispatchEvent(
          new CustomEvent("chatMessage", {
            detail: {
              id: `${message.at}-${message.id}`,
              senderId: message.id,
              senderName: message.name,
              content: message.text,
              timestamp: new Date(message.at),
              type: "text",
            },
          }),
        );
        break;
      case "board_state":
      case "board_draw":
      case "board_clear":
        whiteboard.handleMessage(message);
        break;
      case "music":
        jukebox.handleMusic(message);
        break;
      case "error":
        if (message.code === "slow_down") window.dispatchEvent(new CustomEvent("chatSlowDown"));
        break;
    }
  }

  /** Arriving, or coming back after a reconnect: the room's word replaces whatever we had. */
  private welcome(self: PlayerState, players: PlayerState[]) {
    // Everyone else; our own sprite and nameplate stay.
    for (const { id } of this.playerManager.getPlayerList()) {
      if (id === this.playerId) continue;
      this.seats.release(id);
      this.playerManager.removePlayer(id);
    }

    const spawn = tileToPixel(self.x, self.y);
    this.player.setPosition(spawn.x, spawn.y);
    const spriteName = VALID_SPRITES.includes(self.character) ? self.character : "Adam";
    this.player.setData("spriteName", spriteName);
    this.player.play(this.animationManager.getAnimationKey(spriteName, "idle", "down"));

    players.forEach((player) => this.addUser(player));
    this.dispatchPlayerList();
    this.seats.resit();
  }

  private addUser(player: PlayerState) {
    this.playerManager.addPlayer(
      player.id,
      player.name,
      player.x,
      player.y,
      player.character,
      player.status,
      player.guest,
    );
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

  private dispatchPlayerList() {
    window.dispatchEvent(new CustomEvent("playerListUpdated", { detail: this.playerManager.getPlayerList() }));
  }
}
