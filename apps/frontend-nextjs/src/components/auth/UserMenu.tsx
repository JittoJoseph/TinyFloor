"use client";

import React from "react";
import {
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Globe,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface UserMenuProps {
  onLoginClick: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onLoginClick }) => {
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isAuthenticated) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 bg-ui-white hover:bg-gray-50 text-gray-800 font-pixel text-lg px-4 py-2 rounded-xl border-2 border-ui-border shadow-retro-sm hover:-translate-y-0.5 hover:shadow-retro transition-all"
      >
        <User className="w-4 h-4" />
        Sign In
      </button>
    );
  }

  const createdRoomsCount = user?.createdRooms?.length || 0;
  const joinedRoomsCount = user?.joinedRooms?.length || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-ui-white hover:bg-gray-50 text-gray-800 font-pixel text-lg px-4 py-2 rounded-xl border-2 border-ui-border shadow-retro-sm hover:-translate-y-0.5 hover:shadow-retro transition-all"
      >
        <div className="w-8 h-8 bg-brand-primary/10 rounded-lg border border-brand-primary/20 flex items-center justify-center">
          <span className="text-brand-primary font-bold">
            {user?.displayName?.charAt(0).toUpperCase() || "G"}
          </span>
        </div>
        <span className="hidden sm:inline max-w-24 truncate">
          {user?.displayName || "Guest"}
        </span>
        {isGuest && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">
            Guest
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-ui-white rounded-xl border-2 border-ui-border shadow-retro-lg z-50 overflow-hidden">
            {/* User info with stats */}
            <div className="p-4 border-b border-gray-100">
              <p className="font-pixel text-lg text-gray-900 truncate">
                {user?.displayName}
              </p>
              <p className="text-sm text-gray-500 truncate mb-2">
                @{user?.username}
              </p>
              {/* Mini Stats */}
              {!isGuest && (
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded text-xs">
                    <Globe className="w-3 h-3 text-indigo-500" />
                    <span className="font-medium text-indigo-700">
                      {createdRoomsCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs">
                    <Users className="w-3 h-3 text-purple-500" />
                    <span className="font-medium text-purple-700">
                      {joinedRoomsCount}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div className="p-2">
              {!isGuest && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 transition-colors group"
                >
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="font-medium block">Dashboard</span>
                    <span className="text-xs text-gray-400">
                      Manage rooms & profile
                    </span>
                  </div>
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors w-full group"
              >
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
