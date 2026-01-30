"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
  ProfileCard,
  RoomSection,
  QuickActions,
  ActivityFeed,
  RecentCollaborators,
  StatsCard,
  type Room,
  type Collaborator,
} from "@/components/dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    updateUser,
    logout,
  } = useAuth();
  const { showToast } = useToast();

  const [createdRooms, setCreatedRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/rooms");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch rooms with error handling
  const fetchRooms = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingRooms(true);
    try {
      // Fetch created rooms first
      const created = await apiClient.getMyRooms().catch(() => []);
      setCreatedRooms(created);

      // Try to fetch joined rooms, but don't fail if it errors
      try {
        const joined = await apiClient.getJoinedRooms();
        const createdIds = new Set(created.map((r) => r.id));
        setJoinedRooms(joined.filter((r) => !createdIds.has(r.id)));
      } catch {
        setJoinedRooms([]);
      }

      // Fetch dashboard summary for collaborators
      try {
        const summary = await apiClient.getDashboardSummary();
        setCollaborators(summary.recentCollaborators || []);
      } catch {
        setCollaborators([]);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoadingRooms(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handler functions
  const handleUpdateDisplayName = async (name: string) => {
    try {
      const updated = await apiClient.updateProfile(name);
      updateUser(updated);
      showToast("Display name updated!", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast("Failed to update profile", "error");
      throw error;
    }
  };

  const handleUpdateCharacter = async (characterId: string) => {
    try {
      const updated = await apiClient.updateAvatar({
        characterName: characterId,
      });
      updateUser(updated);
      showToast("Character updated!", "success");
    } catch (error) {
      console.error("Failed to update character:", error);
      showToast("Failed to update character", "error");
      throw error;
    }
  };

  const handleCopyLink = (room: Room) => {
    const link = room.shareCode
      ? `${window.location.origin}/join?code=${room.shareCode}`
      : `${window.location.origin}/join?roomId=${room.id}`;
    navigator.clipboard.writeText(link);
    setCopiedRoomId(room.id);
    showToast("Link copied!", "success");
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    setDeletingRoomId(roomId);
    try {
      await apiClient.deleteRoom(roomId);
      setCreatedRooms((prev) => prev.filter((r) => r.id !== roomId));
      showToast("Room deleted", "success");
    } catch (error) {
      console.error("Failed to delete room:", error);
      showToast("Failed to delete room", "error");
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/rooms");
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-pixel text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full p-4 md:p-6 lg:p-8 font-sans bg-gray-50/50">
      {/* Centered Container - max-w-4xl for compact feel */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="p-2 bg-white hover:bg-gray-50 rounded-xl border-2 border-ui-border shadow-retro-sm hover:-translate-y-0.5 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-pixel text-gray-900">
                Dashboard
              </h1>
              <p className="text-gray-500 text-sm hidden sm:block">
                Manage your profile & rooms
              </p>
            </div>
          </div>
          {/* Quick stat badges */}
          <div className="hidden sm:flex items-center gap-2">
            {createdRooms.filter((r) => r.playerCount > 0).length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700">
                  {createdRooms.filter((r) => r.playerCount > 0).length} active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Masonry Grid - Using CSS Grid for better packing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
          {/* Profile Card - Spans 2 columns on large screens */}
          <div className="md:col-span-2 lg:col-span-2">
            <ProfileCard
              user={user}
              createdRoomsCount={createdRooms.length}
              joinedRoomsCount={joinedRooms.length}
              onUpdateDisplayName={handleUpdateDisplayName}
              onUpdateCharacter={handleUpdateCharacter}
            />
          </div>

          {/* Stats Card - Single column */}
          <div className="md:col-span-1">
            <StatsCard
              totalRooms={createdRooms.length + joinedRooms.length}
              activeRooms={
                [...createdRooms, ...joinedRooms].filter(
                  (r) => r.playerCount > 0,
                ).length
              }
              totalCollaborators={collaborators.length}
            />
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-1">
            <QuickActions onLogout={handleLogout} isGuest={user.isGuest} />
          </div>

          {/* Activity Feed */}
          <div className="md:col-span-1">
            <ActivityFeed
              createdRooms={createdRooms}
              joinedRooms={joinedRooms}
            />
          </div>

          {/* Recent Collaborators */}
          <div className="md:col-span-1">
            <RecentCollaborators
              collaborators={collaborators}
              isLoading={loadingRooms}
            />
          </div>
        </div>

        {/* Rooms Section - Full Width Below Masonry */}
        <div className="mt-4">
          <RoomSection
            createdRooms={createdRooms}
            joinedRooms={joinedRooms}
            isLoading={loadingRooms}
            onCopyLink={handleCopyLink}
            onDeleteRoom={handleDeleteRoom}
            copiedRoomId={copiedRoomId}
            deletingRoomId={deletingRoomId}
          />
        </div>
      </div>
    </div>
  );
}
