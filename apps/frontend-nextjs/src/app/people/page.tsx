"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Sparkles, Users } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { CharacterPreview } from "@/components/dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

export default function PeoplePage() {
  const { user, isAuthenticated } = useAuth();
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPeople = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getPublicUsers();
        setPeople(data);
      } catch (error) {
        console.error("Failed to fetch people:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeople();
  }, []);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(
      (person) =>
        person.displayName.toLowerCase().includes(query) ||
        person.username.toLowerCase().includes(query),
    );
  }, [people, searchQuery]);

  const yourCard =
    isAuthenticated && user
      ? {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          characterName: user.avatarPreferences?.characterName || "Adam",
          isGuest: user.isGuest,
        }
      : null;

  const visiblePeople = filteredPeople.filter(
    (person) => person.id !== yourCard?.id,
  );

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
                <span className="hidden sm:inline">Start a Room</span>
              </Link>
            </div>
          </div>

          {/* Page Title */}
          <div>
            <h1 className="text-3xl md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              Community <span className="font-medium">Directory</span>
            </h1>
            <p className="text-[var(--color-braun-text)] opacity-50 text-sm md:text-base">
              Meet the builders shaping SpatialMeet
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
                className="cursor-pointer flex-1 text-center py-2.5 md:px-10 rounded-full text-sm font-medium text-[var(--color-braun-text)] opacity-50 hover:opacity-100 transition-all"
              >
                Rooms
              </Link>
              <Link
                href="/people"
                className="cursor-pointer flex-1 text-center py-2.5 md:px-10 rounded-full text-sm font-medium bg-white text-[var(--color-braun-text)] shadow-sm transition-all"
              >
                People
              </Link>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-braun-text)] opacity-40 uppercase tracking-widest">
              <Users className="w-3.5 h-3.5" />
              <span>
                {loading ? "Gathering people..." : `${people.length} people`}
              </span>
            </div>
          </div>

          <div className="w-full md:w-72 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-10 h-10 md:h-11 bg-white border border-[rgba(0,0,0,0.08)] shadow-sm rounded-full text-sm text-[var(--color-braun-text)] focus:border-[var(--color-braun-text)] outline-none transition-all placeholder:text-[var(--color-braun-text)] placeholder:opacity-30"
            />
          </div>
        </div>

        {yourCard && (
          <Link
            href={`/dashboard?user=${yourCard.id}`}
            className="cursor-pointer block w-full"
          >
            <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-braun-orange)]"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-20 bg-white border border-[rgba(0,0,0,0.05)] rounded-2xl flex items-center justify-center">
                    <CharacterPreview
                      characterId={yourCard.characterName}
                      size="sm"
                      showShadow={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-medium text-[var(--color-braun-text)] tracking-tight">
                        {yourCard.displayName}
                      </h2>
                      <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[rgba(255,78,0,0.08)] text-[var(--color-braun-orange)] rounded-full border border-[rgba(255,78,0,0.1)]">
                        You
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-braun-text)] opacity-50">
                      @{yourCard.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[var(--color-braun-text)] opacity-40 group-hover:opacity-70 transition-opacity">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Your Profile</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="text-center py-32 flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-[var(--color-braun-text)] opacity-50 tracking-widest uppercase font-medium">
              Loading people
            </p>
          </div>
        ) : visiblePeople.length === 0 ? (
          <div className="w-full py-24 flex flex-col items-center text-center bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl shadow-sm">
            <Users
              className="w-8 h-8 text-[var(--color-braun-text)] opacity-20 mb-4"
              strokeWidth={1.5}
            />
            <h3 className="text-xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              No people found.
            </h3>
            <p className="text-sm text-[var(--color-braun-text)] opacity-50 mb-6 max-w-sm">
              Try a different search or check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePeople.map((person) => (
              <Link
                key={person.id}
                href={`/dashboard?user=${person.id}`}
                className="cursor-pointer group"
              >
                <div className="bg-white border border-[rgba(0,0,0,0.05)] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-full flex items-center gap-4">
                  <div className="w-14 h-16 bg-[#f8f8f6] border border-[rgba(0,0,0,0.04)] rounded-2xl flex items-center justify-center shrink-0">
                    <CharacterPreview
                      characterId={person.characterName || "Adam"}
                      size="sm"
                      showShadow={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <p className="text-base font-medium text-[var(--color-braun-text)] tracking-tight truncate mb-0.5">
                      {person.displayName}
                    </p>
                    <p className="text-xs text-[var(--color-braun-text)] opacity-50 truncate">
                      @{person.username}
                    </p>
                    {person.isGuest && (
                      <span className="self-start mt-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-70 rounded-full">
                        Guest
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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
