"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Room, RoomCard, RoomCardCompact } from "./RoomCard";

type ViewMode = "grid" | "list";
type TabType = "created" | "joined";
type FilterStatus = "all" | "active" | "idle" | "offline";

interface RoomSectionProps {
  createdRooms: Room[];
  joinedRooms: Room[];
  isLoading: boolean;
  onCopyLink: (room: Room) => void;
  onDeleteRoom: (roomId: string) => void;
  copiedRoomId: string | null;
  deletingRoomId: string | null;
}

export function RoomSection({
  createdRooms,
  joinedRooms,
  isLoading,
  onCopyLink,
  onDeleteRoom,
  copiedRoomId,
  deletingRoomId,
}: RoomSectionProps) {
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
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm">
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
              My Rooms
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "created"
                    ? "bg-indigo-100 text-indigo-700"
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
              Joined
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "joined"
                    ? "bg-purple-100 text-purple-700"
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
                title="Grid view"
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
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Link
              href="/create-room"
              className="flex items-center gap-1.5 bg-brand-primary hover:bg-indigo-600 text-white font-medium text-sm px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Room</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none text-sm transition-colors"
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
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      filterStatus === status
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {status}
                    {status === "active" && activeCount > 0 && (
                      <span className="ml-1 w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
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
        <div className="bg-white border-2 border-ui-border rounded-2xl p-12 text-center shadow-retro-sm">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading rooms...</p>
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
              onDelete={
                activeTab === "created"
                  ? () => onDeleteRoom(room.id)
                  : undefined
              }
              isCopied={copiedRoomId === room.id}
              isDeleting={deletingRoomId === room.id}
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
              onDelete={
                activeTab === "created"
                  ? () => onDeleteRoom(room.id)
                  : undefined
              }
              isCopied={copiedRoomId === room.id}
              isDeleting={deletingRoomId === room.id}
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
  // No results from search/filter
  if (hasRooms && (searchQuery || filterStatus !== "all")) {
    return (
      <div className="bg-white border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-200">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-pixel text-xl text-gray-800 mb-2">
          No matches found
        </h3>
        <p className="text-gray-500">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  // No rooms at all
  if (type === "created") {
    return (
      <div className="bg-white border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-100">
          <Globe className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="font-pixel text-xl text-gray-800 mb-2">No rooms yet</h3>
        <p className="text-gray-500 mb-4">
          Create your first virtual office space
        </p>
        <Link
          href="/create-room"
          className="inline-flex items-center gap-2 bg-brand-primary hover:bg-indigo-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create a room
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-100">
        <Users className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="font-pixel text-xl text-gray-800 mb-2">No joined rooms</h3>
      <p className="text-gray-500 mb-4">Join a room to see it here</p>
      <Link
        href="/rooms"
        className="inline-flex items-center gap-2 text-brand-primary font-bold hover:underline"
      >
        Browse public rooms
      </Link>
    </div>
  );
}
