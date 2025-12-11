"use client";

import { useEffect, useState } from "react";
import { Video, Mic, MessageSquare } from "lucide-react";

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function ProximityOverlay() {
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Initial size
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
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

  const handleCall = (playerId: string, type: "audio" | "video") => {
    window.dispatchEvent(
      new CustomEvent("initiateCall", { detail: { playerId, type } })
    );
  };

  const handleChat = () => {
    window.dispatchEvent(new Event("openChat"));
  };

  // Helper to calculate safe position
  const getSafePosition = (x: number, y: number) => {
    const CARD_WIDTH = 192; // w-48 is 12rem = 192px
    const CARD_HEIGHT = 120; // Approximate height
    const PADDING = 16;

    let safeX = x;
    let safeY = y - 70; // Default offset above player

    // Check right edge
    if (safeX + CARD_WIDTH / 2 > windowSize.width - PADDING) {
      safeX = windowSize.width - CARD_WIDTH / 2 - PADDING;
    }
    // Check left edge
    if (safeX - CARD_WIDTH / 2 < PADDING) {
      safeX = CARD_WIDTH / 2 + PADDING;
    }

    // Check top edge
    if (safeY - CARD_HEIGHT < PADDING) {
      safeY = y + 40; // Move below player if too close to top
    }

    return { x: safeX, y: safeY };
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {nearbyPlayers.map((player) => {
        const { x, y } = getSafePosition(player.x, player.y);
        const isBelow = y > player.y; // Check if we flipped to below

        return (
          <div
            key={player.id}
            className="absolute transform -translate-x-1/2 pointer-events-auto transition-all duration-75 ease-linear"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, ${isBelow ? "0%" : "-100%"})`,
            }}
          >
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-800 p-3 w-48 animate-bounce-slight relative">
              {/* Tail - Adjust based on position */}

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
                  onClick={() => handleCall(player.id, "video")}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  title="Video Call"
                >
                  <Video size={16} />
                </button>
                <button
                  onClick={() => handleCall(player.id, "audio")}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  title="Audio Call"
                >
                  <Mic size={16} />
                </button>
                <button
                  onClick={handleChat}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  title="Chat"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
