"use client";

import React from "react";
import { Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ui-white border-t-2 border-ui-border py-8 mt-12">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="font-pixel text-2xl text-gray-800">SpatialMeet</div>
          <div className="flex gap-4 font-body text-sm text-gray-500">
            <a href="#" className="hover:text-brand-primary">
              Twitter
            </a>
            <a href="#" className="hover:text-brand-primary">
              GitHub
            </a>
            <a href="#" className="hover:text-brand-primary">
              Privacy
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 font-pixel text-gray-400">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-brand-secondary fill-brand-secondary" />
          <span>in the metaverse</span>
        </div>
      </div>
    </footer>
  );
};
