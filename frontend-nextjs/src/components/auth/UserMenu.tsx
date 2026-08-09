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
        className="cursor-pointer h-10 px-5 flex items-center gap-2 bg-white border border-[rgba(0,0,0,0.06)] rounded-full text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] shadow-sm hover:shadow-md transition-all"
      >
        <User className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const createdRoomsCount = user?.createdRooms?.length || 0;
  const joinedRoomsCount = user?.joinedRooms?.length || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-4 flex items-center gap-2.5 bg-white border border-[rgba(0,0,0,0.06)] rounded-full shadow-sm hover:shadow-md transition-all"
      >
        <div className="w-6 h-6 bg-[rgba(0,0,0,0.04)] rounded-full border border-[rgba(0,0,0,0.05)] flex items-center justify-center">
          <span className="text-[10px] text-[var(--color-braun-text)] font-bold uppercase">
            {user?.displayName?.charAt(0) || "G"}
          </span>
        </div>
        <span className="hidden sm:inline max-w-24 truncate text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
          {user?.displayName || "Guest"}
        </span>
        {isGuest && (
          <span className="text-[9px] font-bold uppercase tracking-widest bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-70 px-2 py-0.5 rounded-full">
            Guest
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-50 transition-transform ${
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
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] shadow-lg z-50 overflow-hidden font-body">
            {/* User info with stats */}
            <div className="p-5 border-b border-[rgba(0,0,0,0.04)]">
              <p className="text-base font-medium text-[var(--color-braun-text)] tracking-tight truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-[var(--color-braun-text)] opacity-50 truncate mb-3">
                @{user?.username}
              </p>
              {/* Mini Stats */}
              {!isGuest && (
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f8f6] border border-[rgba(0,0,0,0.04)] rounded-full text-[10px] uppercase tracking-widest font-bold">
                    <Globe className="w-3 h-3 text-[var(--color-braun-orange)]" />
                    <span className="text-[var(--color-braun-text)]">
                      {createdRoomsCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8f8f6] border border-[rgba(0,0,0,0.04)] rounded-full text-[10px] uppercase tracking-widest font-bold">
                    <Users className="w-3 h-3 text-[var(--color-braun-text)] opacity-60" />
                    <span className="text-[var(--color-braun-text)]">
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(0,0,0,0.02)] transition-colors group"
                >
                  <div className="w-8 h-8 bg-white border border-[rgba(0,0,0,0.05)] rounded-full flex items-center justify-center shadow-sm">
                    <LayoutDashboard className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-70 group-hover:opacity-100" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)]">
                      Dashboard
                    </span>
                    <span className="text-[10px] text-[var(--color-braun-text)] opacity-50">
                      Manage profile
                    </span>
                  </div>
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,78,0,0.04)] transition-colors w-full group"
              >
                <div className="w-8 h-8 bg-white border border-[rgba(0,0,0,0.05)] rounded-full flex items-center justify-center shadow-sm group-hover:border-[rgba(255,78,0,0.2)]">
                  <LogOut className="w-3.5 h-3.5 text-[var(--color-braun-text)] opacity-70 group-hover:text-[var(--color-braun-orange)] group-hover:opacity-100" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] group-hover:text-[var(--color-braun-orange)]">
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
