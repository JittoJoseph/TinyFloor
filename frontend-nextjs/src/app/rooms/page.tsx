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
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = await apiClient.getRooms(pageToLoad, pageSize);
      const normalized = normalizeRooms(data);
      setRooms((prev) => (append ? [...prev, ...normalized] : normalized));
      setPage(pageToLoad);
      setHasMore(normalized.length === pageSize);
      if (!append) setIsSearching(false);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
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
    await fetchRooms(page + 1, true);
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
    <div className="min-h-screen w-full pt-8 md:pt-20 pb-12 px-4 md:px-8 font-body relative">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Minimal Header */}
        <div className="flex flex-col gap-4 md:gap-8">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="cursor-pointer flex items-center justify-center h-10 px-4 sm:px-5 bg-white border border-[rgba(0,0,0,0.06)] rounded-full text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] shadow-sm hover:shadow-md transition-all gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-4">
              <UserMenu onLoginClick={() => setShowAuthModal(true)} />
              <Link
                href="/create-room"
                className="cursor-pointer flex items-center justify-center gap-2 h-10 px-5 sm:px-6 bg-[var(--color-braun-orange)] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#3d3d3d] transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Create Room</span>
              </Link>
            </div>
          </div>

          {/* Page Title */}
          <div>
            <h1 className="text-3xl md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              Community <span className="font-medium">Directory</span>
            </h1>
            <p className="text-[var(--color-braun-text)] opacity-50 text-sm md:text-base">
              Browse rooms or meet the people inside
            </p>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4 border-t border-[rgba(0,0,0,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Minimal Segmented Control */}
            <div className="flex w-full md:inline-flex md:w-auto items-center bg-[#e0e0da] p-1.5 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
              <Link
                href="/rooms"
                className="cursor-pointer flex-1 text-center py-2.5 md:px-10 rounded-full text-sm font-medium bg-white text-[var(--color-braun-text)] shadow-sm transition-all"
              >
                Rooms
              </Link>
              <Link
                href="/people"
                className="cursor-pointer flex-1 text-center py-2.5 md:px-10 rounded-full text-sm font-medium text-[var(--color-braun-text)] opacity-50 hover:opacity-100 transition-all"
              >
                People
              </Link>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-braun-text)] opacity-40 uppercase tracking-widest">
              <Users className="w-3.5 h-3.5" />
              <span>
                {loading ? "Updating..." : `${rooms.length} rooms live`}
              </span>
            </div>
          </div>

          <div className="w-full md:w-72 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search rooms..."
              className="w-full pl-10 pr-10 h-10 md:h-11 bg-white border border-[rgba(0,0,0,0.08)] shadow-sm rounded-full text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-all placeholder:text-[var(--color-braun-text)] placeholder:opacity-30"
            />
            <button
              onClick={handleSearch}
              className="cursor-pointer absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-60" />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        {loading ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-[var(--color-braun-text)] opacity-50 tracking-widest uppercase font-medium">
              Loading spaces
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="w-full py-24 flex flex-col items-center text-center bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl shadow-sm">
            <Gamepad2
              className="w-8 h-8 text-[var(--color-braun-text)] opacity-20 mb-4"
              strokeWidth={1.5}
            />
            <h3 className="text-xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              {searchQuery ? "No rooms found." : "No rooms available."}
            </h3>
            <p className="text-sm text-[var(--color-braun-text)] opacity-50 mb-6 max-w-sm">
              {searchQuery
                ? "We couldn't find any rooms matching your search. Try adjusting your query."
                : "It's quiet here. Be the first to start a new workspace!"}
            </p>
            <Link
              href="/create-room"
              className="cursor-pointer h-10 px-6 inline-flex items-center justify-center bg-[var(--color-braun-bg)] text-[var(--color-braun-text)] text-xs font-bold uppercase tracking-[0.1em] rounded-full border border-[rgba(0,0,0,0.05)] hover:bg-white hover:shadow-md transition-all"
            >
              Create a room
            </Link>
          </div>
        ) : (
          <div className="space-y-8 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {rooms.map((room) => {
                const isSystemLobby = room.id === SYSTEM_LOBBY_ID;
                const isFull = room.playerCount >= (room.maxPlayers || 20);
                const presence = getPresence(room);

                return (
                  <div
                    key={room.id}
                    onClick={() =>
                      !isFull && router.push(`/join?roomId=${room.id}`)
                    }
                    className={`group flex flex-col justify-between h-[220px] p-6 rounded-3xl transition-all duration-300 relative overflow-hidden ${
                      isSystemLobby
                        ? "bg-white border border-[var(--color-braun-orange)] border-opacity-20 shadow-sm hover:shadow-md"
                        : "bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    } ${isFull ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                            isSystemLobby
                              ? "bg-[rgba(255,78,0,0.05)] border-[rgba(255,78,0,0.1)] text-[var(--color-braun-orange)]"
                              : "bg-white border-[rgba(0,0,0,0.05)] text-[var(--color-braun-text)]"
                          }`}
                        >
                          {isSystemLobby ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-medium opacity-80 uppercase">
                              {room.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {room.hasPassword && (
                          <div className="w-6 h-6 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center text-[var(--color-braun-text)] opacity-60">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-white border border-[rgba(0,0,0,0.05)] px-2.5 py-1 rounded-full shadow-sm">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              presence === "ONLINE"
                                ? "bg-[var(--color-braun-orange)]"
                                : presence === "IDLE"
                                  ? "bg-[var(--color-braun-text)] opacity-40"
                                  : "bg-transparent border border-[rgba(0,0,0,0.2)]"
                            }`}
                          />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70">
                            {presence}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex-1">
                      <h3 className="text-xl font-medium text-[var(--color-braun-text)] tracking-tight truncate">
                        {room.name}
                      </h3>
                      {room.lastActivityAt && (
                        <p className="text-[13px] text-[var(--color-braun-text)] opacity-60 mt-1">
                          Active {getTimeAgo(room.lastActivityAt)}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[var(--color-braun-text)] opacity-60">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">
                          {room.playerCount} / {room.maxPlayers || 20}
                        </span>
                      </div>

                      <span
                        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                          isFull
                            ? "text-[var(--color-braun-text)] opacity-30"
                            : "text-[var(--color-braun-text)] opacity-60 group-hover:text-[var(--color-braun-orange)] group-hover:opacity-100"
                        }`}
                      >
                        {isFull ? "Full" : "Enter"}
                        {!isFull && <ChevronRight className="w-3 h-3" />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isSearching && hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="h-10 px-6 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.06)] rounded-full text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:bg-[#fbfbf9] shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "Loading..." : "Show More"}
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
