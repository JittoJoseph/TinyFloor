"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Users,
  Plus,
  Loader2,
  LayoutGrid,
  List,
  Filter,
  Search,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Room, RoomCard, RoomCardCompact } from "./RoomCard";

type ViewMode = "grid" | "list";
type TabType = "created" | "joined";
type FilterStatus = "all" | "active" | "idle" | "offline";

interface RoomSectionProps {
  createdRooms: Room[];
  joinedRooms: Room[];
  isLoading: boolean;
  onCopyLink: (room: Room) => void;
  copiedRoomId: string | null;
}

export function RoomSection({
  createdRooms,
  joinedRooms,
  isLoading,
  onCopyLink,
  copiedRoomId,
}: RoomSectionProps) {
  const t = useTranslations("dashboard.rooms");
  const tc = useTranslations("common");
  const [activeTab, setActiveTab] = useState<TabType>("created");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const currentRooms = activeTab === "created" ? createdRooms : joinedRooms;

  // Filter rooms
  const filteredRooms = currentRooms.filter((room) => {
    // Search filter
    if (
      searchQuery &&
      !room.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (filterStatus === "all") return true;

    if (filterStatus === "active" && room.playerCount > 0) return true;

    const lastActivity = new Date(room.lastActivityAt);
    const now = new Date();
    const diffHours =
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (filterStatus === "idle" && room.playerCount === 0 && diffHours < 24)
      return true;
    if (filterStatus === "offline" && room.playerCount === 0 && diffHours >= 24)
      return true;

    return false;
  });

  // Count active rooms
  const activeCount = currentRooms.filter((r) => r.playerCount > 0).length;

  return (
    <section className="space-y-4">
      {/* Section Header with Tabs */}
      <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-2xl p-4 shadow-retro-sm">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("created")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "created"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Globe className="w-4 h-4" />
              {t("mine")}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "created"
                    ? "bg-[var(--color-braun-text)]/10 text-[var(--color-braun-text)]"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {createdRooms.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("joined")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === "joined"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4" />
              {t("joined")}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "joined"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {joinedRooms.length}
              </span>
            </button>
          </div>

          {/* View Toggle & Create Button */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title={t("gridView")}
                aria-label={t("gridView")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title={t("listView")}
                aria-label={t("listView")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Link
              href="/create-room"
              className="cursor-pointer flex items-center gap-1.5 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white font-medium text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("newRoom")}</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={tc("searchRooms")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-[rgba(0,0,0,0.06)] rounded-xl focus:border-[var(--color-braun-text)] outline-none text-sm transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(["all", "active", "idle", "offline"] as FilterStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filterStatus === status
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t(`filter.${status}`)}
                    {status === "active" && activeCount > 0 && (
                      <span className="ms-1 w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Content */}
      {isLoading ? (
        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-12 text-center shadow-retro-sm">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">{t("loading")}</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          type={activeTab}
          hasRooms={currentRooms.length > 0}
          searchQuery={searchQuery}
          filterStatus={filterStatus}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isOwned={activeTab === "created"}
              onCopy={() => onCopyLink(room)}
              isCopied={copiedRoomId === room.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRooms.map((room) => (
            <RoomCardCompact
              key={room.id}
              room={room}
              isOwned={activeTab === "created"}
              onCopy={() => onCopyLink(room)}
              isCopied={copiedRoomId === room.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Empty State Component
function EmptyState({
  type,
  hasRooms,
  searchQuery,
  filterStatus,
}: {
  type: TabType;
  hasRooms: boolean;
  searchQuery: string;
  filterStatus: FilterStatus;
}) {
  const t = useTranslations("dashboard.rooms");
  const tc = useTranslations("common");

  // No results from search/filter
  if (hasRooms && (searchQuery || filterStatus !== "all")) {
    return (
      <div className="bg-white border border-[rgba(0,0,0,0.06)] border-dashed rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-[rgba(0,0,0,0.06)]">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl text-gray-800 mb-2">{t("noMatches")}</h3>
        <p className="text-gray-500">{t("noMatchesBody")}</p>
      </div>
    );
  }

  // No rooms at all
  if (type === "created") {
    return (
      <div className="bg-white border border-[rgba(0,0,0,0.06)] border-dashed rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[var(--color-braun-text)]/20">
          <Globe className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-xl text-gray-800 mb-2">{t("noRooms")}</h3>
        <p className="text-gray-500 mb-4">{t("noRoomsBody")}</p>
        <Link
          href="/create-room"
          className="cursor-pointer inline-flex items-center gap-2 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {tc("createRoom")}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.06)] border-dashed rounded-2xl p-12 text-center">
      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-100">
        <Users className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="text-xl text-gray-800 mb-2">{t("noJoined")}</h3>
      <p className="text-gray-500 mb-4">{t("noJoinedBody")}</p>
      <Link
        href="/rooms"
        className="cursor-pointer inline-flex items-center gap-2 text-[var(--color-braun-text)] font-bold hover:underline"
      >
        {t("browsePublic")}
      </Link>
    </div>
  );
}
