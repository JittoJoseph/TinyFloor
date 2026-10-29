"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { VOICE_PEAKS, type ChatFile } from "@shared/chat";
import { Download } from "@/components/ui/icons";
import { fileUrl } from "@/lib/chatFiles";
import { SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";

/*
 * A voice message in the conversation: play, its waveform with the time under
 * it, and how fast. The waveform comes with the message, so it's drawn before
 * any sound has loaded; the sound loads only when it's played. What's been
 * heard fills in smoothly along the bars, and pressing or dragging along them
 * jumps there. The speed is a small pill that steps 1×, 1.5×, 2× and stands
 * out when it isn't 1×. One plays at a time: starting another pauses this one.
 */

const SPEEDS = [1, 1.5, 2] as const;
/** The one playing now, anywhere on the page. */
let current: HTMLAudioElement | null = null;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * The bars, from quiet to loud: never flatter than a dot, never taller than
 * the line. A gentle curve keeps speech's quieter moments visibly lower than
 * its peaks, so the shape reads at a glance.
 */
function Bars({ peaks, className }: { peaks: number[]; className: string }) {
  return (
    <span className="flex h-full w-full items-center justify-between gap-[2px]">
      {peaks.map((peak, index) => (
        <span
          key={index}
          className={cn("w-[3px] shrink rounded-full", className)}
          style={{ height: `${3 + Math.pow(Math.min(100, peak) / 100, 1.8) * 23}px` }}
        />
      ))}
    </span>
  );
}

export function VoiceMessage({ file }: { file: ChatFile }) {
  const t = useTranslations("chat");
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [broken, setBroken] = useState(false);
  const duration = file.duration ?? 0;
  const peaks = file.peaks?.length ? file.peaks : Array<number>(VOICE_PEAKS).fill(30);

  // Follows the sound smoothly while it plays, rather than at timeupdate's few steps a second.
  const follow = () => {
    const element = audio.current;
    if (!element) return;
    setAt(element.currentTime);
    if (!element.paused) frame.current = requestAnimationFrame(follow);
  };

  const sound = () => {
    if (audio.current) return audio.current;
    const element = new Audio(fileUrl(file));
    element.preload = "auto";
    element.onplay = () => {
      setPlaying(true);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(follow);
    };
    element.onpause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame.current);
    };
    element.onended = () => {
      setPlaying(false);
      setAt(0);
      if (current === element) current = null;
    };
    element.onerror = () => {
      setPlaying(false);
      setBroken(true);
    };
    audio.current = element;
    return element;
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      const element = audio.current;
      if (!element) return;
      element.pause();
      element.src = "";
      if (current === element) current = null;
    },
    [],
  );

  const toggle = () => {
    const element = sound();
    if (!element.paused) return element.pause();
    if (current && current !== element) current.pause();
    current = element;
    element.playbackRate = speed;
    void element.play().catch(() => setBroken(true));
  };

  // Pressing or dragging along the waveform: there, and playing from there if it was.
  const seekTo = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const fraction = Math.min(1, Math.max(0, (rtl ? box.right - event.clientX : event.clientX - box.left) / box.width));
    const element = sound();
    const to = fraction * duration;
    try {
      element.currentTime = to;
    } catch {
      // Not loaded far enough yet: it starts from where it can.
    }
    setAt(to);
  };

  const nextSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  const progress = duration ? Math.min(1, at / duration) : 0;
  const started = playing || at > 0;

  if (broken) {
    return (
      <a
        href={fileUrl(file, true)}
        download={file.name}
        className="flex h-12 w-[17rem] max-w-full items-center gap-3 rounded-[20px] border border-border bg-card px-3.5 text-[13px] text-muted-foreground hover:border-border-strong"
      >
        <Download className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t("voiceMessage")}</span>
        <span className="tabular-nums">{clock(duration)}</span>
      </a>
    );
  }

  return (
    <div className="flex w-[21rem] max-w-full items-center gap-3 rounded-[20px] border border-border bg-card py-2 pe-3.5 ps-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pauseVoice") : t("playVoice")}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95"
      >
        {/* Solid marks, drawn here: the icon set's outlines read as "00" at this size. */}
        <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 fill-current", !playing && "rtl:-scale-x-100")}>
          {playing ? (
            <>
              <rect x="3.5" y="2.5" width="3.2" height="11" rx="1.1" />
              <rect x="9.3" y="2.5" width="3.2" height="11" rx="1.1" />
            </>
          ) : (
            <path d="M4.3 3.3c0-.8.9-1.3 1.6-.9l7.2 4.7c.6.4.6 1.4 0 1.8l-7.2 4.7c-.7.4-1.6-.1-1.6-.9z" />
          )}
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t("voiceMessage")}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(at)}
          aria-valuetext={`${clock(at)} / ${clock(duration)}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seekTo(event);
          }}
          onPointerMove={(event) => event.buttons === 1 && seekTo(event)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const element = sound();
            const step = (event.key === "ArrowRight") !== (getComputedStyle(event.currentTarget).direction === "rtl") ? 5 : -5;
            element.currentTime = Math.min(duration, Math.max(0, element.currentTime + step));
            setAt(element.currentTime);
          }}
          className="relative h-7 cursor-pointer touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Bars peaks={peaks} className="bg-foreground/[0.18]" />
          {/* The heard part: the same bars, cut off where the sound has got to, so it fills smoothly rather than a bar at a time. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 [clip-path:inset(0_calc(100%-var(--p))_0_0)] rtl:[clip-path:inset(0_0_0_calc(100%-var(--p)))]"
            style={{ "--p": `${progress * 100}%` } as CSSProperties}
          >
            <Bars peaks={peaks} className="bg-foreground" />
          </span>
        </div>

        <div className="mt-1 flex h-[18px] items-center justify-between">
          <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground">
            {started ? (
              <>
                <span className="text-foreground">{clock(at)}</span>
                <span className="text-faint"> / {clock(duration)}</span>
              </>
            ) : (
              clock(duration)
            )}
          </span>
          <button
            type="button"
            onClick={nextSpeed}
            aria-label={`${t("voiceSpeed")}: ${speed}×`}
            className={cn(
              "relative flex h-[18px] min-w-[34px] cursor-pointer items-center justify-center overflow-hidden rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums transition-colors",
              speed === 1 ? "bg-foreground/[0.07] text-muted-foreground hover:bg-foreground/[0.12] hover:text-foreground" : "bg-foreground text-background",
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={speed} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={SPRING_SWAP}>
                {speed}×
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
