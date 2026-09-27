"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Video } from "lucide-react";
import { MAIN_MEETING, type MeetingInfo, type MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { Button } from "@/components/motion/button/base";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { MeetingStage } from "@/components/meetings/MeetingStage";
import { NewMeetingDialog } from "@/components/meetings/MeetingDialogs";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { useOffice } from "./OfficeShell";

/** Faces the main meeting shows before the rest become "+n". */
const MOST_FACES = 8;
/** Empty places drawn around the table while nobody is in. */
const EMPTY_PLACES = 5;

/**
 * Meetings, on the rail (docs/12-meetings.md). The office's main meeting is
 * always here to drop into, with anyone else's beside it; joining one walks
 * your character into the meeting room, and the meeting itself happens on
 * this page. Inside one, the page is the meeting's stage.
 */
export function MeetingsView() {
  const { office } = useOffice();
  const mine = useMyMeeting();
  const { meeting } = useCall();
  // Just joined, before the room's list has caught up: the stage waits a beat.
  if (meeting && mine) return <MeetingStage meeting={mine} office={office.name} />;
  return <MeetingsLobby office={office.name} />;
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
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            {t("new")}
          </Button>
        </header>

        <MainMeeting meeting={main} office={office} known={known} />

        {others.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {others.map((one) => (
              <li key={one.id}>
                <OtherMeeting meeting={one} office={office} />
              </li>
            ))}
          </ul>
        )}
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

/** Someone in the meeting: their face, ringed while they talk, and their name. */
function Attendee({ person }: { person: MeetingPerson }) {
  return (
    <li className="flex w-16 flex-col items-center gap-2">
      <span
        className={cn(
          "flex rounded-full ring-2 ring-offset-[3px] ring-offset-background transition-shadow duration-200",
          person.speaking ? "ring-brand" : "ring-transparent",
        )}
      >
        <Face seed={person.id} size={52} />
      </span>
      <span className="w-full truncate text-center text-[12px] font-medium text-muted-foreground">{person.name}</span>
    </li>
  );
}

/**
 * The office's own meeting, always there. Its people sit in the middle of the
 * card; while nobody is in, their places wait, empty, around the table.
 */
function MainMeeting({ meeting, office, known }: { meeting: MeetingInfo; office: string; known: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;
  const shown = meeting.members.slice(0, MOST_FACES);
  const extra = meeting.members.length - shown.length;

  return (
    <section className="mt-6 flex flex-col items-center rounded-3xl border border-border bg-background px-5 py-10 text-center sm:py-12">
      {live ? (
        <ul className="flex flex-wrap items-start justify-center gap-x-3 gap-y-4">
          {shown.map((person) => (
            <Attendee key={person.id} person={person} />
          ))}
          {extra > 0 && (
            <li className="flex size-[58px] items-center justify-center rounded-full bg-muted text-[13px] font-semibold tabular-nums text-muted-foreground">
              {t("plus", { count: extra })}
            </li>
          )}
        </ul>
      ) : (
        <ul aria-hidden className="flex items-center gap-3">
          {Array.from({ length: EMPTY_PLACES }, (_, index) => (
            <li
              key={index}
              className={cn(
                "flex size-[52px] items-center justify-center rounded-full",
                known ? "border-2 border-dashed border-border-strong" : "animate-pulse bg-muted",
                // The far places fade, so the row reads as a table, not a form.
                index === 0 || index === EMPTY_PLACES - 1 ? "opacity-40" : index !== 2 && "opacity-70",
              )}
            >
              {known && index === 2 && <Video className="size-5 text-faint" />}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-7 text-[20px] font-semibold tracking-tight text-foreground">{nameOf(meeting, office)}</h2>
      {live && <Live meeting={meeting} className="mt-1" />}

      <Button size="md" disabled={!known} onClick={() => callManager.joinMeeting(meeting.id)} className="mt-5 h-11 gap-2 px-6 text-[14px]">
        <Video className="size-4" />
        {live ? t("join") : t("start")}
      </Button>
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
