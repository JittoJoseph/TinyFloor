"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import { Video, Mic, MessageSquare, BadgeCheck, User } from "lucide-react";

interface NearbyPlayer {
  id: string;
  name: string;
  username?: string;
  isGuest?: boolean;
  x: number;
  y: number;
  status: string;
}

// Memoized player card component to prevent unnecessary re-renders
const PlayerCard = memo(function PlayerCard({
  player,
  x,
  y,
  isBelow,
  onCall,
  onChat,
  onViewProfile,
}: {
  player: NearbyPlayer;
  x: number;
  y: number;
  isBelow: boolean;
  onCall: (id: string, type: "audio" | "video") => void;
  onChat: () => void;
  onViewProfile: (userId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "away":
        return "bg-yellow-500";
      case "in_call":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "busy":
        return "Busy";
      case "away":
        return "Away";
      case "in_call":
        return "In Call";
      default:
        return "Unknown";
    }
  };

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
      <div className="bg-[#fbfbf9] rounded-[2rem] shadow-sm border border-[rgba(0,0,0,0.06)] p-4 w-52 relative">
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <div className="w-9 h-9 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] font-bold text-sm">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <div className="font-bold text-[var(--color-braun-text)] text-sm leading-tight truncate tracking-wide">
                {player.name}
              </div>
              {!player.isGuest && (
                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className={`w-2 h-2 rounded-full ${getStatusColor(player.status)}`}
              ></div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {getStatusText(player.status)}
              </span>
              {player.isGuest && (
                <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">
                  GUEST
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 relative z-10">
          {player.id && (
            <button
              onClick={() => onViewProfile(player.id)}
              className="flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.06)] shadow-sm p-2 rounded-full transition-all flex items-center justify-center hover:-translate-y-0.5"
              title="View Profile"
            >
              <User size={14} />
            </button>
          )}
          <button
            onClick={() => onCall(player.id, "video")}
            className="flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.06)] shadow-sm p-2 rounded-full transition-all flex items-center justify-center hover:-translate-y-0.5"
            title="Video Call"
          >
            <Video size={14} />
          </button>
          <button
            onClick={() => onCall(player.id, "audio")}
            className="flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.06)] shadow-sm p-2 rounded-full transition-all flex items-center justify-center hover:-translate-y-0.5"
            title="Audio Call"
          >
            <Mic size={14} />
          </button>
          <button
            onClick={onChat}
            className="cursor-pointer flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.06)] shadow-sm p-2 rounded-full transition-all flex items-center justify-center hover:-translate-y-0.5"
            title="Chat"
          >
            <MessageSquare size={14} />
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

    const handlePlayerStatusChanged = (
      event: CustomEvent<{ id: string; status: string }>,
    ) => {
      const { id, status } = event.detail;
      setNearbyPlayers((prev) =>
        prev.map((player) =>
          player.id === id ? { ...player, status } : player,
        ),
      );
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener(
      "proximityUpdate",
      handleProximityUpdate as EventListener,
    );
    window.addEventListener(
      "playerStatusChanged",
      handlePlayerStatusChanged as EventListener,
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "proximityUpdate",
        handleProximityUpdate as EventListener,
      );
      window.removeEventListener(
        "playerStatusChanged",
        handlePlayerStatusChanged as EventListener,
      );
    };
  }, []);

  const handleCall = useCallback(
    (playerId: string, type: "audio" | "video") => {
      window.dispatchEvent(
        new CustomEvent("initiateCall", { detail: { playerId, type } }),
      );
    },
    [],
  );

  const handleChat = useCallback(() => {
    window.dispatchEvent(new Event("openChat"));
  }, []);

  const handleViewProfile = useCallback((userId: string) => {
    window.open(`/dashboard?user=${userId}`, "_blank", "noopener,noreferrer");
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
            onViewProfile={handleViewProfile}
          />
        );
      })}
    </div>
  );
}
