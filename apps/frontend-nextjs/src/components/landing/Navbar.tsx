"use client";

import React, { useState } from "react";
import { Menu, X, Gamepad2 } from "lucide-react";
import Link from "next/link";

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-ui-white border-2 border-ui-border rounded-2xl shadow-retro flex justify-between items-center px-4 py-3 md:px-6 md:py-3">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-brand-primary rounded-lg border-2 border-ui-border flex items-center justify-center">
              <Gamepad2 className="text-white w-5 h-5" />
            </div>
            <span className="font-pixel text-2xl tracking-wide text-gray-800 mt-1">
              SpatialMeet
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="font-pixel text-lg hover:text-brand-primary hover:underline decoration-2 underline-offset-4"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="font-pixel text-lg hover:text-brand-primary hover:underline decoration-2 underline-offset-4"
            >
              How it Works
            </a>
            <Link
              href="/join"
              className="bg-brand-secondary hover:bg-rose-500 text-white font-pixel text-lg px-4 py-1.5 rounded-lg border-2 border-ui-border shadow-retro-sm active:translate-y-0.5 active:shadow-none transition-all"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-ui-border hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="mt-3 bg-ui-white border-2 border-ui-border rounded-xl shadow-retro p-4 flex flex-col gap-4 md:hidden pointer-events-auto animate-float">
            <a
              href="#features"
              onClick={() => setIsOpen(false)}
              className="font-pixel text-xl p-2 hover:bg-gray-100 rounded"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsOpen(false)}
              className="font-pixel text-xl p-2 hover:bg-gray-100 rounded"
            >
              How it Works
            </a>
            <Link
              href="/rooms"
              className="w-full bg-brand-primary text-white font-pixel text-xl py-3 rounded-lg border-2 border-ui-border shadow-retro-sm text-center"
            >
              Launch App
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
