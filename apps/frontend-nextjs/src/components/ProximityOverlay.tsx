"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import { Video, Mic, MessageSquare } from "lucide-react";

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
}

// Memoized player card component to prevent unnecessary re-renders
const PlayerCard = memo(function PlayerCard({
  player,
  x,
  y,
  isBelow,
  onCall,
  onChat,
}: {
  player: NearbyPlayer;
  x: number;
  y: number;
  isBelow: boolean;
  onCall: (id: string, type: "audio" | "video") => void;
  onChat: () => void;
}) {
  return (
    <div
      className="absolute transform -translate-x-1/2 pointer-events-auto"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, ${isBelow ? "0%" : "-100%"})`,
        willChange: "left, top", // Hint for GPU acceleration
      }}
    >
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-800 p-3 w-48 relative">
        <div className="flex items-center gap-3 mb-2 relative z-10">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-indigo-500 flex items-center justify-center text-indigo-700 font-bold font-pixel">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-gray-800 text-sm leading-tight">
              {player.name}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-green-600 font-medium">
                Available
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 relative z-10">
          <button
            onClick={() => onCall(player.id, "video")}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
            title="Video Call"
          >
            <Video size={16} />
          </button>
          <button
            onClick={() => onCall(player.id, "audio")}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
            title="Audio Call"
          >
            <Mic size={16} />
          </button>
          <button
            onClick={onChat}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
            title="Chat"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default function ProximityOverlay() {
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const windowSizeRef = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      windowSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };

    const handleProximityUpdate = (event: CustomEvent<NearbyPlayer[]>) => {
      setNearbyPlayers(event.detail);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener(
      "proximityUpdate",
      handleProximityUpdate as EventListener
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "proximityUpdate",
        handleProximityUpdate as EventListener
      );
    };
  }, []);

  const handleCall = useCallback(
    (playerId: string, type: "audio" | "video") => {
      window.dispatchEvent(
        new CustomEvent("initiateCall", { detail: { playerId, type } })
      );
    },
    []
  );

  const handleChat = useCallback(() => {
    window.dispatchEvent(new Event("openChat"));
  }, []);

  // Helper to calculate safe position
  const getSafePosition = useCallback((x: number, y: number) => {
    const CARD_WIDTH = 192;
    const CARD_HEIGHT = 120;
    const PADDING = 16;
    const { width, height } = windowSizeRef.current;

    let safeX = x;
    let safeY = y - 70;

    if (safeX + CARD_WIDTH / 2 > width - PADDING) {
      safeX = width - CARD_WIDTH / 2 - PADDING;
    }
    if (safeX - CARD_WIDTH / 2 < PADDING) {
      safeX = CARD_WIDTH / 2 + PADDING;
    }
    if (safeY - CARD_HEIGHT < PADDING) {
      safeY = y + 40;
    }

    return { x: safeX, y: safeY };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {nearbyPlayers.map((player) => {
        const { x, y } = getSafePosition(player.x, player.y);
        const isBelow = y > player.y;

        return (
          <PlayerCard
            key={player.id}
            player={player}
            x={x}
            y={y}
            isBelow={isBelow}
            onCall={handleCall}
            onChat={handleChat}
          />
        );
      })}
    </div>
  );
}
