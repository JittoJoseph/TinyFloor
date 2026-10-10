"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AudioLines, Footprints, Plus, Video } from "@/components/ui/icons";
import { MAIN_MEETING, type MeetingInfo } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { Button } from "@/components/motion/button/base";
import { FaceStack } from "@/components/ui/Face";
import { FloorScene, type Sitter } from "@/components/floor/FloorScene";
import { cn } from "@/lib/utils";
import { MeetingStage } from "@/components/meetings/MeetingStage";
import { NewMeetingDialog } from "@/components/meetings/MeetingDialogs";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { MeetingUsageCard, VideoPausedNote } from "@/components/meetings/MeetingHours";
import { usePlace } from "./place";

/** The meeting room's six chairs on the map, as FloorScene names them: the far side first, then the near. */
const CHAIRS: Array<[number, number]> = [
  [6, 8],
  [4, 8],
  [8, 8],
  [6, 11],
  [4, 11],
  [8, 11],
];
/** The meeting room on the map, in tiles. */
const ROOM: [number, number, number, number] = [1, 5, 12, 8];

/**
 * Meetings, on the rail (docs/12-meetings.md, docs/22), in an office or the
 * lobby. The main meeting is always here to drop into: the real meeting room,
 * with whoever is in it at the table. Anyone else's meetings sit under it, and
 * beside them the month's meeting hours and how meetings work. Joining one
 * walks your character into the meeting room, and the meeting itself happens
 * on this page. Inside one, the page is the meeting's stage.
 */
export function MeetingsView() {
  const place = usePlace();
  const mine = useMyMeeting();
  const { meeting } = useCall();
  // Just joined, before the room's list has caught up: the stage waits a beat.
  if (meeting && mine) return <MeetingStage meeting={mine} office={place.name} />;
  return <MeetingsLobby office={place.name} />;
}

function MeetingsLobby({ office }: { office: string }) {
  const t = useTranslations("meetings");
  const { meetings } = useMeetings();
  const [starting, setStarting] = useState(false);
  const main = meetings.find((one) => one.id === MAIN_MEETING) ?? {
    id: MAIN_MEETING,
    name: null,
    by: null,
    startedAt: null,
    members: [],
  };
  const others = meetings.filter((one) => one.id !== MAIN_MEETING);
  // An office always has its main meeting: none at all means the floor hasn't said yet.
  const known = meetings.length > 0;

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 shrink-0 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            <span className="max-sm:sr-only">{t("new")}</span>
          </Button>
        </header>

        <VideoPausedNote className="mt-6 w-fit max-w-full" />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
          <div className="min-w-0 space-y-3">
            <MainMeeting meeting={main} office={office} known={known} />
            {others.length > 0 && (
              <section>
                <h2 className="mb-2 mt-6 text-[13px] font-semibold text-foreground">{t("alsoOn")}</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {others.map((one) => (
                    <li key={one.id}>
                      <OtherMeeting meeting={one} office={office} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-3">
            <MeetingUsageCard />
            <HowMeetingsWork />
          </aside>
        </div>
      </div>

      <NewMeetingDialog open={starting} onClose={() => setStarting(false)} onStarted={() => setStarting(false)} />
    </div>
  );
}

/** How long a meeting has been going, with the live dot. */
function Live({ meeting, className }: { meeting: MeetingInfo; className?: string }) {
  const elapsed = useElapsed(meeting.startedAt);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12.5px] font-medium tabular-nums text-ok", className)}>
      <span className="size-1.5 rounded-full bg-ok" aria-hidden />
      {clock(elapsed)}
    </span>
  );
}

/**
 * The office's own meeting, always there: the meeting room as it is on the
 * floor, with the first six people in it at the table (the rest as faces),
 * and the way in under it. While nobody is in, the chairs wait.
 */
function MainMeeting({ meeting, office, known }: { meeting: MeetingInfo; office: string; known: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;
  const seated: Sitter[] = meeting.members.slice(0, CHAIRS.length).map((person, index) => ({
    character: person.character,
    name: person.name.split(" ")[0],
    chair: CHAIRS[index],
    status: "in_call",
  }));
  const extra = meeting.members.slice(CHAIRS.length);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-background">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted sm:aspect-[2/1]">
        <FloorScene view={ROOM} sitting={seated} className={cn("absolute inset-0", !live && "opacity-90")} />
        {/* A soft floor under the name, so the room reads as a place and the words stay legible. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/90 to-transparent" />
        {live && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-sm backdrop-blur">
            <span className="size-1.5 rounded-full bg-ok" aria-hidden />
            {t("people", { count: meeting.members.length })}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 px-5 pb-5 pt-1 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[19px] font-semibold tracking-tight text-foreground">{nameOf(meeting, office)}</h2>
          <div className="mt-1 flex items-center gap-2.5">
            {live ? <Live meeting={meeting} /> : <span className="text-[12.5px] text-muted-foreground">{t("emptyRoom")}</span>}
            {extra.length > 0 && <FaceStack seeds={extra.map((person) => person.id)} size={20} max={4} />}
          </div>
        </div>
        <Button size="md" disabled={!known} onClick={() => callManager.joinMeeting(meeting.id)} className="h-11 shrink-0 gap-2 px-6 text-[14px]">
          <Video className="size-4" />
          {live ? t("join") : t("start")}
        </Button>
      </div>
    </section>
  );
}

function OtherMeeting({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 ps-4 [--face-ring:var(--ui-background)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{nameOf(meeting, office)}</p>
        <div className="mt-1.5 flex items-center gap-2.5">
          <FaceStack seeds={meeting.members.map((member) => member.id)} size={24} max={4} />
          <Live meeting={meeting} />
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={() => callManager.joinMeeting(meeting.id)} className="h-9 px-4 text-[13px]">
        {t("join")}
      </Button>
    </div>
  );
}

/** The three things worth knowing about meetings here, once, beside them. */
function HowMeetingsWork() {
  const t = useTranslations("meetings.how");
  const row = (icon: ReactNode, text: string) => (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5">{icon}</span>
      <span className="text-[12.5px] leading-relaxed text-muted-foreground">{text}</span>
    </li>
  );
  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <h2 className="text-[12.5px] font-medium text-muted-foreground">{t("title")}</h2>
      <ul className="mt-3 space-y-3">
        {row(<Footprints />, t("walk"))}
        {row(<Video />, t("speakers"))}
        {row(<AudioLines />, t("voice"))}
      </ul>
    </section>
  );
}
