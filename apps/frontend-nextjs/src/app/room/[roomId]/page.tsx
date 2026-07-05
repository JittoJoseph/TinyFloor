"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LogOut, Users, Copy, Check } from "lucide-react";
import ControlBar from "@/components/ControlBar";
import SettingsModal from "@/components/SettingsModal";
import ChatPanel from "@/components/ChatPanel";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { PlayerStatus } from "@/lib/types";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-braun-bg)] text-[var(--color-braun-text)] font-sans text-sm font-bold tracking-widest uppercase">
      <div className="text-center flex flex-col items-center gap-6">
        <div className="w-10 h-10 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin"></div>
        Connecting...
      </div>
    </div>
  ),
});

interface RoomData {
  name: string;
  activeUsers?: number;
  maxPlayers?: number;
  shareCode?: string;
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const roomId = params.roomId as string;
  const name = searchParams.get("name");
  const character = searchParams.get("character");
  const urlUserId = searchParams.get("userId");
  const [localPlayerId] = useState(() => urlUserId || crypto.randomUUID());

  const [mounted, setMounted] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<PlayerStatus>("available");
  const [participants, setParticipants] = useState<
    Array<{
      id: string;
      name: string;
      username?: string;
      isGuest?: boolean;
      status?: PlayerStatus;
    }>
  >([]);

  // Fetch room details
  useEffect(() => {
    setMounted(true);
    if (!name || !character) {
      router.replace(`/join?roomId=${roomId}`);
    } else {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/${roomId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Room not found");
        })
        .then((data: RoomData) => setRoomData(data))
        .catch((err) => console.error("Failed to fetch room:", err));
    }
  }, [name, character, roomId, router]);

  // Copy invite link
  const copyInviteLink = useCallback(() => {
    const link = `${window.location.origin}/join?roomId=${roomId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomId]);

  // Control bar handlers
  const handleMicToggle = useCallback((enabled: boolean) => {
    // Will be connected to CallManager via custom events
    window.dispatchEvent(new CustomEvent("micToggle", { detail: { enabled } }));
  }, []);

  const handleVideoToggle = useCallback((enabled: boolean) => {
    window.dispatchEvent(
      new CustomEvent("videoToggle", { detail: { enabled } }),
    );
  }, []);

  const handleSettingsClick = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleChatClick = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  const handleParticipantsClick = useCallback(() => {
    setShowParticipants((prev) => !prev);
  }, []);

  const handleLeaveCall = useCallback(() => {
    window.dispatchEvent(new CustomEvent("leaveCall"));
    setIsInCall(false);
  }, []);

  // Handle status change
  const handleStatusChange = useCallback((status: PlayerStatus) => {
    setCurrentStatus(status);
    // Dispatch event to WebSocket manager
    window.dispatchEvent(
      new CustomEvent("statusChange", { detail: { status } }),
    );
  }, []);

  // Listen for call state changes and chat events
  useEffect(() => {
    const handleCallStarted = () => setIsInCall(true);
    const handleCallEnded = () => setIsInCall(false);
    const handleOpenChat = () => setShowChat(true);
    const handlePlayerListUpdated = (e: CustomEvent) => {
      // Filter out current user from participants list to avoid duplication
      const allParticipants = e.detail as Array<{
        id: string;
        name: string;
        username?: string;
        isGuest?: boolean;
      }>;
      const otherParticipants = allParticipants.filter((p) => p.name !== name);
      // If username is not provided, extract it from name (format: "displayName (username)")
      const processedParticipants = otherParticipants.map((p) => {
        if (p.username) return p;
        // Try to extract username from name if it's in format "DisplayName (username)"
        const match = p.name.match(/\(([^)]+)\)$/);
        return {
          ...p,
          username: match ? match[1] : p.name.toLowerCase().replace(/\s+/g, ""),
          isGuest: p.isGuest ?? false,
        };
      });
      setParticipants(processedParticipants);
    };

    window.addEventListener("callStarted", handleCallStarted);
    window.addEventListener("callEnded", handleCallEnded);
    window.addEventListener("openChat", handleOpenChat);
    window.addEventListener(
      "playerListUpdated",
      handlePlayerListUpdated as EventListener,
    );

    return () => {
      window.removeEventListener("callStarted", handleCallStarted);
      window.removeEventListener("callEnded", handleCallEnded);
      window.removeEventListener("openChat", handleOpenChat);
      window.removeEventListener(
        "playerListUpdated",
        handlePlayerListUpdated as EventListener,
      );
    };
  }, []);

  if (!mounted || !name || !character) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-braun-bg)]">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 z-10 pointer-events-none">
        {/* Room Info */}
        <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-sm pointer-events-auto flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-[var(--color-braun-text)] tracking-wide">
              {roomData?.name || `Room: ${roomId}`}
            </h1>
            {roomData?.activeUsers !== undefined && (
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                <Users className="w-3 h-3" />
                {roomData.activeUsers}{" "}
                {roomData.activeUsers === 1 ? "person" : "people"}
              </p>
            )}
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto self-end sm:self-auto">
          {/* Copy Invite Link */}
          <button
            onClick={copyInviteLink}
            className="cursor-pointer bg-white hover:bg-gray-50 text-[var(--color-braun-text)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-[rgba(0,0,0,0.06)] shadow-sm transition-all font-bold uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Invite
              </>
            )}
          </button>

          {/* Leave Room */}
          <Link
            href="/rooms"
            className="cursor-pointer bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm transition-all font-bold uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave
          </Link>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute top-24 right-6 z-20 bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-2xl shadow-md p-5 w-72">
          <h3 className="font-bold text-sm text-[var(--color-braun-text)] mb-4 flex items-center gap-2 tracking-widest uppercase">
            <Users className="w-4 h-4" />
            Participants
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-xl border border-[rgba(0,0,0,0.06)]">
              <div className="w-9 h-9 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-sm">
                {name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {name} (You)
                </p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
            {participants.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (p.id) {
                    window.open(
                      `/dashboard?user=${p.id}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                }}
                disabled={!p.id}
                className="flex items-center gap-3 p-3 hover:bg-white rounded-xl border border-transparent hover:border-[rgba(0,0,0,0.06)] hover:shadow-sm transition-all cursor-pointer w-full text-left disabled:cursor-not-allowed disabled:opacity-50 group"
              >
                <div className="w-9 h-9 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-sm group-hover:bg-white group-hover:border group-hover:border-[rgba(0,0,0,0.06)] transition-all">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    {!p.isGuest && (
                      <svg
                        className="w-3.5 h-3.5 text-blue-500 shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-green-500">Online</p>
                    {p.isGuest && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                        GUEST
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {participants.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                No other participants yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <PhaserGame
        name={name}
        roomId={roomId}
        character={character}
        userId={localPlayerId}
      />

      {/* Proximity Overlay */}
      <ProximityOverlay />

      {/* Call Overlay */}
      <CallOverlay />

      {/* Bottom Control Bar */}
      <ControlBar
        onMicToggle={handleMicToggle}
        onVideoToggle={handleVideoToggle}
        onSettingsClick={handleSettingsClick}
        onChatClick={handleChatClick}
        onParticipantsClick={handleParticipantsClick}
        onLeaveCall={handleLeaveCall}
        onStatusChange={handleStatusChange}
        isInCall={isInCall}
        participantCount={roomData?.activeUsers || 0}
        currentStatus={currentStatus}
        unreadChatCount={unreadChatCount}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        userId={localPlayerId}
        userName={name}
        onUnreadChange={setUnreadChatCount}
      />
    </div>
  );
}
