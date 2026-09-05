import React from "react";
import Link from "next/link";
import { ArrowUpRight, DoorOpen, Plus } from "lucide-react";
import { OfficeScene } from "@/components/OfficeScene";
import { PixelAvatar } from "@/components/PixelAvatar";
import { Reveal } from "./Reveal";

const crowd = [
  { character: "Adam", left: "16%", direction: "right" as const },
  { character: "Amelia", left: "38%", direction: "down" as const },
  { character: "Alex", left: "61%", direction: "down" as const },
  { character: "Bob", left: "82%", direction: "left" as const },
];

const tileClass =
  "group relative flex flex-col h-full overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#f2efe6] p-6 md:p-8 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export const CTA: React.FC = () => {
  return (
    <section
      id="start"
      aria-labelledby="cta-title"
      className="relative w-full overflow-hidden pt-14 md:pt-24"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <Reveal className="max-w-2xl mb-8 md:mb-12">
          <h2
            id="cta-title"
            className="font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight leading-[1.08]"
          >
            Your room is <span className="font-medium">already open.</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Reveal className="h-full">
            <Link href="/room/public-room" className={tileClass}>
              <span className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-[var(--color-braun-orange)] text-white flex items-center justify-center shrink-0">
                  <DoorOpen className="w-5 h-5" />
                </span>
                <span className="font-body text-xl md:text-2xl font-medium text-[var(--color-braun-text)] tracking-tight">
                  Walk into the public office
                </span>
                <ArrowUpRight className="w-5 h-5 ml-auto shrink-0 text-[var(--color-braun-text)] opacity-40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
              </span>
              <span className="font-body text-sm md:text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed mb-6">
                The room that is always on. Pick a character, walk around, and
                say hello to whoever is there.
              </span>
              <OfficeScene
                className="mt-auto aspect-[16/7] rounded-xl border border-black/10"
                focus="46% 62%"
                zoom="auto 400px"
                occupants={[
                  { character: "Alex", left: "36%", top: "82%", width: 28 },
                  {
                    character: "Bob",
                    left: "56%",
                    top: "82%",
                    direction: "left",
                    width: 28,
                  },
                ]}
              />
            </Link>
          </Reveal>

          <Reveal delay={90} className="h-full">
            <Link href="/create-room" className={tileClass}>
              <span className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-[var(--color-braun-text)] text-[#f2efe6] flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </span>
                <span className="font-body text-xl md:text-2xl font-medium text-[var(--color-braun-text)] tracking-tight">
                  Open a room for your team
                </span>
                <ArrowUpRight className="w-5 h-5 ml-auto shrink-0 text-[var(--color-braun-text)] opacity-40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
              </span>
              <span className="font-body text-sm md:text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed mb-6">
                Name it, keep it public or lock it with a password, then send
                one link. It stays open for as long as you want.
              </span>
              <span className="mt-auto flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2">
                <span className="flex-1 min-w-0 rounded-lg bg-[#f0f0eb] px-3 py-2.5 font-body text-[11px] md:text-xs text-[var(--color-braun-text)] opacity-50 truncate">
                  Design team
                </span>
                <span className="rounded-lg bg-[var(--color-braun-text)] px-3 py-2.5 font-body text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#f2efe6] shrink-0">
                  Create
                </span>
              </span>
            </Link>
          </Reveal>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative mt-14 md:mt-20 h-[200px] md:h-[300px]"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/office.png)",
            backgroundSize: "auto 420px",
            backgroundPosition: "50% 79%",
            imageRendering: "pixelated",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-braun-bg)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--color-braun-bg)] to-transparent" />
        {crowd.map((person) => (
          <PixelAvatar
            key={person.character}
            character={person.character}
            direction={person.direction}
            width={30}
            style={{ left: person.left, top: "79%" }}
          />
        ))}
      </div>
    </section>
  );
};
