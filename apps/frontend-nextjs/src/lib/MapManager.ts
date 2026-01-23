import * as Phaser from "phaser";
import { TILE_SIZE, tileToPixel } from "./types";

export class MapManager {
  private scene: Phaser.Scene;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;

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
  }

  private createColliders() {
    const collLayer = this.map.getObjectLayer("Colliders");
    this.solids = this.scene.physics.add.staticGroup();

    if (collLayer?.objects) {
      collLayer.objects.forEach((obj: unknown) => {
        const o = obj as {
          x: number;
          y: number;
          width?: number;
          height?: number;
        };
        const cx = o.x + (o.width || 0) / 2;
        const cy = o.y + (o.height || 0) / 2;

        const rect = this.scene.add.rectangle(
          cx,
          cy,
          o.width || 1,
          o.height || 1,
          0x000000,
          0,
        );
        this.scene.physics.add.existing(rect, true);
        const body = rect.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(o.width, o.height);
        body.setOffset(0, 0);
        this.solids.add(rect);
      });
    }
  }

  setupColliders(player: Phaser.Physics.Arcade.Sprite) {
    // Add physics to player
    if (player) {
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      // Don't override scale - it's set in PlayerManager
      playerBody.setSize(10, 8).setOffset(3, 56); // Adjusted for feet origin (64px sprite height)
      playerBody.setCollideWorldBounds(true);
      this.scene.physics.add.collider(player, this.solids);
    }

    // Set player depth
    if (player) {
      player.setDepth(10000);
    }
  }

  // Returns spawn position in TILE coordinates
  getRandomSpawnPosition(): { tileX: number; tileY: number } {
    const widthTiles = Math.floor(this.map.widthInPixels / TILE_SIZE);
    const heightTiles = Math.floor(this.map.heightInPixels / TILE_SIZE);
    const paddingTiles = 2; // Don't spawn too close to edge (2 tiles)

    for (let i = 0; i < 50; i++) {
      const tileX = Phaser.Math.Between(
        paddingTiles,
        widthTiles - paddingTiles,
      );
      const tileY = Phaser.Math.Between(
        paddingTiles,
        heightTiles - paddingTiles,
      );

      // Check collision with solids at pixel center
      const pixelPos = tileToPixel(tileX, tileY);
      const pixelX = pixelPos.x;
      const pixelY = pixelPos.y;

      let collides = false;
      this.solids.children.iterate((child: Phaser.GameObjects.GameObject) => {
        const body = child.body as Phaser.Physics.Arcade.StaticBody;
        if (body.hitTest(pixelX, pixelY)) {
          collides = true;
        }
        return null;
      });

      if (!collides) {
        return { tileX, tileY };
      }
    }

    // Fallback to tile (5, 5)
    return { tileX: 5, tileY: 5 };
  }

  checkCollisionAt(pixelX: number, pixelY: number): boolean {
    let collides = false;
    this.solids.children.iterate((child: Phaser.GameObjects.GameObject) => {
      const body = child.body as Phaser.Physics.Arcade.StaticBody;
      if (body.hitTest(pixelX, pixelY)) {
        collides = true;
      }
      return null;
    });
    return collides;
  }

  getMapWidth(): number {
    return this.map.widthInPixels;
  }

  getMapHeight(): number {
    return this.map.heightInPixels;
  }
}
