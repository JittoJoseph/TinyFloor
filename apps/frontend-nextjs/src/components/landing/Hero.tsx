import React from "react";
import { ArrowRight } from "lucide-react";
import { PixelMapDemo } from "./PixelMapDemo";
import Link from "next/link";

export const Hero: React.FC = () => {
  return (
    <section className="flex flex-col items-center">
      {/* 1. The Hook (Text Bubble) */}
      <div className="relative w-full max-w-2xl mb-8 z-20">
        <div className="bg-ui-white border-2 border-ui-border rounded-2xl p-6 md:p-10 shadow-retro text-center relative">
          <h1 className="text-4xl md:text-6xl font-pixel text-gray-900 leading-[0.9] mb-4">
            The <span className="text-brand-primary">coziest</span> place to
            work online.
          </h1>

          <p className="font-body text-gray-600 text-lg md:text-xl leading-relaxed mb-8 max-w-lg mx-auto">
            A virtual office that looks like a game. Walk around, talk to
            coworkers, and feel like a team again.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/rooms"
              className="bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl px-8 py-3 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Try It <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="bg-white hover:bg-gray-50 text-gray-800 font-pixel text-xl px-8 py-3 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all cursor-pointer">
              Watch Video
            </button>
          </div>

          {/* Speech Bubble Tail */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45"></div>
        </div>
      </div>

      {/* 2. The Visual (Game Window) */}
      <div className="w-full max-w-4xl relative z-10 mx-auto">
        <div className="bg-game-dark p-2 rounded-2xl border-2 border-ui-border shadow-retro-lg">
          {/* Mock Browser Bar */}
          <div className="bg-gray-800 rounded-t-xl p-2 flex items-center gap-2 mb-2">
            <div className="flex gap-1.5 ml-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="flex-1 bg-gray-900 h-6 rounded mx-4 flex items-center px-3">
              <span className="text-gray-500 font-pixel text-xs">
                spatialmeet.com/office/lobby
              </span>
            </div>
          </div>

          {/* Map Viewport */}
          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-game-bg rounded-lg overflow-hidden border border-gray-700">
            <PixelMapDemo />

            {/* Overlay UI: Mute Button */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <div className="w-10 h-10 bg-gray-900/80 backdrop-blur rounded-full border border-gray-600 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer">
                <span className="text-xs">🎙️</span>
              </div>
              <div className="w-10 h-10 bg-gray-900/80 backdrop-blur rounded-full border border-gray-600 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer">
                <span className="text-xs">📹</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decoration Elements floating around */}
        <div className="absolute -right-4 -bottom-8 w-24 h-24 hidden md:block animate-bounce-slight">
          {/* Simple CSS Plant */}
          <div className="relative w-full h-full">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-10 bg-amber-700 rounded-lg border-2 border-ui-border"></div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-4 h-16 bg-green-700"></div>
            <div className="absolute bottom-12 left-1/4 w-12 h-12 bg-green-500 rounded-full border-2 border-green-800"></div>
            <div className="absolute bottom-16 right-1/4 w-10 h-10 bg-green-500 rounded-full border-2 border-green-800"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
