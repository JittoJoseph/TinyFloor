"use client";

import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ui-white border-t-2 border-ui-border py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="font-pixel text-xl text-gray-800">SpatialMeet</div>
            <p className="text-xs text-gray-500 font-medium">
              © 2025 SpatialMeet Labs.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-gray-600 font-medium">
            <a
              href="https://github.com/JittoJoseph"
              className="hover:text-indigo-600 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/jittojoseph17/"
              className="hover:text-indigo-600 transition-colors"
            >
              Linkedin
            </a>
            <a href="/" className="hover:text-indigo-600 transition-colors">
              Privacy
            </a>
          </div>

          {/* Tagline */}
          <div className="flex items-center gap-2 font-pixel text-sm text-gray-500">
            <span>Bridging virtual spaces</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
