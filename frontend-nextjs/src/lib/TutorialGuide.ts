import * as Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { NavGrid } from "./Navigation";
import {
  GUIDE_ID,
  GUIDE_NAME,
  GUIDE_SPRITE,
  TUTORIAL_FINISHED_EVENT,
} from "./tutorial";
import { callManager } from "./CallManager";
import { TILE_SIZE, pixelToTile } from "./types";

const FOLLOW_INTERVAL = 1200;
const REPATH_DISTANCE = 5;
const TELEPORT_DISTANCE = 12;
const OFFSETS: Array<[number, number]> = [
  [3, 0],
  [-3, 0],
  [0, 3],
  [0, -3],
  [3, 3],
  [-3, 3],
  [3, -3],
  [-3, -3],
  [4, 0],
  [-4, 0],
  [0, 4],
  [0, -4],
];

export class TutorialGuide {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;
  private nav: NavGrid;
  private player: Phaser.Physics.Arcade.Sprite;
  private timer?: Phaser.Time.TimerEvent;
  private onFinished: EventListener;

  constructor(
    scene: Phaser.Scene,
    playerManager: PlayerManager,
    nav: NavGrid,
    player: Phaser.Physics.Arcade.Sprite,
  ) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.nav = nav;
    this.player = player;

    const spawn = this.tileNearPlayer();
    playerManager.addPlayer(
      GUIDE_ID,
      GUIDE_NAME,
      spawn.x,
      spawn.y,
      GUIDE_SPRITE,
      "offline",
      true,
    );

    this.timer = scene.time.addEvent({
      delay: FOLLOW_INTERVAL,
      loop: true,
      callback: () => this.follow(),
    });

    this.onFinished = () => this.destroy();
    window.addEventListener(TUTORIAL_FINISHED_EVENT, this.onFinished);
  }

  private tileNearPlayer() {
    const center = pixelToTile(this.player.x, this.player.y);
    for (const [dx, dy] of OFFSETS) {
      const x = center.tileX + dx;
      const y = center.tileY + dy;
      if (this.nav.isWalkable(x, y)) return { x, y };
    }
    return { x: center.tileX, y: center.tileY };
  }

  private follow() {
    const guide = this.playerManager.getPlayers().get(GUIDE_ID);
    if (!guide) return;

    const distance =
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        guide.x,
        guide.y,
      ) / TILE_SIZE;
    if (distance <= REPATH_DISTANCE) return;

    const target = this.tileNearPlayer();
    if (distance > TELEPORT_DISTANCE) {
      this.playerManager.updatePlayerPosition(GUIDE_ID, target.x, target.y);
    } else {
      this.playerManager.walkPlayerTo(GUIDE_ID, target.x, target.y);
    }
  }

  destroy() {
    if (callManager.isPeer(GUIDE_ID)) callManager.hangUp(GUIDE_ID);
    window.removeEventListener(TUTORIAL_FINISHED_EVENT, this.onFinished);
    this.timer?.remove();
    this.timer = undefined;
    this.playerManager.removePlayer(GUIDE_ID);
  }
}
