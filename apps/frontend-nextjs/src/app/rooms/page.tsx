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
  Globe,
  RefreshCw,
} from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getRooms();
      setRooms(
        data.map((room) => ({
          ...room,
          playerCount: room.playerCount || room.users?.length || 0,
          maxPlayers: 20,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchRooms();
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.searchRooms(searchQuery);
      setRooms(
        data.map((room) => ({
          ...room,
          playerCount: room.playerCount || room.users?.length || 0,
          maxPlayers: 20,
          isPublic: true,
          hasPassword: false,
          status: "ACTIVE",
        }))
      );
    } catch (error) {
      console.error("Failed to search rooms:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-ui-white border-2 border-ui-border rounded-2xl p-6 shadow-retro">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-2 border-transparent hover:border-ui-border"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-pixel text-gray-900 leading-none">
                Virtual Offices
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Join a space to start collaborating
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
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

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search rooms by name..."
              className="w-full pl-12 pr-4 py-3 bg-ui-white border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-3 bg-ui-white border-2 border-gray-200 rounded-xl hover:border-brand-primary transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={fetchRooms}
            className="px-4 py-3 bg-ui-white border-2 border-gray-200 rounded-xl hover:border-brand-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {/* Room List */}
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
              {searchQuery ? "No rooms found" : "No active rooms"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const isFull = room.playerCount >= (room.maxPlayers || 20);
              return (
                <div
                  key={room.id}
                  className={`group bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col gap-4 ${
                    isFull ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                  onClick={() =>
                    !isFull && router.push(`/join?roomId=${room.id}`)
                  }
                >
                  {/* Decorative background circle */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Header with Icon and Status */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl border-4 border-indigo-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-inner">
                      <span className="font-pixel text-3xl text-indigo-600">
                        {room.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {room.hasPassword && (
                        <div
                          className="p-2 bg-amber-100 text-amber-700 rounded-xl border border-amber-200"
                          title="Password Protected"
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1.5 border ${
                          room.playerCount > 0
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            room.playerCount > 0
                              ? "bg-green-500 animate-pulse"
                              : "bg-gray-400"
                          }`}
                        ></div>
                        {room.playerCount > 0 ? "LIVE" : "IDLE"}
                      </div>
                    </div>
                  </div>

                  {/* Room Info */}
                  <div className="relative z-10">
                    <h3 className="font-pixel text-2xl text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors truncate mb-1">
                      {room.name}
                    </h3>
                    {room.lastActivityAt && (
                      <p className="text-gray-400 text-xs font-medium">
                        Active {getTimeAgo(room.lastActivityAt)}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t-2 border-gray-50 relative z-10">
                    <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-bold">
                        {room.playerCount}/{room.maxPlayers || 20}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-indigo-500 bg-indigo-50 px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      {isFull ? "Room Full" : "Join Room →"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
