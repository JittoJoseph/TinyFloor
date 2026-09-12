import * as Phaser from "phaser";
import { NavGrid, Rect } from "./Navigation";
import { MAP_WIDTH_TILES, TILE_SIZE } from "./types";

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
  direction: "up" | "down" | "left" | "right";
  zone?: string;
}

interface TilesetRef {
  key: string;
  firstgid: number;
  lastgid: number;
}

/**
 * Objects are drawn at a depth equal to their base y, so whether a desk covers
 * you or you cover it falls out of where you are standing rather than out of
 * which layer it happens to live on.
 */
export function depthForY(y: number): number {
  return y;
}

export class MapManager {
  private scene: Phaser.Scene;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private solidRects: Rect[] = [];
  private nav!: NavGrid;
  private tilesetRefs: TilesetRef[] = [];
  private chairSpecs: ChairSpec[] = [];
  private anchors: Record<string, MapAnchor[]> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    this.scene.load.tilemapTiledJSON("office", "/tilesets/office-map.tmj");
    this.scene.load.image(
      "RoomBuilder",
      "/tilesets/textures/Room_Builder_Office_32x32.png",
    );
    this.scene.load.image(
      "ModernOffice",
      "/tilesets/textures/Modern_Office_Black_Shadow_32x32.png",
    );
    this.scene.load.spritesheet(
      "RoomBuilderTiles",
      "/tilesets/textures/Room_Builder_Office_32x32.png",
      { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE },
    );
    this.scene.load.spritesheet(
      "ModernOfficeTiles",
      "/tilesets/textures/Modern_Office_Black_Shadow_32x32.png",
      { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE },
    );
    this.scene.load.spritesheet("chairs", "/tilesets/items/chair.png", {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE * 2,
    });
  }

  create() {
    this.map = this.scene.make.tilemap({ key: "office" });
    const rb = this.map.addTilesetImage(
      "Room_Builder_Office_32x32",
      "RoomBuilder",
    );
    const mo = this.map.addTilesetImage(
      "Modern_Office_Black_Shadow_32x32",
      "ModernOffice",
    );
    if (!rb || !mo) throw new Error("Tilesets not found");

    this.tilesetRefs = [
      { key: "RoomBuilderTiles", firstgid: rb.firstgid, lastgid: rb.firstgid + rb.total - 1 },
      { key: "ModernOfficeTiles", firstgid: mo.firstgid, lastgid: mo.firstgid + mo.total - 1 },
      { key: "chairs", firstgid: 1073, lastgid: 1073 + 22 },
    ];

    this.map.createLayer("Ground", [rb, mo], 0, 0)!.setDepth(0);
    this.map.createLayer("Walls", [rb, mo], 0, 0)!.setDepth(1);

    this.createFurniture();
    this.readAnchors();
    this.readChairs();
    this.createColliders();
    this.nav = new NavGrid(this.solidRects);
  }

  private resolve(gid: number): { key: string; frame: number } | null {
    const id = gid & 0x1fffffff;
    for (const ref of this.tilesetRefs) {
      if (id >= ref.firstgid && id <= ref.lastgid) {
        return { key: ref.key, frame: id - ref.firstgid };
      }
    }
    return null;
  }

  /**
   * Tiled anchors tile objects on their bottom edge, which is also where we want
   * their depth measured from.
   */
  private createFurniture() {
    const objects = this.map.getObjectLayer("Furniture")?.objects ?? [];
    objects.forEach((obj) => {
      if (!obj.gid) return;
      const tile = this.resolve(obj.gid);
      if (!tile) return;
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      this.scene.add
        .image(x, y, tile.key, tile.frame)
        .setOrigin(0, 1)
        .setDepth(depthForY(y));
    });
  }

  private readChairs() {
    const objects = this.map.getObjectLayer("Chair")?.objects ?? [];
    objects.forEach((obj) => {
      if (!obj.gid) return;
      const tile = this.resolve(obj.gid);
      if (!tile) return;
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      const direction =
        (obj.properties as Array<{ name: string; value: string }> | undefined)?.find(
          (p) => p.name === "direction",
        )?.value ?? "down";
      // a chair the far side of a desk shares that desk row's depth, so nudge it
      // behind or the seat draws on top of the desk it is tucked under
      this.scene.add
        .image(x, y, tile.key, tile.frame)
        .setOrigin(0, 1)
        .setDepth(depthForY(y) + (direction === "down" ? -1 : 0));
      const cx = x + TILE_SIZE / 2;
      const cy = y - TILE_SIZE / 2;
      this.chairSpecs.push({
        // the chair's tile, so ids survive the map being regenerated
        id: (y / TILE_SIZE) * MAP_WIDTH_TILES + x / TILE_SIZE,
        x: cx,
        y: cy,
        direction: direction as ChairSpec["direction"],
        zone: this.getAnchors("Zones").find(
          (z) =>
            cx >= z.x && cx < z.x + z.width && cy >= z.y && cy < z.y + z.height,
        )?.name,
      });
    });
  }

  private readAnchors() {
    ["Computer", "Whiteboard", "Speaker", "Zones", "Table"].forEach((layer) => {
      this.anchors[layer] = (
        this.map.getObjectLayer(layer)?.objects ?? []
      ).map((obj) => ({
        name: obj.name || "",
        x: obj.x ?? 0,
        y: obj.y ?? 0,
        width: obj.width || TILE_SIZE,
        height: obj.height || TILE_SIZE,
      }));
    });
  }

  private createColliders() {
    this.solids = this.scene.physics.add.staticGroup();
    const objects = this.map.getObjectLayer("Colliders")?.objects ?? [];

    objects.forEach((obj) => {
      const width = obj.width || 1;
      const height = obj.height || 1;
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;

      this.solidRects.push({ x, y, width, height });

      const rect = this.scene.add.rectangle(
        x + width / 2,
        y + height / 2,
        width,
        height,
        0x000000,
        0,
      );
      this.scene.physics.add.existing(rect, true);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(width, height);
      body.setOffset(0, 0);
      this.solids.add(rect);
    });
  }

  /**
   * The local player is moved by hand against `checkCollisionAt`, so the arcade
   * body is here only for overlap tests. Letting arcade move it as well makes
   * the two fight and snaps the sprite back mid walk.
   */
  setupColliders(player: Phaser.Physics.Arcade.Sprite) {
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 10);
    body.setOffset(9, 21);
    body.setCollideWorldBounds(false);
    body.moves = false;
  }

  getChairs(): ChairSpec[] {
    return this.chairSpecs;
  }

  getAnchors(layer: string): MapAnchor[] {
    return this.anchors[layer] ?? [];
  }

  getNavGrid(): NavGrid {
    return this.nav;
  }

  getRandomSpawnTile(keepCentered = false): { tileX: number; tileY: number } {
    const camera = this.scene.cameras.main;
    const halfView = camera.height / camera.zoom / 2;
    const lowest = this.map.heightInPixels - halfView;

    const preferred: Array<{ tileX: number; tileY: number }> = [];
    const fallback: Array<{ tileX: number; tileY: number }> = [];

    for (let tileY = 2; tileY < this.map.height - 2; tileY++) {
      const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;
      const centered = worldY >= halfView && worldY <= lowest;
      for (let tileX = 2; tileX < this.map.width - 2; tileX++) {
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
    return this.map.widthInPixels;
  }

  getMapHeight(): number {
    return this.map.heightInPixels;
  }
}
