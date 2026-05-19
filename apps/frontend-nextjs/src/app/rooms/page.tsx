"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  Users,
  Plus,
  ArrowLeft,
  Search,
  Lock,
  Crown,
  ChevronRight,
} from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { apiClient } from "@/lib/api";

interface Room {
  id: string;
  name: string;
  users?: string[];
  playerCount: number;
  maxPlayers?: number;
  isPublic: boolean;
  hasPassword: boolean;
  status: string;
  lastActivityAt?: string;
}

type Presence = "ONLINE" | "IDLE" | "OFFLINE";

const SYSTEM_LOBBY_ID = "public-room";

const normalizeRooms = (data: Room[]) =>
  data.map((room) => ({
    ...room,
    playerCount: room.playerCount || room.users?.length || 0,
    maxPlayers: room.maxPlayers || 20,
  }));

const getPresence = (room: Room): Presence => {
  if (room.id === SYSTEM_LOBBY_ID) return "ONLINE";
  if (room.status === "ACTIVE") return "ONLINE";
  if (room.status === "INACTIVE") return "IDLE";
  return "OFFLINE";
};

const getPresenceClasses = (presence: Presence) => {
  if (presence === "ONLINE") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (presence === "IDLE") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const pageSize = 6;

  useEffect(() => {
    fetchRooms(0, false);
  }, []);

  const fetchRooms = async (pageToLoad = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await apiClient.getRooms(pageToLoad, pageSize);
      const normalized = normalizeRooms(data);
      setRooms((prev) => (append ? [...prev, ...normalized] : normalized));
      setPage(pageToLoad);
      setHasMore(normalized.length === pageSize);
      if (!append) {
        setIsSearching(false);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchRooms(0, false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.searchRooms(searchQuery);
      setRooms(normalizeRooms(data));
      setIsSearching(true);
      setHasMore(false);
      setPage(0);
    } catch (error) {
      console.error("Failed to search rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const nextPage = page + 1;
    await fetchRooms(nextPage, true);
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-white via-white to-indigo-50/60 border-2 border-ui-border rounded-3xl p-6 shadow-retro">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link
                href="/"
                className="p-2 bg-white/80 hover:bg-white rounded-xl transition-colors border-2 border-ui-border shadow-retro-sm"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl md:text-4xl font-pixel text-gray-900 leading-none">
                    Community Directory
                  </h1>
                </div>
                <p className="text-gray-500 font-medium mt-1">
                  Browse rooms or meet the people inside
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <UserMenu onLoginClick={() => setShowAuthModal(true)} />
              <Link
                href="/create-room"
                className="bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-lg md:text-xl px-4 md:px-6 py-3 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Room</span>
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="w-full lg:max-w-2xl">
              <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-2 w-full">
                <Link
                  href="/rooms"
                  className="px-8 py-4 rounded-xl font-pixel text-base sm:text-lg md:text-xl bg-white text-gray-900 shadow-sm text-center"
                >
                  Rooms
                </Link>
                <Link
                  href="/people"
                  className="px-8 py-4 rounded-xl font-pixel text-base sm:text-lg md:text-xl text-gray-500 hover:text-gray-700 text-center"
                >
                  People
                </Link>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-400 text-center lg:text-left">
                Explore both tabs to discover spaces and people.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Users className="w-4 h-4 text-gray-400" />
              <span>
                {loading ? "Updating..." : `${rooms.length} rooms live`}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search rooms by name..."
                className="w-full pl-12 pr-14 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
                title="Search"
              >
                <Search className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-pixel text-xl text-gray-600">
              Loading spaces...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-ui-white/80 backdrop-blur border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-ui-border">
              <Gamepad2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-pixel text-2xl text-gray-800 mb-2">
              {searchQuery ? "No rooms found" : "No rooms available"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Be the first to start a new workspace!"}
            </p>
            <Link
              href="/create-room"
              className="inline-flex items-center gap-2 text-brand-primary font-bold hover:underline"
            >
              Create a room now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
              const isSystemLobby = room.id === SYSTEM_LOBBY_ID;
              const isFull = room.playerCount >= (room.maxPlayers || 20);
              const presence = getPresence(room);

              return (
                <div
                  key={room.id}
                  className={`group rounded-2xl border-2 p-6 min-h-[250px] flex flex-col transition-all duration-200 ${
                    isSystemLobby
                      ? "bg-ui-white border-brand-primary/25 shadow-retro-sm"
                      : "bg-ui-white border-gray-200 shadow-retro-sm"
                  } ${isFull ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:-translate-y-1 hover:shadow-retro"}`}
                  onClick={() =>
                    !isFull && router.push(`/join?roomId=${room.id}`)
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center ${
                          isSystemLobby
                            ? "bg-blue-50 text-brand-primary"
                            : "bg-indigo-50 text-blue-700"
                        }`}
                      >
                        {isSystemLobby ? (
                          <Crown className="w-5 h-5" />
                        ) : (
                          <span className="font-pixel text-xl">
                            {room.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {room.hasPassword && (
                        <div
                          className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-200"
                          title="Password Protected"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border flex items-center gap-1.5 ${getPresenceClasses(
                          presence,
                        )}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            presence === "ONLINE"
                              ? "bg-emerald-500 animate-pulse"
                              : presence === "IDLE"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                          }`}
                        />
                        {presence}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-pixel text-2xl text-gray-900 leading-tight truncate">
                      {room.name}
                    </h3>
                    {room.lastActivityAt && (
                      <p className="text-gray-500 text-sm font-medium mt-1">
                        Last active {getTimeAgo(room.lastActivityAt)}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-5 border-t border-gray-200 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {room.playerCount}/{room.maxPlayers || 20}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        isFull
                          ? "text-gray-500 bg-gray-100"
                          : "text-brand-primary bg-brand-primary/10 group-hover:bg-brand-primary/20"
                      }`}
                    >
                      {isFull ? "Room Full" : "Join"}
                      {!isFull && <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
            {!isSearching && hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-ui-white border-2 border-ui-border rounded-xl shadow-retro-sm hover:-translate-y-0.5 hover:shadow-retro transition-all font-pixel text-lg text-gray-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading more..." : "Show more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
