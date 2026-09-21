"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { jukebox, TRACKS } from "@/lib/JukeboxManager";

const control =
  "cursor-pointer w-11 h-11 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-foreground transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-muted active:translate-y-0 motion-reduce:transition-none";

export default function JukeboxPanel() {
  const t = useTranslations("jukebox");
  const state = useSyncExternalStore(
    jukebox.subscribe,
    jukebox.getSnapshot,
    jukebox.getServerSnapshot,
  );

  if (!state.open) return null;

  return (
    <div className="absolute z-[55] inset-x-3 bottom-24 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[22rem] sm:bottom-28">
      <div className="entry-rise rounded-[1.25rem] bg-card/97 backdrop-blur-sm border border-border shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center text-foreground shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-foreground opacity-55 me-auto">
            {t("title")}
          </span>
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => jukebox.setOpen(false)}
            className="cursor-pointer w-8 h-8 -me-1 rounded-full flex items-center justify-center text-foreground opacity-45 hover:opacity-100 transition-opacity duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-lg font-medium text-foreground leading-tight truncate">
          {state.blocked ? t("tapToPlay") : state.title}
        </p>
        <p className="text-[12px] text-foreground opacity-45 mt-0.5">
          {state.playing ? t("playing") : t("paused")}
        </p>
        {/* The line is always there, empty for tracks that need no credit, so
            switching to one that does never moves the controls. */}
        <p
          aria-hidden={!state.credit}
          className="text-[11px] leading-4 h-4 text-foreground opacity-35 mt-1 truncate"
        >
          {state.credit}
        </p>

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
            className="cursor-pointer w-14 h-14 rounded-full bg-brand text-white shadow-md flex items-center justify-center transition-[transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 motion-reduce:transition-none"
          >
            {state.playing ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ms-0.5" />
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
              className={`cursor-pointer h-9 rounded-lg px-2 text-[11px] font-medium truncate transition-colors duration-[120ms] ${
                index === state.track
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground opacity-60 hover:opacity-100 hover:bg-muted"
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
