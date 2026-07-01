import React from "react";
import { HeroOfficeScene } from "./HeroOfficeScene";
import Link from "next/link";

export const Hero: React.FC = () => {
  return (
    <section className="relative w-full pt-8 md:pt-12 pb-8 md:pb-12 px-4 md:px-8 max-w-6xl mx-auto flex flex-col items-center">
      <div className="w-full max-w-4xl text-center flex flex-col items-center mb-12 md:mb-16 z-20">
        <h1 className="font-body font-light text-5xl md:text-[5.5rem] text-[var(--color-braun-text)] tracking-tight leading-[1.05] mb-6">
          The <span className="font-medium">coziest</span> place to <br />
          work online.
        </h1>

        <p className="font-body text-[var(--color-braun-text)] opacity-60 text-base md:text-xl mb-10 leading-relaxed max-w-2xl px-2">
          A virtual office that looks like a game. Walk around, talk to
          coworkers, and feel like a team again.
        </p>

        <Link
          href="/rooms"
          className="group relative flex items-center justify-center w-40 md:w-48 h-14 md:h-16 bg-[var(--color-braun-bg)] rounded-full shadow-[var(--shadow-braun-raised)] active:shadow-[var(--shadow-braun-pressed)] transition-all cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
        >
          <div className="w-[92%] h-[82%] rounded-full bg-[var(--color-braun-orange)] shadow-[inset_-1px_-1px_2px_rgba(0,0,0,0.15),inset_1px_1px_3px_rgba(255,255,255,0.4)] flex items-center justify-center text-white font-body font-medium uppercase tracking-widest text-xs md:text-sm group-hover:brightness-110 group-active:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4)] transition-all duration-300">
            Try It
          </div>
        </Link>
      </div>

      <div className="w-[calc(100%+2rem)] -mx-4 md:w-full md:mx-auto relative z-10 group px-2 md:px-0">
        <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-2 md:p-3 shadow-2xl border border-[rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between gap-2 md:gap-4 px-2 py-1 mb-1">
            <div className="flex gap-1.5 shrink-0 w-[50px] md:w-[70px]">
              <div className="w-3 h-3 rounded-full bg-[#ed6a5e] border border-[rgba(0,0,0,0.1)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#f4bf4f] border border-[rgba(0,0,0,0.1)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#61c554] border border-[rgba(0,0,0,0.1)]"></div>
            </div>

            <Link
              href="/room/public-room"
              className="flex-1 h-5 md:h-6 rounded md:rounded-md bg-[#f0f0eb] transition-colors border border-[rgba(0,0,0,0.06)] flex items-center justify-center px-4 overflow-hidden max-w-xl"
            >
              <span className="font-body text-[11px] md:text-xs font-medium text-[var(--color-braun-text)] opacity-50 tracking-wide truncate">
                spatialmeet-app.vercel.app/room/public-room
              </span>
            </Link>

            <div className="w-[50px] md:w-[70px] shrink-0"></div>
          </div>

          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-lg md:rounded-xl overflow-hidden bg-[var(--color-braun-bg)] border border-[rgba(0,0,0,0.08)]">
            <div className="absolute inset-0 pointer-events-auto">
              <HeroOfficeScene />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
