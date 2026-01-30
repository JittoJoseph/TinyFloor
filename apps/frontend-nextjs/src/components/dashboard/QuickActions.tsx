"use client";

import Link from "next/link";
import { Plus, Search, LogOut, Shield, Sparkles } from "lucide-react";

interface QuickActionsProps {
  onLogout?: () => void;
  isGuest?: boolean;
}

export function QuickActions({ onLogout, isGuest }: QuickActionsProps) {
  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-gray-400" />
        <h3 className="font-pixel text-sm text-gray-900">Quick Actions</h3>
      </div>

      <div className="flex flex-col gap-2 flex-1 justify-center">
        {/* Main Actions - Horizontal on mobile, vertical on desktop masonry */}
        <Link
          href="/create-room"
          className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-blue-200 shrink-0">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-sm text-gray-800">Create Room</span>
        </Link>

        <Link
          href="/rooms"
          className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-emerald-200 shrink-0">
            <Search className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-medium text-sm text-gray-800">
            Browse Rooms
          </span>
        </Link>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-1" />

        {/* Account Action */}
        {isGuest ? (
          <Link
            href="/rooms"
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50 border border-gray-100 hover:border-amber-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200 shrink-0">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <span className="font-medium text-sm text-gray-800">
              Create Account
            </span>
          </Link>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-red-50 border border-gray-100 hover:border-red-100 transition-colors w-full text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 border border-red-200 shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="font-medium text-sm text-gray-800">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
