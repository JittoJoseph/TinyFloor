"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2, Users, Lock, Crown, ChevronRight } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { DirectoryHeader } from "@/components/DirectoryHeader";
import { apiClient } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { useTimeAgo } from "@/lib/i18n/useTimeAgo";
import { joinPath } from "@/lib/links";

interface Room {
  id: string;
  name: string;
  users?: string[];
  playerCount: number;
  maxPlayers?: number;
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
  const t = useTranslations("directory");
  const tc = useTranslations("common");
  const timeAgo = useTimeAgo();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);
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
      pageRef.current = pageToLoad;
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
      pageRef.current = 0;
    } catch (error) {
      console.error("Failed to search rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || loading || !hasMore || isSearching) return;
    loadingRef.current = true;
    fetchRooms(pageRef.current + 1, true).finally(() => {
      loadingRef.current = false;
    });
  }, [loading, hasMore, isSearching]);

  const sentinelRef = useInfiniteScroll(
    !isSearching && hasMore && !loading,
    loadMore,
  );

  return (
    <div className="min-h-screen w-full pt-8 md:pt-20 pb-12 px-4 md:px-8 font-body relative">
      <div className="max-w-5xl mx-auto space-y-8">
        <DirectoryHeader
          active="rooms"
          subtitle={t("roomsSubtitle")}
          ctaLabel={tc("createRoom")}
          count={loading ? t("updating") : t("roomsLive", { count: rooms.length })}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          searchPlaceholder={tc("searchRooms")}
          onSearch={handleSearch}
        />

        {/* Main Content Grid */}
        {loading ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-[var(--color-braun-text)] opacity-50 tracking-widest uppercase font-medium">
              {t("loadingSpaces")}
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="w-full py-24 flex flex-col items-center text-center bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl shadow-sm">
            <Gamepad2
              className="w-8 h-8 text-[var(--color-braun-text)] opacity-20 mb-4"
              strokeWidth={1.5}
            />
            <h3 className="text-xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              {searchQuery ? t("noRoomsFound") : t("noRoomsAvailable")}
            </h3>
            <p className="text-sm text-[var(--color-braun-text)] opacity-50 mb-6 max-w-sm">
              {searchQuery ? t("noRoomsFoundBody") : t("noRoomsAvailableBody")}
            </p>
            <Link
              href="/create-room"
              className="cursor-pointer h-10 px-6 inline-flex items-center justify-center bg-[var(--color-braun-bg)] text-[var(--color-braun-text)] text-xs font-bold uppercase tracking-[0.1em] rounded-full border border-[rgba(0,0,0,0.05)] hover:bg-white hover:shadow-md transition-all"
            >
              {tc("createRoom")}
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
                      !isFull && router.push(joinPath(room.id))
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
                            {t(`presence.${presence}`)}
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
                          {t("lastActive", {
                            time: timeAgo(room.lastActivityAt),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[var(--color-braun-text)] opacity-60">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium" dir="ltr">
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
                        {isFull ? t("full") : t("enter")}
                        {!isFull && <ChevronRight className="w-3 h-3 rtl:rotate-180" />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isSearching && hasMore && (
              <div
                ref={sentinelRef}
                className="flex justify-center items-center h-12"
              >
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin opacity-40" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
