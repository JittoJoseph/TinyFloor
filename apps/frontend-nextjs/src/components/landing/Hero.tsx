import React from "react";
import { ArrowRight } from "lucide-react";
import { HeroOfficeScene } from "./HeroOfficeScene";
import Link from "next/link";

export const Hero: React.FC = () => {
  return (
    <section className="flex flex-col items-center">
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
            <Link
              href="/dashboard"
              className="bg-white hover:bg-gray-50 text-gray-800 font-pixel text-xl px-8 py-3 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all cursor-pointer"
            >
              Dashboard
            </Link>
          </div>

          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45"></div>
        </div>
      </div>

      <div className="w-full max-w-4xl relative z-10 mx-auto">
        <div className="bg-game-dark p-2 rounded-2xl border-2 border-ui-border shadow-retro-lg">
          <div className="bg-gray-800 rounded-t-xl p-2 flex items-center gap-2 mb-2">
            <div className="flex gap-1.5 ml-2">
              <div className="w-3 h-3 rounded-full bg-red-400 cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 cursor-pointer"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 cursor-pointer"></div>
            </div>
            <div className="flex-1 bg-gray-900 h-6 rounded mx-4 flex items-center px-3">
              <Link
                href="https://spatialmeet-app.vercel.app/room/public-room"
                className="text-gray-500 font-pixel text-xs"
              >
                spatialmeet-app.vercel.app/room/public-room
              </Link>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-lg overflow-hidden border border-gray-700">
            <HeroOfficeScene />
          </div>
        </div>
      </div>
    </section>
  );
};
