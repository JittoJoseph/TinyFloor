"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import { MicOff, MonitorUp } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

/**
 * One person in a meeting. With their camera on the stage shows it; otherwise
 * their character stands on a wash of their own colour, which costs nothing
 * to show. A ring lights while they talk. Sound never comes from a tile: every
 * voice plays once, from MeetingAudio, whether its tile is on screen or not.
 */
export const MeetingTile = memo(function MeetingTile({
  id,
  name,
  character,
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
  character: string;
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
        "relative isolate overflow-hidden bg-muted [container-type:size]",
        compact ? "rounded-xl" : "rounded-2xl",
        screen ? "bg-[#161618]" : "",
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
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="absolute inset-0 opacity-25 dark:opacity-20" style={{ backgroundImage: faceBackground(id) }} />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent" />
          {/* The sprite stands on its feet: placed by them, a little below the middle. */}
          <PixelAvatar
            character={character}
            width={compact ? "min(20cqw, 36cqh)" : "min(15cqw, 32cqh)"}
            style={{ left: "50%", top: compact ? "84%" : "80%" }}
          />
        </div>
      )}

      {/* The speaking ring, drawn over the video so it shows on any picture. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] ring-inset transition-shadow duration-200",
          speaking && !screen ? "ring-[3px] ring-brand" : "ring-1 ring-foreground/[0.06]",
        )}
      />

      <span
        className={cn(
          "absolute bottom-2 start-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-black/55 font-semibold text-white backdrop-blur-sm",
          compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        )}
      >
        {screen && <MonitorUp className="size-3.5 shrink-0" aria-hidden />}
        {!screen && micOff && <MicOff className="size-3.5 shrink-0 text-[#ff8a65]" aria-hidden />}
        <span className="truncate">{name}</span>
      </span>
    </div>
  );
});
