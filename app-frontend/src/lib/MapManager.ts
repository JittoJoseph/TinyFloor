import * as Phaser from "phaser";
import { NavGrid, Rect } from "./Navigation";
import { TILE_SIZE } from "@/lib/types";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { FLOOR } from "@shared/map";
import { officePieces, type OfficePiece } from "@shared/office";
import { paintShell } from "@shared/shell";
import { pieceChanges, subscribePieces } from "./pieces";
import atlas from "@shared/catalog/atlas.json";

export interface MapAnchor {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChairSpec {
  id: number;
  x: number;
  y: number;
  /** Which way you face sitting there: never sideways (docs/customization.md). */
  direction: "up" | "down";
  zone?: string;
}

/**
 * Objects are drawn at a depth equal to their base y, so whether a desk covers
 * you or you cover it falls out of where you are standing rather than out of
 * which layer it happens to live on.
 */
export function depthForY(y: number): number {
  return y;
}

const ITEMS = "floor-items";
const WALLS = "floor-walls";

/**
 * The floor: the Startup template as the lab worked it out (shared-protocol
 * map.ts, FLOOR). Its walls and floors are drawn once, here, from the room
 * builder sheet; everything on them is a frame of the catalog's atlas, at the
 * depth the lab gave it, with what people have made of their desks applied
 * (lib/pieces.ts) and drawn again, piece by piece, as that changes; what you
 * can't walk through, the chairs and the spots the floor keeps (the meeting
 * room, its table, the whiteboard) are read as they are.
 */
export class MapManager {
  private scene: Phaser.Scene;
  private solidRects: Rect[] = [];
  private nav!: NavGrid;
  private chairSpecs: ChairSpec[] = [];
  /** Each piece's picture, by its key, and the pieces as they're drawn now. */
  private images = new Map<string, Phaser.GameObjects.Image>();
  private pieces: OfficePiece[] = [];
  private unsubscribe?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    this.scene.load.image(ITEMS, FLOOR_FILES.items);
    this.scene.load.image("RoomBuilder", FLOOR_FILES.roomBuilder);
  }

  create() {
    this.drawWalls();
    this.drawPieces();
    this.unsubscribe = subscribePieces(() => this.drawPieces());
    this.readChairs();
    this.solidRects = FLOOR.solids.map(([x, y, width, height]) => ({ x, y, width, height }));
    this.nav = new NavGrid(this.solidRects);
  }

  /** The walls and floors, painted from the room builder sheet into one texture (shared-protocol shell.ts). */
  private drawWalls() {
    if (!this.scene.textures.exists(WALLS)) {
      const sheet = this.scene.textures.get("RoomBuilder").getSourceImage() as HTMLImageElement;
      const source = document.createElement("canvas");
      [source.width, source.height] = [sheet.width, sheet.height];
      const context = source.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(sheet, 0, 0);
      const pixels = paintShell(FLOOR.shell, { width: sheet.width, height: sheet.height, data: context.getImageData(0, 0, sheet.width, sheet.height).data });
      const texture = this.scene.textures.createCanvas(WALLS, pixels.width, pixels.height)!;
      texture.context.putImageData(new ImageData(pixels.data as Uint8ClampedArray<ArrayBuffer>, pixels.width, pixels.height), 0, 0);
      texture.refresh();
    }
    this.scene.add.image(0, 0, WALLS).setOrigin(0, 0).setDepth(0);
  }

  /**
   * Everything on the floor, each a frame of the atlas, drawn from its top left
   * at its depth. Drawn again whenever a desk changes: a piece keeps its
   * picture and is only moved or given another frame; one gone is taken away.
   */
  private drawPieces() {
    const texture = this.scene.textures.get(ITEMS);
    const frames = atlas.frames as unknown as Record<string, [number, number, number, number]>;
    this.pieces = officePieces(pieceChanges());
    const seen = new Set<string>();
    for (const piece of this.pieces) {
      const frame = frames[piece.item];
      if (!frame) continue;
      if (!texture.has(piece.item)) texture.add(piece.item, 0, ...frame);
      seen.add(piece.key);
      const image = this.images.get(piece.key) ?? this.scene.add.image(0, 0, ITEMS, piece.item).setOrigin(0, 0);
      this.images.set(piece.key, image);
      if (image.frame.name !== piece.item) image.setFrame(piece.item);
      image.setPosition(piece.x, piece.y).setDepth(piece.depth);
    }
    for (const [key, image] of this.images) {
      if (seen.has(key)) continue;
      image.destroy();
      this.images.delete(key);
    }
  }

  /** Every piece back where the office has it (a drag let go of somewhere it can't stand). */
  refresh() {
    this.drawPieces();
  }

  /** The pieces as they're drawn now, and each one's picture: what decorating picks up and moves. */
  getPieces(): readonly OfficePiece[] {
    return this.pieces;
  }

  getImage(key: string): Phaser.GameObjects.Image | undefined {
    return this.images.get(key);
  }

  destroy() {
    this.unsubscribe?.();
  }

  /**
   * Every seat, as the seat code reads a chair: its middle, a tile above where
   * whoever sits there is (the seat's point is its base).
   */
  private readChairs() {
    this.chairSpecs = FLOOR.seats.map((seat) => ({ id: seat.id, x: seat.x, y: seat.y - TILE_SIZE / 2, direction: seat.dir, zone: seat.zone }));
  }

  getChairs(): ChairSpec[] {
    return this.chairSpecs;
  }

  /** A room the floor names (the meeting room is "meeting"). */
  getZone(name: string): MapAnchor | undefined {
    return FLOOR.anchors.zones?.find((zone) => zone.name === name);
  }

  /** The meeting table, which carries the meeting room's tag. */
  getTable(): MapAnchor | undefined {
    const table = FLOOR.anchors.table;
    return table && { name: "table", ...table };
  }

  /** The whiteboard's place on the wall. */
  getWhiteboard(): MapAnchor | undefined {
    const board = FLOOR.anchors.whiteboard;
    return board && { name: "whiteboard", ...board };
  }

  getNavGrid(): NavGrid {
    return this.nav;
  }

  getRandomSpawnTile(keepCentered = false): { tileX: number; tileY: number } {
    const camera = this.scene.cameras.main;
    const halfView = camera.height / camera.zoom / 2;
    const [width, height] = FLOOR.shell.size;
    const lowest = height * TILE_SIZE - halfView;

    const preferred: Array<{ tileX: number; tileY: number }> = [];
    const fallback: Array<{ tileX: number; tileY: number }> = [];

    for (let tileY = 2; tileY < height - 2; tileY++) {
      const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;
      const centered = worldY >= halfView && worldY <= lowest;
      for (let tileX = 2; tileX < width - 2; tileX++) {
        if (!this.nav.isWalkable(tileX, tileY)) continue;
        if (!keepCentered || centered) preferred.push({ tileX, tileY });
        else fallback.push({ tileX, tileY });
      }
    }

    const candidates = preferred.length ? preferred : fallback;
    if (!candidates.length) return { tileX: 22, tileY: 4 };
    return candidates[Phaser.Math.Between(0, candidates.length - 1)];
  }

  checkCollisionAt(pixelX: number, pixelY: number): boolean {
    return this.solidRects.some(
      (r) =>
        pixelX >= r.x &&
        pixelX <= r.x + r.width &&
        pixelY >= r.y &&
        pixelY <= r.y + r.height,
    );
  }

  getMapWidth(): number {
    return FLOOR.shell.size[0] * TILE_SIZE;
  }

  getMapHeight(): number {
    return FLOOR.shell.size[1] * TILE_SIZE;
  }
}
