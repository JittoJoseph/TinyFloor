import * as Phaser from "phaser";
import { WebSocketMessage } from "./WebSocketManager";
import { PlayerManager } from "./PlayerManager";
import { callManager } from "./CallManager";
import { AnimationManager } from "./AnimationManager";
import { playSound } from "./sounds";
import { tileToPixel } from "./types";
import type { PlayerStatus } from "./types";

interface MovementData {
  id: string;
  tileX: number;
  tileY: number;
}

interface UserData {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  sprite: string;
  status?: PlayerStatus;
  guest?: boolean;
}

const VALID_SPRITES = ["Adam", "Alex", "Amelia", "Bob"];

export class MessageHandler {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private animationManager: AnimationManager;
  private playerId: string;
  private player: Phaser.Physics.Arcade.Sprite;

  constructor(
    scene: Phaser.Scene,
    playerManager: PlayerManager,
    animationManager: AnimationManager,
    playerId: string,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.animationManager = animationManager;
    this.playerId = playerId;
    this.player = player;
  }

  handleMessage(msg: WebSocketMessage) {
    switch (msg.type) {
      case "space-joined":
        this.handleSpaceJoined(msg.data);
        break;
      case "movement-rejected":
        this.snapLocalPlayer(msg.data as unknown as MovementData);
        break;
      case "movement":
        this.applyMovement(msg.data as unknown as MovementData);
        break;
      case "movements_batch":
        (msg.data.movements as MovementData[] | undefined)?.forEach((m) =>
          this.applyMovement(m),
        );
        break;
      case "walk_to": {
        const { id, tileX, tileY } = msg.data as unknown as MovementData;
        if (id !== this.playerId) {
          this.playerManager.walkPlayerTo(id, tileX, tileY);
        }
        break;
      }
      case "user-join":
        this.handleUserJoin(msg.data as unknown as UserData);
        playSound("join");
        break;
      case "user-left":
        this.handleUserLeft(msg.data.id as string);
        break;
      case "call_invite":
      case "call_accept":
      case "call_decline":
      case "call_signal":
      case "call_end":
        callManager.handleMessage(msg.type, msg.data);
        break;
      case "chat":
        if (msg.data.senderId !== this.playerId) playSound("message");
        window.dispatchEvent(
          new CustomEvent("chatMessage", { detail: msg.data }),
        );
        break;
      case "status_changed":
        this.handleStatusChanged(msg.data as unknown as {
          id: string;
          status: PlayerStatus;
        });
        break;
    }
  }

  private applyMovement(movement: MovementData) {
    if (movement.id === this.playerId) return;
    this.playerManager.updatePlayerPosition(
      movement.id,
      movement.tileX,
      movement.tileY,
    );
  }

  private snapLocalPlayer({ tileX, tileY }: MovementData) {
    const target = tileToPixel(tileX, tileY);
    this.scene.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: 150,
      ease: "Power2",
    });
  }

  private handleSpaceJoined(data: Record<string, unknown>) {
    const spawn = tileToPixel(data.tileX as number, data.tileY as number);
    this.player.setPosition(spawn.x, spawn.y);

    const sprite = data.sprite as string;
    if (sprite) {
      const spriteName = VALID_SPRITES.includes(sprite) ? sprite : "Adam";
      this.player.setData("spriteName", spriteName);
      this.player.play(
        this.animationManager.getAnimationKey(spriteName, "idle", "down"),
      );
    }

    (data.existingUsers as UserData[]).forEach((user) => this.addUser(user));
    this.dispatchPlayerList();
  }

  private handleUserJoin(user: UserData) {
    this.addUser(user);
    this.dispatchPlayerList();
  }

  private addUser(user: UserData) {
    this.playerManager.addPlayer(
      user.id,
      user.name,
      user.tileX,
      user.tileY,
      user.sprite,
      user.status || "available",
      user.guest !== false,
    );
  }

  private handleUserLeft(id: string) {
    this.playerManager.removePlayer(id);
    callManager.dropPeer(id);
    this.dispatchPlayerList();
  }

  private handleStatusChanged({
    id,
    status,
  }: {
    id: string;
    status: PlayerStatus;
  }) {
    this.playerManager.updatePlayerStatus(id, status);
    window.dispatchEvent(
      new CustomEvent("playerStatusChanged", { detail: { id, status } }),
    );
  }

  private dispatchPlayerList() {
    window.dispatchEvent(
      new CustomEvent("playerListUpdated", {
        detail: this.playerManager.getPlayerList(),
      }),
    );
  }
}
