import { useTranslations } from "next-intl";
import { LogOut, Mic, MicOff, MonitorUp, Video } from "lucide-react";
import { OfficeScene, type Occupant } from "@/components/OfficeScene";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [emma, jack, olivia, sam] = CAST;

const SIZE = "max(3.1cqw, 4.6cqh, 20px)";

/** The four of them around the desks on the right, loosely, the way people gather. */
const GATHERED: Occupant[] = [
  { character: emma.character, name: emma.name, status: "in_call", left: "58.5%", top: "80%", direction: "right", width: SIZE },
  { character: jack.character, name: jack.name, status: "in_call", left: "68%", top: "86.5%", direction: "up", width: SIZE },
  { character: olivia.character, name: olivia.name, status: "in_call", left: "79.5%", top: "79%", direction: "left", width: SIZE },
  { character: sam.character, name: sam.name, status: "in_call", left: "74%", top: "57%", direction: "down", width: SIZE },
];

/**
 * A meeting, as the app shows it: the floor stays in view, everyone at the
 * table appears as a card along the top (faces while cameras are off, a ring
 * on whoever is talking), and the bar at the bottom leaves the meeting.
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
      <div className="absolute inset-0" style={close ? { transform: "scale(1.5)", transformOrigin: "72% 78%" } : undefined}>
        <OfficeScene pinned focus="center center" occupants={GATHERED} className="h-full w-full" />
      </div>

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
              <span className="absolute bottom-1.5 start-1.5 flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10.5px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                {muted && <MicOff className="size-3 shrink-0 text-brand" />}
                <span className="truncate">{you ? tc("you") : person.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <span className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-float backdrop-blur-md rtl:translate-x-1/2">
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
