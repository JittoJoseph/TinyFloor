"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import { MicOff, MonitorUp } from "@/components/ui/icons";
import { faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

/**
 * One person in a meeting. With their camera on the stage shows it; otherwise
 * their face, their orb, sits in the middle of a plain card, lit softly in its
 * own colour. A ring lights while they talk: around the orb, or around the
 * picture. Sound never comes from a tile: every voice plays once, from
 * MeetingAudio, whether its tile is on screen or not.
 */
export const MeetingTile = memo(function MeetingTile({
  id,
  name,
  video,
  speaking,
  micOff,
  mirror,
  screen,
  compact,
  className,
  style,
}: {
  id: string;
  name: string;
  /** A stream with the video to show, when there is one. */
  video: MediaStream | null;
  speaking: boolean;
  micOff: boolean;
  /** Your own camera, the way a mirror shows it. */
  mirror?: boolean;
  /** A shared screen: letterboxed, never cropped. */
  screen?: boolean;
  /** A small tile: the strip beside a screen, the floor's card. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const showing = !!video?.getVideoTracks().length;

  useEffect(() => {
    const element = ref.current;
    if (element && element.srcObject !== video) element.srcObject = video;
  }, [video]);

  return (
    <div
      style={style}
      className={cn(
        "relative isolate overflow-hidden [container-type:size]",
        compact ? "rounded-xl" : "rounded-2xl",
        screen ? "bg-[#161618]" : "bg-muted",
        className,
      )}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 size-full",
          screen ? "object-contain" : "object-cover",
          mirror && "-scale-x-100",
          !showing && "invisible",
        )}
      />
      {!showing && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Their colour, as light on the card behind them. */}
          <span
            aria-hidden
            className="absolute aspect-square h-[70cqh] rounded-full opacity-25 blur-3xl dark:opacity-20"
            style={{ backgroundImage: faceBackground(id) }}
          />
          <span
            aria-hidden
            className={cn(
              "relative aspect-square rounded-full transition-[box-shadow,scale] duration-200",
              compact ? "h-[40cqh]" : "h-[34cqh] max-h-32",
              speaking
                ? "scale-105 shadow-[0_0_0_3px_var(--ui-muted),0_0_0_6px_var(--ui-brand)]"
                : "shadow-[inset_-3px_-4px_10px_rgb(0_0_0/0.18),inset_2px_3px_7px_rgb(255_255_255/0.25)]",
            )}
            style={{ backgroundImage: faceBackground(id) }}
          />
        </div>
      )}

      {/* Around the picture, the ring shows on any video; a card's is only a hairline. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] ring-inset transition-shadow duration-200",
          showing && speaking && !screen ? "ring-[3px] ring-brand" : "ring-1 ring-foreground/[0.06]",
        )}
      />

      <span
        className={cn(
          "absolute bottom-2 start-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full font-semibold",
          showing || screen ? "bg-black/55 text-white backdrop-blur-sm" : "bg-card/90 text-foreground",
          compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        )}
      >
        {screen && <MonitorUp className="size-3.5 shrink-0" aria-hidden />}
        {!screen && micOff && <MicOff className="size-3.5 shrink-0 text-brand" aria-hidden />}
        <span className="truncate">{name}</span>
      </span>
    </div>
  );
});
