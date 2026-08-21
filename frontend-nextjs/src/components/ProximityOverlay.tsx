"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { Video, Mic, MessageSquare, User } from "lucide-react";
import { callManager } from "@/lib/CallManager";

interface NearbyPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  status: string;
  guest: boolean;
}

const GAP = 22;
const PADDING = 12;
const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-red-500",
  away: "bg-yellow-500",
  in_call: "bg-blue-500",
};

const PlayerCard = memo(function PlayerCard({
  player,
  flip,
  onCall,
  onChat,
  onViewProfile,
}: {
  player: NearbyPlayer;
  flip: boolean;
  onCall: (id: string, name: string, video: boolean) => void;
  onChat: () => void;
  onViewProfile: (userId: string) => void;
}) {
  const actionClass =
    "cursor-pointer w-7 h-7 rounded-full bg-white border border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all flex items-center justify-center shrink-0";

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: flip ? player.x - GAP : player.x + GAP,
        top: player.y,
        transform: `translate(${flip ? "-100%" : "0"}, -50%)`,
      }}
    >
      <div className="flex items-center gap-1.5 bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-full shadow-md p-1.5">
        <div className="relative w-7 h-7 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] font-bold text-xs shrink-0">
          {player.name.charAt(0).toUpperCase()}
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-[1.5px] border-[#fbfbf9] ${
              STATUS_COLORS[player.status] || "bg-gray-400"
            }`}
          />
        </div>

        <button
          onClick={() => onCall(player.id, player.name, true)}
          className={actionClass}
          title="Video call"
        >
          <Video size={13} />
        </button>
        <button
          onClick={() => onCall(player.id, player.name, false)}
          className={actionClass}
          title="Audio call"
        >
          <Mic size={13} />
        </button>
        <button onClick={onChat} className={actionClass} title="Room chat">
          <MessageSquare size={13} />
        </button>
        {!player.guest && (
          <button
            onClick={() => onViewProfile(player.id)}
            className={actionClass}
            title="View profile"
          >
            <User size={13} />
          </button>
        )}
      </div>
    </div>
  );
});

export default function ProximityOverlay() {
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();

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
    (playerId: string, name: string, video: boolean) => {
      callManager.invite(playerId, name, video);
    },
    [],
  );

  const handleChat = useCallback(() => {
    window.dispatchEvent(new Event("openChat"));
  }, []);

  const handleViewProfile = useCallback((userId: string) => {
    window.open(`/dashboard?user=${userId}`, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {nearbyPlayers.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          flip={
            viewportWidth > 0 &&
            player.x + GAP + (player.guest ? 148 : 182) >
              viewportWidth - PADDING
          }
          onCall={handleCall}
          onChat={handleChat}
          onViewProfile={handleViewProfile}
        />
      ))}
    </div>
  );
}
