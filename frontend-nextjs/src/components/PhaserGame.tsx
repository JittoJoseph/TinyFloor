"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "next-intl";
import * as Phaser from "phaser";
import GameScene from "../scenes/GameScene";
import type { RoomTicket } from "@/lib/api";
import { setSceneText } from "@/lib/sceneText";

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
  const gameRef = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);

  // An effect event, so a new translator instance (refreshed messages) is never
  // a reason to tear down the scene and its WebSocket.
  const applySceneText = useEffectEvent(() =>
    setSceneText({
      guide: t("guide"),
      sit: t("sit"),
      stand: t("stand"),
      joinMeeting: t("joinMeeting"),
      meeting: t("meeting"),
      music: t("music"),
      draw: t("draw"),
    }),
  );

  const sharpen = useEffectEvent(() => {
    const canvas = game.current?.canvas;
    if (!canvas) return;
    const ratio = window.devicePixelRatio;
    canvas.style.imageRendering =
      Number.isInteger(ratio) && ratio > 1 ? "pixelated" : "";
  });

  useEffect(() => {
    const onResize = () => {
      const box = gameRef.current;
      if (box && game.current) game.current.scale.resize(box.clientWidth, box.clientHeight);
      sharpen();
    };
    window.addEventListener("resize", onResize);
    // The floor is a panel inside the office shell, not the whole window, so it
    // follows its own box rather than the viewport.
    const watcher = new ResizeObserver(onResize);
    if (gameRef.current) watcher.observe(gameRef.current);

    if (gameRef.current && !game.current) {
      applySceneText();

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: gameRef.current.clientWidth || window.innerWidth,
        height: gameRef.current.clientHeight || window.innerHeight,
        parent: gameRef.current,
        scene: new GameScene(name, character, userId, () => nextTicket()),
        // The panel behind the canvas paints the space around the map, so it
        // follows the light or dark theme.
        transparent: true,
        // The room has no Phaser sounds; the jukebox plays through an <audio>
        // element. Without this, every game builds a WebAudio context it never
        // uses, and complains about it once the game is torn down.
        audio: { noAudio: true },
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
            gravity: { x: 0, y: 0 },
            width: gameRef.current.clientWidth || window.innerWidth,
            height: gameRef.current.clientHeight || window.innerHeight,
          },
        },
      };
      game.current = new Phaser.Game(config);
      game.current.events.once(Phaser.Core.Events.READY, onResize);
      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__game = game.current;
      }
    }

    return () => {
      window.removeEventListener("resize", onResize);
      watcher.disconnect();
      if (game.current) {
        const scene = game.current.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.cleanup();
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
