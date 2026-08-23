import * as Phaser from "phaser";
import { NavGrid, Rect } from "./Navigation";
import { TILE_SIZE } from "./types";

export class MapManager {
  private scene: Phaser.Scene;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private solidRects: Rect[] = [];
  private nav!: NavGrid;

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

    const tilesets = [rb, mo];
    this.map.createLayer("Ground", tilesets, 0, 0)!.setDepth(0);
    this.map.createLayer("Walls", tilesets, 0, 0)!.setDepth(10);
    this.map.createLayer("DesksBack", tilesets, 0, 0)!.setDepth(20);
    this.map.createLayer("DeskItems_Back", tilesets, 0, 0)!.setDepth(25);
    this.map.createLayer("Dividers", [mo], 0, 0)!.setDepth(1000);
    this.map.createLayer("DesksFront", [mo], 0, 0)!.setDepth(1010);
    this.map.createLayer("DeskItems_Front", [mo], 0, 0)!.setDepth(1020);
    this.map.createLayer("OverPlayer_Layer", tilesets, 0, 0)!.setDepth(20000);

    this.createColliders();
    this.nav = new NavGrid(this.solidRects);
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

  setupColliders(player: Phaser.Physics.Arcade.Sprite) {
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8).setOffset(3, 56);
    body.setCollideWorldBounds(true);
    this.scene.physics.add.collider(player, this.solids);
    player.setDepth(10000);
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
    if (!candidates.length) return { tileX: 5, tileY: 5 };
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
