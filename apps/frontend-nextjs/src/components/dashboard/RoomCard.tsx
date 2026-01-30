"use client";

import Link from "next/link";
import {
  Users,
  Lock,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Crown,
} from "lucide-react";

export interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  hasPassword: boolean;
  createdAt: string;
  lastActivityAt: string;
  status: string;
  shareCode?: string;
}

type RoomStatus = "active" | "idle" | "offline";

interface RoomCardProps {
  room: Room;
  isOwned?: boolean;
  onCopy: () => void;
  isCopied: boolean;
}

function getTimeAgo(dateString: string): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
  { label: string; dotClass: string; bgClass: string; textClass: string }
> = {
  active: {
    label: "ACTIVE",
    dotClass: "bg-green-500 animate-pulse",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
  },
  idle: {
    label: "IDLE",
    dotClass: "bg-yellow-500",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
  },
  offline: {
    label: "OFFLINE",
    dotClass: "bg-gray-400",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
  },
};

export function RoomCard({ room, isOwned, onCopy, isCopied }: RoomCardProps) {
  const status = getRoomStatus(room);
  const config = statusConfig[status];

  return (
    <div className="group relative">
      {/* Background Card Effect */}
      <div className="absolute inset-0 bg-ui-border rounded-xl translate-x-1.5 translate-y-1.5 transition-transform group-hover:translate-x-2 group-hover:translate-y-2" />

      {/* Main Card */}
      <div className="relative bg-white border-2 border-ui-border rounded-xl p-5 hover:-translate-y-0.5 transition-transform">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isOwned && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
              <h4 className="font-pixel text-lg text-gray-900 truncate">
                {room.name}
              </h4>
              {room.hasPassword && (
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
          </div>
          <div
            className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${config.bgClass} ${config.textClass}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
            {config.label}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span className="font-medium">{room.playerCount}</span>
            <span className="text-gray-400">/ {room.maxPlayers}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {getTimeAgo(room.lastActivityAt)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/join?roomId=${room.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-primary hover:bg-indigo-600 text-white font-medium text-sm rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Join
          </Link>
          <button
            onClick={onCopy}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
            title="Copy invite link"
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
  const status = getRoomStatus(room);
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-4 p-4 bg-white border-2 border-ui-border rounded-xl hover:border-brand-primary/30 transition-colors">
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
            {room.playerCount}/{room.maxPlayers} players
          </span>
          <span>{getTimeAgo(room.lastActivityAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/join?roomId=${room.id}`}
          className="px-3 py-1.5 bg-brand-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Join
        </Link>
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
          title="Copy link"
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
