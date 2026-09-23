import { useTranslations } from "next-intl";
import { LogOut, Mic, MicOff, MonitorUp, Video } from "lucide-react";
import { FloorScene } from "@/components/floor/FloorScene";
import { MEETING } from "@/components/floor/scenes";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [emma, jack, olivia, sam] = CAST;

/**
 * A meeting, as the app shows it: the four of them at the table in the
 * meeting room, everyone at it as a card along the top (faces while cameras
 * are off, a ring on whoever is talking), and the bar that leaves the meeting.
 */
export function MeetingPreview({ close = false }: { close?: boolean }) {
  const tc = useTranslations("common");
  const tb = useTranslations("controls");
  const cards = [
    { person: emma, you: true },
    { person: jack, speaking: true },
    { person: olivia, muted: true },
    { person: sam },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The meeting room's table, everyone sitting at it. */}
      <FloorScene {...MEETING} view={close ? [1, 3, 14, 10] : [0, 2, 24, 14]} className="absolute inset-0 h-full w-full" />

      <div className="absolute inset-x-0 top-3 flex justify-center px-3 sm:top-4">
        <ul className={cn("grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5", close ? "max-w-[360px] sm:gap-2" : "max-w-[640px]")}>
          {cards.map(({ person, you, speaking, muted }) => (
            <li
              key={person.id}
              className={cn(
                "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-card shadow-lg ring-2 [--face-ring:var(--ui-card)]",
                speaking ? "ring-brand" : "ring-card/80",
              )}
            >
              <Face seed={person.id} size={close ? 28 : 36} />
              <span className="absolute bottom-1.5 start-1.5 flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10.5px] font-semibold text-foreground shadow-sm">
                {muted && <MicOff className="size-3 shrink-0 text-brand" />}
                <span className="truncate">{you ? tc("you") : person.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <span className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-float  rtl:translate-x-1/2">
        {[Mic, Video, MonitorUp].map((Icon, index) => (
          <span key={index} className="flex size-7 items-center justify-center rounded-full text-foreground">
            <Icon className="size-3.5" />
          </span>
        ))}
        <span className="mx-0.5 h-4 w-px bg-border" />
        <span className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-destructive px-3 text-[11px] font-medium text-white">
          <LogOut className="size-3.5 rtl:rotate-180" />
          {tb("leaveMeeting")}
        </span>
      </span>
    </div>
  );
}
