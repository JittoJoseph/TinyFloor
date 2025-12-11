"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LogOut, Users, Copy, Check } from "lucide-react";
import ControlBar from "@/components/ControlBar";
import SettingsModal from "@/components/SettingsModal";
import ChatPanel from "@/components/ChatPanel";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-pixel text-2xl">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        Loading virtual office...
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

  const roomId = params.roomId as string;
  const name = searchParams.get("name");
  const character = searchParams.get("character");
  const userId = searchParams.get("userId");

  const [mounted, setMounted] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<
    Array<{ id: string; name: string }>
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
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  // Control bar handlers
  const handleMicToggle = useCallback((enabled: boolean) => {
    // Will be connected to CallManager via custom events
    window.dispatchEvent(new CustomEvent("micToggle", { detail: { enabled } }));
  }, []);

  const handleVideoToggle = useCallback((enabled: boolean) => {
    window.dispatchEvent(
      new CustomEvent("videoToggle", { detail: { enabled } })
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

  // Listen for call state changes and chat events
  useEffect(() => {
    const handleCallStarted = () => setIsInCall(true);
    const handleCallEnded = () => setIsInCall(false);
    const handleOpenChat = () => setShowChat(true);
    const handlePlayerListUpdated = (e: CustomEvent) => {
      // Filter out current user from participants list to avoid duplication
      const allParticipants = e.detail as Array<{ id: string; name: string }>;
      const otherParticipants = allParticipants.filter((p) => p.name !== name);
      setParticipants(otherParticipants);
    };

    window.addEventListener("callStarted", handleCallStarted);
    window.addEventListener("callEnded", handleCallEnded);
    window.addEventListener("openChat", handleOpenChat);
    window.addEventListener(
      "playerListUpdated",
      handlePlayerListUpdated as EventListener
    );

    return () => {
      window.removeEventListener("callStarted", handleCallStarted);
      window.removeEventListener("callEnded", handleCallEnded);
      window.removeEventListener("openChat", handleOpenChat);
      window.removeEventListener(
        "playerListUpdated",
        handlePlayerListUpdated as EventListener
      );
    };
  }, []);

  if (!mounted || !name || !character) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
        {/* Room Info */}
        <div className="bg-white/95 backdrop-blur-sm border-2 border-gray-800 px-4 py-2 rounded-xl shadow-retro pointer-events-auto flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <h1 className="font-pixel text-xl text-gray-900 leading-none">
              {roomData?.name || `Room: ${roomId}`}
            </h1>
            <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
              Connected as {name}
              {roomData?.activeUsers !== undefined && (
                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3" />
                  {roomData.activeUsers}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Copy Invite Link */}
          <button
            onClick={copyInviteLink}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl border-2 border-gray-800 shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all font-pixel text-sm flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Invite
              </>
            )}
          </button>

          {/* Leave Room */}
          <Link
            href="/rooms"
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl border-2 border-gray-800 shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all font-pixel text-sm flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </Link>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="absolute top-20 right-4 z-20 bg-white/95 backdrop-blur-sm border-2 border-gray-800 rounded-xl shadow-retro p-4 w-64">
          <h3 className="font-pixel text-lg text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Participants
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-pixel text-sm">
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
              <div
                key={p.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-pixel text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
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
        userId={userId}
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
        isInCall={isInCall}
        participantCount={roomData?.activeUsers || 0}
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
        playerId={roomId}
        playerName={name}
      />
    </div>
  );
}
