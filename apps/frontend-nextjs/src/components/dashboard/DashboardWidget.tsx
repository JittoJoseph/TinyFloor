"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, Globe, Users, ChevronRight } from "lucide-react";
import { CharacterPreview } from "./CharacterPreview";

interface DashboardWidgetProps {
  user: {
    displayName: string;
    avatarPreferences?: {
      characterName?: string;
    };
  };
  stats: {
    createdRooms: number;
    joinedRooms: number;
  };
  variant?: "compact" | "full";
}

export function DashboardWidget({
  user,
  stats,
  variant = "compact",
}: DashboardWidgetProps) {
  const characterId = user.avatarPreferences?.characterName || "Adam";

  if (variant === "compact") {
    return (
      <Link
        href="/dashboard"
        className="group flex items-center gap-3 p-3 bg-ui-white hover:bg-gray-50 rounded-xl border-2 border-ui-border shadow-retro-sm hover:-translate-y-0.5 transition-all"
      >
        {/* Mini Character */}
        <div className="w-10 h-12 bg-gradient-to-b from-gray-50 to-white rounded-lg border border-ui-border flex items-center justify-center overflow-hidden shrink-0">
          <CharacterPreview
            characterId={characterId}
            size="sm"
            showShadow={false}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-pixel text-sm text-gray-900 truncate">
            {user.displayName}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-0.5">
              <Globe className="w-3 h-3" />
              {stats.createdRooms}
            </span>
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" />
              {stats.joinedRooms}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-primary transition-colors shrink-0" />
      </Link>
    );
  }

  // Full variant - for sidebars or more prominent placement
  return (
    <Link
      href="/dashboard"
      className="group block bg-ui-white hover:bg-gray-50 rounded-2xl border-2 border-ui-border shadow-retro-sm hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-16 bg-gradient-to-b from-gray-50 to-white rounded-xl border-2 border-ui-border flex items-center justify-center overflow-hidden">
            <CharacterPreview
              characterId={characterId}
              size="sm"
              showShadow={false}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-lg text-gray-900 truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-400">View Dashboard</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-primary transition-colors" />
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
          <Globe className="w-4 h-4 text-indigo-500" />
          <span className="font-pixel text-sm text-indigo-700">
            {stats.createdRooms}
          </span>
          <span className="text-xs text-indigo-500">created</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
          <Users className="w-4 h-4 text-purple-500" />
          <span className="font-pixel text-sm text-purple-700">
            {stats.joinedRooms}
          </span>
          <span className="text-xs text-purple-500">joined</span>
        </div>
      </div>
    </Link>
  );
}
