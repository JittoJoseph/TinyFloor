"use client";

import { useSyncExternalStore } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { jukebox, TRACKS } from "@/lib/JukeboxManager";

const control =
  "cursor-pointer w-11 h-11 rounded-full bg-white border border-black/8 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#f7f7f4] active:translate-y-0 motion-reduce:transition-none";

export default function JukeboxPanel() {
  const state = useSyncExternalStore(
    jukebox.subscribe,
    jukebox.getSnapshot,
    jukebox.getServerSnapshot,
  );

  if (!state.open) return null;

  return (
    <div className="fixed z-[55] inset-x-3 bottom-24 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[22rem] sm:bottom-28">
      <div className="entry-rise rounded-[1.25rem] bg-[#fbfbf9]/97 backdrop-blur-sm border border-black/8 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
          </span>
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-braun-text)] opacity-45 mr-auto">
            Room speaker
          </span>
          <button
            type="button"
            aria-label="Close the speaker controls"
            onClick={() => jukebox.setOpen(false)}
            className="cursor-pointer w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-[var(--color-braun-text)] opacity-45 hover:opacity-100 transition-opacity duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="font-body text-lg font-medium text-[var(--color-braun-text)] leading-tight truncate">
          {state.blocked ? "Tap play to hear it" : state.title}
        </p>
        <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 mt-0.5">
          {state.playing
            ? "Playing for everyone in the room"
            : "Paused for everyone in the room"}
        </p>

        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            aria-label="Previous track"
            onClick={() => jukebox.skip(-1)}
            className={control}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label={state.playing ? "Pause" : "Play"}
            onClick={() => jukebox.toggle()}
            className="cursor-pointer w-14 h-14 rounded-full bg-[var(--color-braun-orange)] text-white shadow-md flex items-center justify-center transition-[transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 motion-reduce:transition-none"
          >
            {state.playing ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next track"
            onClick={() => jukebox.skip(1)}
            className={control}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1.5 mt-4">
          {TRACKS.map((entry, index) => (
            <button
              key={entry.src}
              type="button"
              aria-label={`Play ${entry.title}`}
              aria-current={index === state.track}
              onClick={() => jukebox.select(index)}
              className={`cursor-pointer flex-1 h-9 rounded-lg px-2 font-body text-[11px] font-medium truncate transition-colors duration-[120ms] ${
                index === state.track
                  ? "bg-[var(--color-braun-text)] text-[var(--color-braun-bg)]"
                  : "bg-black/[0.04] text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:bg-black/[0.07]"
              }`}
            >
              {entry.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
