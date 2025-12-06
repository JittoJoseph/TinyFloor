"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import GameScene from "../scenes/GameScene";

interface PhaserGameProps {
  name: string;
  roomId: string;
  character: string;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ name, roomId, character }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !game.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: gameRef.current,
        scene: new GameScene(name, roomId, character),
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
    }

    return () => {
      if (game.current) {
        const scene = game.current.scene.getScene("GameScene") as GameScene;
        if (scene) {
          scene.cleanup();
        }

        game.current.destroy(true);
        game.current = null;
      }
    };
  }, [name]);

  return <div ref={gameRef} />;
};

export default PhaserGame;
