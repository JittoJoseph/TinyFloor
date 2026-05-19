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
                  Meet the builders shaping SpatialMeet
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
                <span className="hidden sm:inline">Start a Room</span>
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-2xl p-2 w-full lg:w-auto">
                <Link
                  href="/rooms"
                  className="px-6 py-3 rounded-xl font-pixel text-base sm:text-lg text-gray-500 hover:text-gray-700 text-center"
                >
                  Rooms
                </Link>
                <Link
                  href="/people"
                  className="px-6 py-3 rounded-xl font-pixel text-base sm:text-lg bg-white text-gray-900 shadow-sm text-center"
                >
                  People
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <Users className="w-4 h-4 text-gray-400" />
              <span>
                {loading ? "Gathering people..." : `${people.length} people`}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people by name..."
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none transition-colors font-medium"
              />
            </div>
          </div>
        </div>

        {yourCard && (
          <Link
            href={`/dashboard?user=${yourCard.id}`}
            className="block bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-ui-border rounded-2xl p-5 shadow-retro-sm hover:-translate-y-0.5 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-20 bg-white rounded-2xl border-2 border-ui-border flex items-center justify-center">
                  <CharacterPreview
                    characterId={yourCard.characterName}
                    size="sm"
                    showShadow={false}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-pixel text-xl text-gray-900">
                      {yourCard.displayName}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full">
                      You
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">@{yourCard.username}</p>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Your profile card</span>
              </div>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-pixel text-xl text-gray-600">
              Loading people...
            </p>
          </div>
        ) : visiblePeople.length === 0 ? (
          <div className="bg-ui-white/80 backdrop-blur border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-ui-border">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-pixel text-2xl text-gray-800 mb-2">
              No people found
            </h3>
            <p className="text-gray-500">
              Try a different search or check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visiblePeople.map((person) => (
              <Link
                key={person.id}
                href={`/dashboard?user=${person.id}`}
                className="group"
              >
                <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm hover:-translate-y-0.5 hover:shadow-retro transition-all h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 bg-gray-50 rounded-2xl border-2 border-gray-200 flex items-center justify-center">
                      <CharacterPreview
                        characterId={person.characterName || "Adam"}
                        size="sm"
                        showShadow={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-pixel text-lg text-gray-900 truncate">
                        {person.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        @{person.username}
                      </p>
                    </div>
                    {person.isGuest && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200 rounded-full">
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
