"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  Users,
  Lock,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Crown,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";

export interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  createdAt: string;
  lastActivityAt: string;
  status: string;
}

type RoomStatus = "active" | "idle" | "offline";

interface RoomCardProps {
  room: Room;
  isOwned?: boolean;
  onCopy: () => void;
  isCopied: boolean;
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

function useTimeAgo() {
  const t = useTranslations("dashboard.roomCard");
  const tDirectory = useTranslations("directory");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60000 });

  return (dateString: string): string => {
    if (!dateString) return t("unknown");
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) return tDirectory("justNow");
    if (diffMs < WEEK) return format.relativeTime(date, now);
    return format.dateTime(date);
  };
}

function getRoomStatus(room: Room): RoomStatus {
  if (room.playerCount > 0) return "active";

  const lastActivity = new Date(room.lastActivityAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) return "idle";
  return "offline";
}

const statusConfig: Record<
  RoomStatus,
  { dotClass: string; bgClass: string; textClass: string }
> = {
  active: {
    dotClass: "bg-green-500 animate-pulse",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
  },
  idle: {
    dotClass: "bg-yellow-500",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
  },
  offline: {
    dotClass: "bg-gray-400",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
  },
};

export function RoomCard({ room, isOwned, onCopy, isCopied }: RoomCardProps) {
  const t = useTranslations("dashboard.roomCard");
  const timeAgo = useTimeAgo();
  const status = getRoomStatus(room);
  const config = statusConfig[status];

  return (
    <div className="group relative">
      {/* Background Card Effect */}
      <div className="absolute inset-0 bg-[#e8e8e3] rounded-xl translate-x-1.5 translate-y-1.5 transition-transform group-hover:translate-x-2 group-hover:translate-y-2" />

      {/* Main Card */}
      <div className="relative bg-white border border-[rgba(0,0,0,0.06)] rounded-xl p-5 hover:-translate-y-0.5 transition-transform">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isOwned && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
              <h4 className="text-lg text-gray-900 truncate">{room.name}</h4>
              {room.hasPassword && (
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
          </div>
          <div
            className={`px-2 py-1 text-xs font-bold uppercase rounded-full flex items-center gap-1.5 ${config.bgClass} ${config.textClass}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            {t(`status.${status}`)}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5" dir="ltr">
            <Users className="w-4 h-4" />
            <span className="font-medium">{room.playerCount}</span>
            <span className="text-gray-400">/ {room.maxPlayers}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {timeAgo(room.lastActivityAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/join?roomId=${room.id}`}
            className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] font-bold uppercase tracking-widest text-xs rounded-full shadow-sm transition-all hover:-translate-y-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("join")}
          </Link>
          <button
            onClick={onCopy}
            className="cursor-pointer p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
            title={t("copyInvite")}
            aria-label={t("copyInvite")}
          >
            {isCopied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for lists
export function RoomCardCompact({
  room,
  isOwned,
  onCopy,
  isCopied,
}: RoomCardProps) {
  const t = useTranslations("dashboard.roomCard");
  const timeAgo = useTimeAgo();
  const status = getRoomStatus(room);
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-[rgba(0,0,0,0.06)] rounded-xl hover:border-[var(--color-braun-text)]/30 transition-colors">
      {/* Status Indicator */}
      <div className={`w-3 h-3 rounded-full ${config.dotClass} shrink-0`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isOwned && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
          <h4 className="font-medium text-gray-900 truncate">{room.name}</h4>
          {room.hasPassword && (
            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
          <span>
            {t("players", { count: room.playerCount, max: room.maxPlayers })}
          </span>
          <span>{timeAgo(room.lastActivityAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/join?roomId=${room.id}`}
          className="cursor-pointer px-3 py-1.5 bg-white hover:bg-gray-50 border border-[rgba(0,0,0,0.06)] shadow-sm text-[var(--color-braun-text)] text-[10px] font-bold uppercase tracking-widest rounded-full transition-all hover:-translate-y-0.5"
        >
          {t("join")}
        </Link>
        <button
          onClick={onCopy}
          className="cursor-pointer p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
          title={t("copyLink")}
          aria-label={t("copyLink")}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
