"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "next-intl";
import * as Phaser from "phaser";
import GameScene from "../scenes/GameScene";
import type { RoomTicket } from "@/lib/api";
import { setSceneText } from "@/lib/sceneText";
import { prefs } from "@/lib/prefs";

/** Canvas pixels per CSS pixel: the screen's own, up to three; CSS size in battery saver. */
function renderScale(): number {
  const ratio = window.devicePixelRatio || 1;
  if (ratio <= 1 || prefs().batterySaver) return 1;
  return Math.min(ratio, 3);
}

interface PhaserGameProps {
  name: string;
  character: string;
  userId: string;
  /** Asks the API for a ticket to this room; called again on every reconnect. */
  ticketFor: () => Promise<RoomTicket>;
}

const PhaserGame: React.FC<PhaserGameProps> = ({
  name,
  character,
  userId,
  ticketFor,
}) => {
  // The scene keeps the first function it was given; this always calls the current one.
  const nextTicket = useEffectEvent(() => ticketFor());
  const t = useTranslations("scene");
  const tDesk = useTranslations("desk");
  const tCommon = useTranslations("common");
  const gameRef = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);

  // An effect event, so a new translator instance (refreshed messages) is never
  // a reason to tear down the scene and its WebSocket.
  const applySceneText = useEffectEvent(() =>
    setSceneText({
      meeting: t("meeting"),
      drawing: t("drawing"),
      yourDesk: t("yourDesk"),
      claimDesk: t("claimDesk"),
      claimTitle: tDesk("claimTitle"),
      claimNote: tDesk("claimNote"),
      claimConfirm: tDesk("claimConfirm"),
      cancel: tCommon("cancel"),
      claimed: tDesk("claimed"),
    }),
  );

  useEffect(() => {
    // A box with no size (hidden for a moment) leaves the renderer nothing to
    // draw into, which breaks WebGL for good: the game starts, and follows the
    // box, only while it has a size.
    const onResize = () => {
      const box = gameRef.current;
      if (!box?.clientWidth || !box.clientHeight) return;
      const density = renderScale();
      const width = Math.round(box.clientWidth * density);
      const height = Math.round(box.clientHeight * density);
      if (!game.current) start(box, width, height, density);
      else {
        if (game.current.scale.zoom !== 1 / density) game.current.scale.setZoom(1 / density);
        game.current.scale.resize(width, height);
      }
      const ratio = window.devicePixelRatio;
      const canvas = game.current?.canvas;
      if (canvas) canvas.style.imageRendering = density === 1 && Number.isInteger(ratio) && ratio > 1 ? "pixelated" : "";
    };
    window.addEventListener("resize", onResize);
    // The floor is a panel inside the office shell, not the whole window, so it
    // follows its own box rather than the viewport.
    const watcher = new ResizeObserver(onResize);
    if (gameRef.current) watcher.observe(gameRef.current);
    // A move to a screen of another density may not resize the window.
    let density: MediaQueryList | null = null;
    const onDensity = () => {
      watchDensity();
      onResize();
    };
    const watchDensity = () => {
      density?.removeEventListener("change", onDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      density.addEventListener("change", onDensity);
    };
    watchDensity();

    // The scene, from the start: a game torn down before it has finished starting still has it leave the room.
    let scene: GameScene | null = null;
    const start = (box: HTMLDivElement, width: number, height: number, density: number) => {
      applySceneText();

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width,
        height,
        scale: { mode: Phaser.Scale.NONE, zoom: 1 / density },
        parent: box,
        scene: (scene = new GameScene(name, character, userId, () => nextTicket())),
        // The panel behind the canvas paints the space around the map, so it
        // follows the light or dark theme.
        transparent: true,
        // Battery saver: half the frames, which a top-down floor barely shows.
        fps: prefs().batterySaver ? { limit: 30 } : undefined,
        // The room has no Phaser sounds. Without this, every game builds a
        // WebAudio context it never uses, and complains about it once the game
        // is torn down.
        audio: { noAudio: true },
        // Only presses on the floor itself count. Listening on the window, Phaser
        // also takes clicks on whatever covers it (a meeting, a menu, a toast) as
        // clicks on the floor underneath: a pin in a meeting walked you to the whiteboard.
        input: { windowEvents: false },
        // Nothing on the floor uses Phaser's effects; without these it doesn't build their shaders while starting.
        disablePreFX: true,
        disablePostFX: true,
      };
      game.current = new Phaser.Game(config);
      game.current.events.once(Phaser.Core.Events.READY, onResize);
      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__game = game.current;
      }
    };
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      watcher.disconnect();
      density?.removeEventListener("change", onDensity);
      scene?.leave();
      if (game.current) {
        const running = game.current.scene.getScene("GameScene") as GameScene;
        if (running) {
          running.cleanup();
        }

        try {
          game.current.destroy(true);
        } catch (error) {
          console.error("Error destroying game instance:", error);
        }

        game.current = null;
      }
    };
  }, [name, character, userId]);

  return <div ref={gameRef} className="w-full h-full" />;
};

export default PhaserGame;
