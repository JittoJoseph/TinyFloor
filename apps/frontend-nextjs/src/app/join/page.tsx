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

  // Pre-fill name and character from user profile or localStorage
  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    } else if (!isAuthenticated && !name) {
      // For non-authenticated users, check localStorage
      const savedName = localStorage.getItem("guestDisplayName");
      if (savedName) {
        setName(savedName);
      }
    }

    if (user?.avatarPreferences?.characterName && character === "Adam") {
      setCharacter(user.avatarPreferences.characterName);
    } else if (!isAuthenticated && character === "Adam") {
      // For non-authenticated users, check localStorage
      const savedCharacter = localStorage.getItem("guestCharacter");
      if (savedCharacter) {
        setCharacter(savedCharacter);
      }
    }
  }, [user, name, isAuthenticated]); // Removed 'character' from dependencies

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

      // Save user preferences
      if (isAuthenticated && !user?.isGuest) {
        try {
          // Update registered user's profile
          await apiClient.updateProfile(name, { characterName: character });
        } catch (err) {
          console.warn("Failed to update user profile:", err);
          // Continue anyway - don't block joining
        }
      } else {
        // Save guest preferences to localStorage
        localStorage.setItem("guestDisplayName", name);
        localStorage.setItem("guestCharacter", character);
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
      <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm text-center">
        <div className="w-8 h-8 border-[3px] border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-50">
          Loading space...
        </p>
      </div>
    );
  }

  if (error && !roomInfo) {
    return (
      <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm text-center">
        <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[rgba(0,0,0,0.04)]">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-[var(--color-braun-text)] text-sm mb-6">{error}</p>
        <Link
          href="/rooms"
          className="cursor-pointer inline-block text-[var(--color-braun-text)] hover:text-[var(--color-braun-orange)] font-bold uppercase tracking-widest text-xs transition-colors"
        >
          Go back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm relative">
      <Link
        href="/rooms"
        className="cursor-pointer absolute top-6 left-6 w-10 h-10 flex items-center justify-center hover:bg-[#fbfbf9] border border-transparent hover:border-[rgba(0,0,0,0.04)] rounded-full transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-[var(--color-braun-text)] opacity-50" />
      </Link>

      <div className="text-center mb-10 mt-2">
        <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-6 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
          <User className="w-6 h-6 text-[var(--color-braun-orange)]" />
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--color-braun-text)] mb-2">
          Join Space
        </h1>

        {/* Room info */}
        {roomInfo && (
          <div className="flex items-center justify-center gap-3 text-[var(--color-braun-text)] opacity-50 text-[10px] font-bold uppercase tracking-widest">
            <span>{roomInfo.name}</span>
            <span className="w-1 h-1 rounded-full bg-[rgba(0,0,0,0.2)]" />
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {roomInfo.playerCount}/{roomInfo.maxPlayers}
            </span>
            {roomInfo.hasPassword && (
              <>
                <span className="w-1 h-1 rounded-full bg-[rgba(0,0,0,0.2)]" />
                <Lock className="w-3 h-3 text-[var(--color-braun-text)]" />
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full h-14 px-5 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl focus:border-[var(--color-braun-text)] outline-none transition-colors text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
            maxLength={30}
            autoFocus={!isAuthenticated}
          />
        </div>

        {/* Password (if required) */}
        {roomInfo?.hasPassword && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
              Space Password
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-12 pr-4 h-14 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl focus:border-[var(--color-braun-text)] outline-none transition-colors text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              />
            </div>
          </div>
        )}

        {/* Character Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
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
          <div className="bg-[#fbfbf9] text-[var(--color-braun-text)] p-4 rounded-xl text-xs font-medium border border-[rgba(0,0,0,0.06)] flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleJoin}
            disabled={!name.trim() || joining}
            className="cursor-pointer w-full h-14 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full shadow-sm transition-colors disabled:opacity-50 disabled:hover:bg-[var(--color-braun-text)]"
          >
            {joining ? "Joining..." : "Enter Space"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans bg-[var(--color-braun-bg)]">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm text-center">
            <div className="w-8 h-8 border-[3px] border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        }
      >
        <JoinContent />
      </Suspense>
    </div>
  );
}
