import * as Phaser from 'phaser';

export class MapManager {
  private scene: Phaser.Scene;
  private map!: Phaser.Tilemaps.Tilemap;
  private solids!: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    this.scene.load.tilemapTiledJSON("office", "/tilesets/office-map.tmj");
    this.scene.load.image("RoomBuilder", "/tilesets/textures/Room_Builder_Office_32x32.png");
    this.scene.load.image("ModernOffice", "/tilesets/textures/Modern_Office_Black_Shadow_32x32.png");
  }

  create() {
    this.map = this.scene.make.tilemap({ key: "office" });
    const rb = this.map.addTilesetImage("Room_Builder_Office_32x32", "RoomBuilder");
    const mo = this.map.addTilesetImage("Modern_Office_Black_Shadow_32x32", "ModernOffice");

    if (!rb || !mo) {
      throw new Error("Tilesets not found");
    }

    this.map.createLayer("Ground", [rb, mo], 0, 0)!.setDepth(0);
    this.map.createLayer("Walls", [rb, mo], 0, 0)!.setDepth(10);
    this.map.createLayer("DesksBack", [rb, mo], 0, 0)!.setDepth(20);
    this.map.createLayer("DeskItems_Back", [rb, mo], 0, 0)!.setDepth(25);

    // Create front layers
    this.map.createLayer("Dividers", [mo], 0, 0)!.setDepth(1000);
    this.map.createLayer("DesksFront", [mo], 0, 0)!.setDepth(1010);
    this.map.createLayer("DeskItems_Front", [mo], 0, 0)!.setDepth(1020);

    // Create over player layer
    this.map.createLayer("OverPlayer_Layer", [rb, mo], 0, 0)!.setDepth(20000);
  }

  setupColliders(player: Phaser.Physics.Arcade.Sprite) {
    // Build colliders from object layer
    const collLayer = this.map.getObjectLayer("Colliders");
    this.solids = this.scene.physics.add.staticGroup();

    if (collLayer && collLayer.objects) {
      collLayer.objects.forEach((obj: unknown) => {
        const o = obj as { x: number; y: number; width?: number; height?: number };
        const cx = o.x + (o.width || 0) / 2;
        const cy = o.y + (o.height || 0) / 2;

        const rect = this.scene.add.rectangle(
          cx,
          cy,
          o.width || 1,
          o.height || 1,
          0x000000,
          0
        );
        this.scene.physics.add.existing(rect, true);
        const body = rect.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(o.width, o.height);
        body.setOffset(0, 0);
        this.solids.add(rect);
      });
    }

    // Add physics to player
    if (player) {
      const playerBody = player.body as Phaser.Physics.Arcade.Body;
      player.setScale(2);
      playerBody.setSize(10, 8).setOffset(3, 24);
      playerBody.setCollideWorldBounds(true);
      this.scene.physics.add.collider(player, this.solids);
    }

    // Set player depth
    if (player) {
      player.setDepth(10000);
    }
  }

  getMapWidth(): number {
    return this.map.widthInPixels;
  }

  getMapHeight(): number {
    return this.map.heightInPixels;
  }
}