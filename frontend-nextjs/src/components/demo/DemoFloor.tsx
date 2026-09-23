"use client";

import { useEffect, useRef } from "react";
import type * as PhaserType from "phaser";
import type { CastMember, DemoDirections, DemoScene } from "./DemoScene";

const PREROLL = 2;

/** The canvas draws at this multiple of its box, so the recording (at 4/3 device pixels) stays crisp. */
export const RES = 4 / 3;
const FRAME = 1000 / 30;

export interface FloorHandle {
  /** Runs the floor forward to time t (seconds), frame by frame. */
  stepTo(t: number): void;
  /** Where the camera looks: a zoom (in CSS pixels per map pixel) and the map point at the centre. */
  look(zoom: number, x: number, y: number): void;
  /** A map point on screen, in CSS pixels from the box's corner. */
  toScreen(x: number, y: number): { x: number; y: number } | null;
  positionOf(id: string): { x: number; y: number } | null;
  setStatus(id: string, status: string): void;
  size(): { width: number; height: number };
}

export function DemoFloor({
  cast,
  directions,
  onReady,
}: {
  cast: CastMember[];
  directions: DemoDirections;
  onReady: (handle: FloorHandle) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: PhaserType.Game | undefined;
    let cancelled = false;
    (async () => {
      const Phaser = await import("phaser");
      const { DemoScene: Scene } = await import("./DemoScene");
      if (cancelled || !box.current) return;
      const width = Math.round(box.current.clientWidth * RES);
      const height = Math.round(box.current.clientHeight * RES);
      const scene = new Scene(cast, directions);
      game = new Phaser.Game({
        // WebGL, as in the app: the canvas renderer draws the map tile by tile and leaves seams between them.
        type: Phaser.WEBGL,
        width,
        height,
        parent: box.current,
        scene,
        transparent: true,
        audio: { noAudio: true },
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
      });
      game.canvas.style.width = "100%";
      game.canvas.style.height = "100%";

      const waitReady = () =>
        new Promise<void>((resolve) => {
          const check = () => (scene.ready ? resolve() : setTimeout(check, 50));
          check();
        });
      await waitReady();
      game.loop.sleep();
      let clock = -PREROLL;
      const camera = scene.cameras.main;
      const handle: FloorHandle = {
        stepTo(t) {
          while (clock + FRAME / 1000 <= t + 1e-6) {
            clock += FRAME / 1000;
            (scene as DemoScene).tick(FRAME);
            game!.step(clock * 1000, FRAME);
          }
          // Draw once more so the camera change lands on this frame.
          game!.step(clock * 1000, 0);
        },
        look(zoom, x, y) {
          camera.setZoom(zoom * RES);
          camera.centerOn(x, y);
        },
        toScreen(x, y) {
          const view = camera.worldView;
          return { x: ((x - view.x) * camera.zoom) / RES, y: ((y - view.y) * camera.zoom) / RES };
        },
        positionOf: (id) => (scene as DemoScene).positionOf(id),
        setStatus: (id, status) => (scene as DemoScene).setStatus(id, status),
        size: () => ({ width: width / RES, height: height / RES }),
      };
      // Run the prelude so the first frame of the video is already in motion.
      handle.stepTo(0);
      onReady(handle);
    })();
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
    // The cast and script are fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={box} className="absolute inset-0" />;
}
