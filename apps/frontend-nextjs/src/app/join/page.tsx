"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Lock, Users, AlertCircle } from "lucide-react";
import { AnimatedCharacterSelector } from "@/components/AnimatedCharacterSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { apiClient } from "@/lib/api";

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  isPublic: boolean;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const shareCode = searchParams.get("code");
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [character, setCharacter] = useState("Adam");
  const [password, setPassword] = useState("");
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill name from user profile
  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
    if (user?.avatarPreferences?.characterName) {
      setCharacter(user.avatarPreferences.characterName);
    }
  }, [user, name]);

  // Fetch room info
  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      setError("");

      try {
        let room;
        if (shareCode) {
          room = await apiClient.getRoomByShareCode(shareCode);
        } else if (roomId) {
          room = await apiClient.getRoom(roomId);
        } else {
          setError("No room specified");
          setLoading(false);
          return;
        }

        setRoomInfo({
          id: room.id,
          name: room.name,
          playerCount: room.playerCount || 0,
          maxPlayers: room.maxPlayers || 20,
          hasPassword: room.hasPassword || false,
          isPublic: room.isPublic ?? true,
        });
      } catch (err) {
        console.error("Failed to fetch room:", err);
        setError("Room not found or no longer available");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, shareCode]);

  const handleJoin = async () => {
    if (!name.trim() || !roomInfo) return;

    setJoining(true);
    setError("");

    try {
      // Check if room is full
      if (roomInfo.playerCount >= roomInfo.maxPlayers) {
        setError("Room is full");
        setJoining(false);
        return;
      }

      // If room requires password, validate first
      if (roomInfo.hasPassword && !password) {
        setError("Password is required for this room");
        setJoining(false);
        return;
      }

      // Try to join via API
      const result = await apiClient.joinRoom(
        roomInfo.id,
        password || undefined,
        name,
      );

      if (!result.success) {
        setError(result.message || "Failed to join room");
        setJoining(false);
        return;
      }

      showToast("Joining room...", "success");

      // Redirect to the room page with params
      router.push(
        `/room/${roomInfo.id}?name=${encodeURIComponent(
          name,
        )}&character=${character}&userId=${result.userId}`,
      );
    } catch (err) {
      console.error("Failed to join room:", err);
      setError(err instanceof Error ? err.message : "Failed to join room");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro text-center">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-pixel text-xl text-gray-600">Loading room...</p>
      </div>
    );
  }

  if (error && !roomInfo) {
    return (
      <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-pixel text-xl mb-4">{error}</p>
        <Link
          href="/rooms"
          className="text-brand-primary hover:underline font-bold"
        >
          Go back to rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro relative">
      <Link
        href="/rooms"
        className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-500" />
      </Link>

      <div className="text-center mb-6 mt-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl border-2 border-indigo-200 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-pixel text-gray-900 mb-2">Join Room</h1>

        {/* Room info */}
        {roomInfo && (
          <div className="flex items-center justify-center gap-3 text-gray-500 text-sm">
            <span className="font-medium">{roomInfo.name}</span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {roomInfo.playerCount}/{roomInfo.maxPlayers}
            </span>
            {roomInfo.hasPassword && (
              <>
                <span className="text-gray-300">•</span>
                <Lock className="w-4 h-4 text-amber-500" />
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block font-pixel text-xl text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-brand-primary outline-none transition-all font-medium text-lg"
            maxLength={30}
            autoFocus={!isAuthenticated}
          />
        </div>

        {/* Password (if required) */}
        {roomInfo?.hasPassword && (
          <div>
            <label className="block font-pixel text-xl text-gray-700 mb-2">
              Room Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-brand-primary outline-none transition-all font-medium"
              />
            </div>
          </div>
        )}

        {/* Character Selection */}
        <div>
          <label className="block font-pixel text-xl text-gray-700 mb-3">
            Choose Character
          </label>
          <AnimatedCharacterSelector
            selectedCharacter={character}
            onSelect={setCharacter}
            variant="grid"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!name.trim() || joining}
          className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {joining ? "Joining..." : "Enter Room"}
        </button>
      </div>

      {/* Speech bubble tail */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45" />
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro text-center">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        }
      >
        <JoinContent />
      </Suspense>
    </div>
  );
}
