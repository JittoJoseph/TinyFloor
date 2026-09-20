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
    const onResize = () => sharpen();
    window.addEventListener("resize", onResize);

    if (gameRef.current && !game.current) {
      applySceneText();

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: gameRef.current,
        scene: new GameScene(name, character, userId, () => nextTicket()),
        backgroundColor: "#f0f0f0",
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
            gravity: { x: 0, y: 0 },
            width: window.innerWidth,
            height: window.innerHeight,
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
      if (game.current) {
        const scene = game.current.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.cleanup();
        }

        // Prevent audio errors on destroy
        if (game.current.sound) {
          game.current.sound.pauseOnBlur = false;
          game.current.sound.removeAll();
          game.current.sound.stopAll();
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

  return <div ref={gameRef} />;
};

export default PhaserGame;
