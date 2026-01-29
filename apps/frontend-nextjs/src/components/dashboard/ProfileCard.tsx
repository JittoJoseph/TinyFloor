"use client";

import { useState } from "react";
import {
  Edit3,
  Check,
  X,
  Loader2,
  Globe,
  Users,
  Calendar,
  Sparkles,
} from "lucide-react";
import { CharacterPreview } from "./CharacterPreview";
import {
  AnimatedCharacterSelector,
  CHARACTERS,
} from "@/components/AnimatedCharacterSelector";

interface User {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  isGuest?: boolean;
  avatarPreferences?: {
    characterName?: string;
  };
  createdAt: string;
}

interface ProfileCardProps {
  user: User;
  createdRoomsCount: number;
  joinedRoomsCount: number;
  onUpdateDisplayName: (name: string) => Promise<void>;
  onUpdateCharacter: (characterId: string) => Promise<void>;
}

export function ProfileCard({
  user,
  createdRoomsCount,
  joinedRoomsCount,
  onUpdateDisplayName,
  onUpdateCharacter,
}: ProfileCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user.displayName);
  const [editCharacter, setEditCharacter] = useState(
    user.avatarPreferences?.characterName || "Adam",
  );
  const [isSaving, setIsSaving] = useState(false);

  const currentCharacter =
    CHARACTERS.find(
      (c) => c.id === (user.avatarPreferences?.characterName || "Adam"),
    ) || CHARACTERS[0];

  const handleSaveDisplayName = async () => {
    if (!editDisplayName.trim()) return;

    setIsSaving(true);
    try {
      await onUpdateDisplayName(editDisplayName.trim());
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCharacter = async () => {
    setIsSaving(true);
    try {
      await onUpdateCharacter(editCharacter);
      setIsEditingCharacter(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Profile Card - Horizontal Layout */}
      <div className="bg-ui-white border-2 border-ui-border rounded-2xl shadow-retro overflow-hidden h-full">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Character */}
            <div className="relative shrink-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-ui-border rounded-2xl translate-x-2 translate-y-2" />
                <div className="relative w-28 h-36 bg-gradient-to-b from-gray-50 to-white rounded-2xl border-2 border-ui-border flex items-center justify-center">
                  <CharacterPreview
                    characterId={
                      user.avatarPreferences?.characterName || "Adam"
                    }
                    size="lg"
                  />
                </div>
                <button
                  onClick={() => setIsEditingCharacter(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-lg border-2 border-ui-border shadow-sm hover:bg-gray-50 transition-all"
                  title="Change character"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
              <p className="text-center mt-2 font-pixel text-xs text-gray-500">
                {currentCharacter.name}
              </p>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              {/* Display Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-brand-primary outline-none font-medium transition-colors min-w-0"
                    placeholder="Display name"
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSaving || !editDisplayName.trim()}
                    className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditDisplayName(user.displayName);
                      setIsEditingName(false);
                    }}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-pixel text-gray-900 truncate">
                    {user.displayName}
                  </h2>
                  {!user.isGuest && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {user.isGuest && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200 shrink-0">
                      GUEST
                    </span>
                  )}
                </div>
              )}

              <p className="text-gray-400 text-sm mt-0.5">@{user.username}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 rounded-lg">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-pixel text-xs text-indigo-700">
                    {createdRoomsCount}
                  </span>
                  <span className="text-indigo-500 text-[10px]">created</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 rounded-lg">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span className="font-pixel text-xs text-purple-700">
                    {joinedRoomsCount}
                  </span>
                  <span className="text-purple-500 text-[10px]">joined</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-500 text-[10px]">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Character Selection Modal */}
      {isEditingCharacter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ui-white border-2 border-ui-border rounded-2xl shadow-retro-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setEditCharacter(
                  user.avatarPreferences?.characterName || "Adam",
                );
                setIsEditingCharacter(false);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl border-2 border-purple-200 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-pixel text-2xl text-gray-900">
                Choose Character
              </h3>
              <p className="text-gray-500 text-sm mt-1">Select your avatar</p>
            </div>

            <AnimatedCharacterSelector
              selectedCharacter={editCharacter}
              onSelect={setEditCharacter}
              variant="grid"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditCharacter(
                    user.avatarPreferences?.characterName || "Adam",
                  );
                  setIsEditingCharacter(false);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-pixel rounded-xl border-2 border-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-brand-primary hover:bg-indigo-600 text-white font-pixel rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
