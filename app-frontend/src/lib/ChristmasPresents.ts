import * as Phaser from "phaser";
import { FLOOR } from "shared-protocol/map";
import { GROUNDS } from "shared-protocol/shell";
import { TILE_SIZE } from "web-shared/lib/types";
import { setByPresents } from "./christmas";
import { crisp } from "./crisp";
import { depthForY, type MapManager } from "./MapManager";
import type { GoTo } from "./MovementManager";

const KEY = "christmas-presents";
const ART = "/christmas-gifts.png";
/** The pile's art, and the part of it that's solid (its boxes, not their shadows), in floor pixels from its top left. */
const SIZE = { width: 72, height: 48 };
const SOLID = { x: 6, y: 18, width: 60, height: 26 };
/** How near you have to be to the boxes for the presents to offer you the hat: about a step away. */
const NEAR = 28;
/** How far out from the door the pile sits, at least, so it's in the grounds and not in the doorway. */
const OUT = 2;

type Tile = { x: number; y: number };

/**
 * A small pile of presents just outside the building, on the grass beside its
 * way in (lib/christmas): on any floor with grounds round it, worked out from
 * the floor itself, so it's in the same place for everyone. Walked round like
 * anything else on the floor; a press on it walks you over. Standing by it,
 * the prompt over the dock offers the Christmas hat (FloorPrompt).
 */
export class ChristmasPresents {
  private image?: Phaser.GameObjects.Image;
  private sparkle?: Phaser.GameObjects.Arc;
  private glints?: Phaser.Time.TimerEvent;
  private at: { x: number; y: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    private map: MapManager,
    private player: Phaser.GameObjects.Components.Transform,
    private goTo: GoTo,
  ) {}

  static preload(scene: Phaser.Scene) {
    scene.load.image(KEY, ART);
  }

  create() {
    const at = (this.at = this.spot());
    if (!at) return;
    const scene = this.scene;
    const bottom = at.y + SIZE.height;
    this.image = crisp(scene.add.image(at.x, at.y, KEY).setOrigin(0, 0))
      .setDepth(depthForY(bottom))
      .setInteractive({ useHandCursor: true, pixelPerfect: true })
      // Pressed, you walk up beside it, not into it.
      .on(Phaser.Input.Events.POINTER_UP, () => this.goTo(at.x - 12, bottom - 6, () => {}));
    this.map.addSolid({ x: at.x + SOLID.x, y: at.y + SOLID.y, width: SOLID.width, height: SOLID.height });
    // A glint now and then on top of a box, so the pile catches the eye.
    const sparkle = (this.sparkle = scene.add.circle(0, 0, 1, 0xffffff).setDepth(depthForY(bottom) + 0.1).setAlpha(0));
    const glints = [
      { x: 18, y: 26 },
      { x: 46, y: 22 },
      { x: 24, y: 14 },
      { x: 60, y: 28 },
    ];
    this.glints = scene.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        const glint = glints[Math.floor(Math.random() * glints.length)];
        sparkle.setPosition(at.x + glint.x, at.y + glint.y).setScale(1).setAlpha(0);
        scene.tweens.add({ targets: sparkle, alpha: 1, scale: 1.6, duration: 260, yoyo: true, ease: "Sine.easeInOut" });
      },
    });
  }

  /** Each frame: whether you're standing by the pile. */
  update() {
    const at = this.at;
    if (!at) return;
    // From your feet to the nearest edge of the boxes, so it's the same from any side of a wide pile.
    const { x, y } = this.player;
    const dx = Math.max(at.x + SOLID.x - x, 0, x - (at.x + SOLID.x + SOLID.width));
    const dy = Math.max(at.y + SOLID.y - y, 0, y - (at.y + SOLID.y + SOLID.height));
    setByPresents(Math.hypot(dx, dy) < NEAR);
  }

  destroy() {
    setByPresents(false);
    this.glints?.remove();
    this.image?.destroy();
    this.sparkle?.destroy();
  }

  /**
   * Where the pile goes: on the grass a couple of tiles out from the
   * building's main way in (the door nearest the middle of the building that
   * opens onto paving), beside the path rather than on it, somewhere clear.
   * Null on a floor with no grounds.
   */
  private spot(): { x: number; y: number } | null {
    const { rows, legend, size } = FLOOR.shell;
    const [width, height] = size;
    const cell = (x: number, y: number) => legend[rows[y]?.[x] ?? " "];
    const material = (x: number, y: number) => cell(x, y)?.material ?? "";
    const isGround = (x: number, y: number) => cell(x, y)?.kind === "floor" && (GROUNDS as readonly string[]).includes(material(x, y));
    const isIndoors = (x: number, y: number) => cell(x, y)?.kind === "floor" && !isGround(x, y);
    const nav = this.map.getNavGrid();
    const steps: Tile[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

    // The building's middle, and its doors: indoor floor beside walkable ground.
    let sx = 0;
    let sy = 0;
    let n = 0;
    const doors: Array<Tile & { out: Tile; paved: boolean }> = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (!isIndoors(x, y)) continue;
        sx += x;
        sy += y;
        n++;
        for (const out of steps) {
          if (isGround(x + out.x, y + out.y) && nav.isWalkable(x + out.x, y + out.y)) doors.push({ x, y, out, paved: material(x + out.x, y + out.y) === "paving" });
        }
      }
    }
    if (!n || !doors.length) return null;
    const middle = { x: sx / n, y: sy / n };
    const paved = doors.filter((door) => door.paved);
    const away = (tile: Tile) => Math.hypot(tile.x - middle.x, tile.y - middle.y);
    const door = (paved.length ? paved : doors).reduce((best, one) => (away(one) < away(best) ? one : best));

    // The nearest clear patch of grass out from that door, off the path.
    const tilesWide = Math.ceil(SIZE.width / TILE_SIZE);
    const tilesHigh = Math.ceil(SIZE.height / TILE_SIZE);
    const pieces = this.map.getPieces().map((piece) => {
      const image = this.map.getImage(piece.key);
      return { x0: piece.x, y0: piece.y, x1: piece.x + (image?.width ?? TILE_SIZE), y1: piece.y + (image?.height ?? TILE_SIZE) };
    });
    let best: { tile: Tile; score: number } | null = null;
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        const tile = { x: door.x + door.out.x * OUT + dx, y: door.y + door.out.y * OUT + dy };
        // Out past the door, not beside it on the building's side.
        if ((tile.x - door.x) * door.out.x + (tile.y - door.y) * door.out.y < OUT) continue;
        let clear = true;
        for (let ty = tile.y - 1; ty <= tile.y + tilesHigh && clear; ty++) {
          for (let tx = tile.x - 1; tx <= tile.x + tilesWide && clear; tx++) {
            if (material(tx, ty) !== "grass" || !nav.isWalkable(tx, ty)) clear = false;
          }
        }
        if (!clear) continue;
        const box = { x0: tile.x * TILE_SIZE - 8, y0: tile.y * TILE_SIZE - 24, x1: tile.x * TILE_SIZE + SIZE.width + 8, y1: tile.y * TILE_SIZE + SIZE.height + 8 };
        if (pieces.some((p) => p.x1 > box.x0 && p.x0 < box.x1 && p.y1 > box.y0 && p.y0 < box.y1)) continue;
        const score = Math.hypot(tile.x - door.x, tile.y - door.y);
        if (!best || score < best.score) best = { tile, score };
      }
    }
    return best ? { x: best.tile.x * TILE_SIZE, y: best.tile.y * TILE_SIZE + (tilesHigh * TILE_SIZE - SIZE.height) } : null;
  }
}
