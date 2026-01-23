"use client";

import Link from "next/link";
import { Plus, Search, LogOut, Shield } from "lucide-react";

interface QuickActionsProps {
  onLogout?: () => void;
  isGuest?: boolean;
}

export function QuickActions({ onLogout, isGuest }: QuickActionsProps) {
  return (
    <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-4 shadow-retro-sm h-full flex flex-col">
      <h3 className="font-pixel text-sm text-gray-900 mb-3">Quick Actions</h3>

      <div className="flex flex-col gap-2 flex-1">
        {/* Main Actions */}
        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
          <Link
            href="/create-room"
            className="group flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-indigo-200 shrink-0">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="font-medium text-sm text-gray-900 truncate">
              Create Room
            </span>
          </Link>

          <Link
            href="/rooms"
            className="group flex items-center gap-2 p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white border border-purple-200 shrink-0">
              <Search className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span className="font-medium text-sm text-gray-900 truncate">
              Browse Rooms
            </span>
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Account Action */}
        {isGuest ? (
          <Link
            href="/rooms"
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-green-50 border border-gray-100 hover:border-green-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-50 border border-green-200 shrink-0">
              <Shield className="w-3.5 h-3.5 text-green-600" />
            </div>
            <span className="font-medium text-sm text-gray-900">
              Create Account
            </span>
          </Link>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-red-50 border border-gray-100 hover:border-red-100 transition-colors w-full text-left"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 border border-red-200 shrink-0">
              <LogOut className="w-3.5 h-3.5 text-red-600" />
            </div>
            <span className="font-medium text-sm text-gray-900">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}
