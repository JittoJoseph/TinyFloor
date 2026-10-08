"use client";

import { useEffect, useRef } from "react";

export function MapRender() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let game: import("phaser").Game | undefined;
    let cancelled = false;
    (async () => {
      const Phaser = await import("phaser");
      const { MapManager } = await import("@/lib/MapManager");
      const { WhiteboardObject } = await import("@/lib/WhiteboardObject");
      const { JukeboxObject } = await import("@/lib/JukeboxObject");
      if (cancelled) return;
      class Render extends Phaser.Scene {
        map!: InstanceType<typeof MapManager>;
        constructor() {
          super({ key: "render" });
        }
        preload() {
          this.map = new MapManager(this);
          this.map.preload();
        }
        create() {
          this.map.create();
          const nobody = this.physics.add.sprite(-9999, -9999, "__DEFAULT").setVisible(false);
          const board = this.map.getAnchors("Whiteboard")[0];
          if (board) new WhiteboardObject(this, nobody, board, () => {});
          const speaker = this.map.getAnchors("Speaker")[0];
          if (speaker) new JukeboxObject(this, nobody, speaker, () => {});
          this.cameras.main.setZoom(1).centerOn(this.map.getMapWidth() / 2, this.map.getMapHeight() / 2);
          // Draw a frame, then hand the picture out as a PNG.
          this.time.delayedCall(300, () =>
            this.game.renderer.snapshot((image) => {
              (window as unknown as { __png: string }).__png = (image as HTMLImageElement).src;
            }),
          );
        }
      }
      game = new Phaser.Game({
        type: Phaser.WEBGL,
        width: 1536,
        height: 1024,
        parent: box.current!,
        scene: Render,
        backgroundColor: "#000000",
        audio: { noAudio: true },
        physics: { default: "arcade" },
        preserveDrawingBuffer: true,
      } as import("phaser").Types.Core.GameConfig);
    })();
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);
  return <div ref={box} style={{ position: "fixed", left: 0, top: 0, width: 1536, height: 1024 }} />;
}
