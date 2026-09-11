"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { jukebox, TRACKS } from "@/lib/JukeboxManager";

const control =
  "cursor-pointer w-11 h-11 rounded-full bg-white border border-black/8 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#f7f7f4] active:translate-y-0 motion-reduce:transition-none";

export default function JukeboxPanel() {
  const t = useTranslations("jukebox");
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
          <span className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-braun-text)] opacity-45 me-auto">
            {t("title")}
          </span>
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => jukebox.setOpen(false)}
            className="cursor-pointer w-8 h-8 -me-1 rounded-full flex items-center justify-center text-[var(--color-braun-text)] opacity-45 hover:opacity-100 transition-opacity duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="font-body text-lg font-medium text-[var(--color-braun-text)] leading-tight truncate">
          {state.blocked ? t("tapToPlay") : state.title}
        </p>
        <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 mt-0.5">
          {state.playing ? t("playing") : t("paused")}
        </p>
        {state.credit ? (
          <p className="font-body text-[11px] text-[var(--color-braun-text)] opacity-35 mt-1 truncate">
            {state.credit}
          </p>
        ) : null}

        <div className="flex items-center justify-center gap-3 mt-4" dir="ltr">
          <button
            type="button"
            aria-label={t("previous")}
            onClick={() => jukebox.skip(-1)}
            className={control}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label={state.playing ? t("pause") : t("play")}
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
            aria-label={t("next")}
            onClick={() => jukebox.skip(1)}
            className={control}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-4">
          {TRACKS.map((entry, index) => (
            <button
              key={entry.src}
              type="button"
              aria-label={t("playTrack", { track: entry.short })}
              aria-current={index === state.track}
              onClick={() => jukebox.select(index)}
              className={`cursor-pointer h-9 rounded-lg px-2 font-body text-[11px] font-medium truncate transition-colors duration-[120ms] ${
                index === state.track
                  ? "bg-[var(--color-braun-text)] text-[var(--color-braun-bg)]"
                  : "bg-black/[0.04] text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:bg-black/[0.07]"
              }`}
            >
              {entry.short}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
