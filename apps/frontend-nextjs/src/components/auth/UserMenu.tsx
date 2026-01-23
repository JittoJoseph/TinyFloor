"use client";

import React from "react";
import { User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
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
          <div className="absolute right-0 top-full mt-2 w-56 bg-ui-white rounded-xl border-2 border-ui-border shadow-retro-lg z-50 overflow-hidden">
            {/* User info */}
            <div className="p-4 border-b border-gray-100">
              <p className="font-pixel text-lg text-gray-900 truncate">
                {user?.displayName}
              </p>
              <p className="text-sm text-gray-500 truncate">
                @{user?.username}
              </p>
            </div>

            {/* Menu items */}
            <div className="p-2">
              {!isGuest && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
