"use client";

import { memo, useEffect, useRef, type CSSProperties } from "react";
import { Maximize2, MicOff, Minimize2, MonitorUp } from "@/components/ui/icons";
import { faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

/**
 * One person in a meeting, the way Meet draws them: their camera when it's
 * on; otherwise their circle in the middle of a plain card. Nothing glows. A
 * hairline turns into a ring while they talk, and the corner says whether
 * their mic is off or, while they talk, shows it moving. A tile can be pinned,
 * to keep it big on your stage. Sound never comes from a tile: every voice
 * plays once, from MeetingAudio, whether its tile is on screen or not.
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
  contain,
  caption,
  pin,
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
  /** A small tile: the column beside the big one, the floor's card. */
  compact?: boolean;
  /** The whole picture, never cropped: the big card, where a face cut off would be odd. */
  contain?: boolean;
  /** A line under the circle while there's no video ("Waiting for others to join"). */
  caption?: string;
  /** Pinning it big, or letting it go: shown on hover, and always while pinned. */
  pin?: { pinned: boolean; label: string; onToggle: () => void };
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const showing = !!video?.getVideoTracks().length;
  const talking = speaking && !micOff && !screen;

  useEffect(() => {
    const element = ref.current;
    if (element && element.srcObject !== video) element.srcObject = video;
  }, [video]);

  return (
    <div
      style={style}
      className={cn(
        "group/tile relative isolate overflow-hidden [container-type:size]",
        compact ? "rounded-xl" : "rounded-2xl",
        screen ? "bg-[#161618]" : "bg-[color-mix(in_oklab,var(--ui-muted)_85%,var(--ui-background))]",
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
          screen || contain ? "object-contain" : "object-cover",
          mirror && "-scale-x-100",
          !showing && "invisible",
        )}
      />
      {!showing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <span
            aria-hidden
            className={cn("aspect-square rounded-full", compact ? "h-[38cqh]" : "h-[26cqh] max-h-36 min-h-14")}
            style={{ backgroundImage: faceBackground(id) }}
          />
          {caption && <p className="text-[13px] text-muted-foreground">{caption}</p>}
        </div>
      )}

      {/* A shade under the name, only over a picture, so white words stay readable. */}
      {(showing || screen) && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
      )}

      <span
        className={cn(
          "absolute bottom-2.5 start-3 max-w-[calc(100%-1.5rem)] truncate font-medium",
          showing || screen ? "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]" : "text-foreground/90",
          compact ? "bottom-2 start-2.5 text-[11.5px]" : "text-[13px]",
        )}
      >
        {screen && <MonitorUp className="me-1.5 inline size-3.5 align-[-2px]" aria-hidden />}
        {name}
      </span>

      {/* The corner: the mic's state. Off, a quiet badge; talking, three bars moving. */}
      {!screen && (micOff || talking) && (
        <span
          aria-hidden
          className={cn(
            "absolute end-2 top-2 flex items-center justify-center rounded-full",
            compact ? "size-6" : "size-7",
            talking ? "bg-brand text-white" : "bg-black/45 text-white backdrop-blur-sm",
          )}
        >
          {talking ? <Bars /> : <MicOff className="size-3.5" />}
        </span>
      )}

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] ring-inset transition-shadow duration-150",
          talking ? "ring-2 ring-brand" : "ring-1 ring-foreground/[0.06]",
        )}
      />

      {pin && (
        <button
          type="button"
          onClick={pin.onToggle}
          aria-label={pin.label}
          title={pin.label}
          aria-pressed={pin.pinned}
          className={cn(
            "absolute bottom-2 end-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white outline-none backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/70 [&_svg]:size-4",
            pin.pinned ? "opacity-100" : "opacity-0 group-hover/tile:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          {pin.pinned ? <Minimize2 /> : <Maximize2 />}
        </button>
      )}
    </div>
  );
});

/** Someone's voice, as three small bars that rise and fall. */
function Bars() {
  return (
    <span className="flex h-3 items-center gap-[2px]">
      {[0, 160, 80].map((delay) => (
        <span
          key={delay}
          className="w-[3px] rounded-full bg-current motion-safe:animate-[voice_0.8s_ease-in-out_infinite]"
          style={{ height: "100%", animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
