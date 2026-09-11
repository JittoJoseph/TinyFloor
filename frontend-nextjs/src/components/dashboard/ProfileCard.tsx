"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Edit3,
  Check,
  X,
  Loader2,
  Globe,
  Users,
  Calendar,
  Share2,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { CharacterPreview } from "./CharacterPreview";
import {
  AnimatedCharacterSelector,
  CHARACTERS,
} from "@/components/AnimatedCharacterSelector";
import { profilePath, shareUrl } from "@/lib/links";

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
  onUpdateDisplayName?: (name: string) => Promise<void>;
  onUpdateCharacter?: (characterId: string) => Promise<void>;
  readOnly?: boolean;
}

export function ProfileCard({
  user,
  createdRoomsCount,
  joinedRoomsCount,
  onUpdateDisplayName,
  onUpdateCharacter,
  readOnly = false,
}: ProfileCardProps) {
  const t = useTranslations("dashboard.profile");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user.displayName);
  const [editCharacter, setEditCharacter] = useState(
    user.avatarPreferences?.characterName || "Adam",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = shareUrl(profilePath(user.id));

  const currentCharacter =
    CHARACTERS.find(
      (c) => c.id === (user.avatarPreferences?.characterName || "Adam"),
    ) || CHARACTERS[0];

  const handleSaveDisplayName = async () => {
    if (!editDisplayName.trim() || !onUpdateDisplayName) return;

    setIsSaving(true);
    try {
      await onUpdateDisplayName(editDisplayName.trim());
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCharacter = async () => {
    if (!onUpdateCharacter) return;

    setIsSaving(true);
    try {
      await onUpdateCharacter(editCharacter);
      setIsEditingCharacter(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return tc("unknown");
    return format.dateTime(new Date(dateString), {
      month: "short",
      year: "numeric",
    });
  };

  const handleCopyProfileLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareTitle", { name: user.displayName }),
          text: t("shareText", { name: user.displayName }),
          url: profileUrl,
        });
      } catch {
        // User cancelled or share failed
        handleCopyProfileLink();
      }
    } else {
      handleCopyProfileLink();
    }
  };

  return (
    <>
      {/* Profile Card - Horizontal Layout */}
      <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-2xl shadow-retro overflow-hidden h-full">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Character */}
            <div className="relative shrink-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-[#e8e8e3] rounded-2xl translate-x-1.5 translate-y-1.5" />
                <div className="relative w-24 h-32 bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center pb-5">
                  <CharacterPreview
                    characterId={
                      user.avatarPreferences?.characterName || "Adam"
                    }
                    size="lg"
                  />
                </div>
                {!readOnly && (
                  <button
                    onClick={() => setIsEditingCharacter(true)}
                    className="absolute -bottom-1 -end-1 p-1.5 bg-white rounded-lg border border-[rgba(0,0,0,0.06)] shadow-sm hover:bg-gray-50 transition-all"
                    title={t("changeCharacter")}
                    aria-label={t("changeCharacter")}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                )}
              </div>
              <p className="text-center mt-2 text-xs text-gray-500">
                {currentCharacter.name}
              </p>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-start w-full">
              {/* Display Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-[rgba(0,0,0,0.06)] rounded-xl focus:border-[var(--color-braun-text)] outline-none font-medium transition-colors min-w-0"
                    placeholder={t("displayName")}
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSaving || !editDisplayName.trim()}
                    aria-label={t("saveName")}
                    className="cursor-pointer p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors disabled:opacity-50 shrink-0"
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
                    aria-label={tc("cancel")}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl text-gray-900 truncate">
                    {user.displayName}
                  </h2>
                  {!readOnly && !user.isGuest && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      aria-label={t("editName")}
                      className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {user.isGuest && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full border border-yellow-200 shrink-0">
                      {t("guestBadge")}
                    </span>
                  )}
                  <div className="flex items-center gap-1 ms-auto">
                    <button
                      onClick={handleCopyProfileLink}
                      className="cursor-pointer p-1.5 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-lg transition-colors shrink-0"
                      title={t("copyLink")}
                      aria-label={t("copyLink")}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <LinkIcon className="cursor-pointer w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleShareProfile}
                      className="cursor-pointer p-1.5 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-lg transition-colors shrink-0"
                      title={t("share")}
                      aria-label={t("share")}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <p className="text-gray-400 text-sm mt-0.5" dir="ltr">
                @{user.username}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md border border-blue-100">
                  <Globe className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-700">
                    {createdRoomsCount}
                  </span>
                  <span className="text-blue-500 text-[10px]">
                    {t("created")}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">
                  <Users className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-emerald-700">
                    {joinedRoomsCount}
                  </span>
                  <span className="text-emerald-500 text-[10px]">
                    {t("joined")}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-md border border-amber-100">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-600 text-[10px]">
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
          <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-2xl shadow-retro-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setEditCharacter(
                  user.avatarPreferences?.characterName || "Adam",
                );
                setIsEditingCharacter(false);
              }}
              aria-label={tc("close")}
              className="absolute top-4 end-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl border border-[rgba(0,0,0,0.06)] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-gray-600" />
              </div>
              <h3 className="text-2xl text-gray-900">{t("chooseCharacter")}</h3>
              <p className="text-gray-500 text-sm mt-1">{t("selectAvatar")}</p>
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
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-[rgba(0,0,0,0.06)] transition-colors"
              >
                {tc("cancel")}
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={isSaving}
                className="cursor-pointer flex-1 px-4 py-3 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white rounded-xl border border-[rgba(0,0,0,0.06)] shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  tc("save")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
