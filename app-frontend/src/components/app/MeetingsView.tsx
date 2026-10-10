"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Video } from "@/components/ui/icons";
import { MAIN_MEETING, type MeetingInfo, type MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { Button } from "@/components/motion/button/base";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { MeetingStage } from "@/components/meetings/MeetingStage";
import { NewMeetingDialog } from "@/components/meetings/MeetingDialogs";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { MeetingUsageCard, VideoPausedNote } from "@/components/meetings/MeetingHours";
import { usePlace } from "./place";

/** People named in a meeting's row before the rest become a count. */
const NAMED = 6;

/**
 * Meetings, on the rail (docs/12-meetings.md, docs/22), in an office or the
 * lobby: the office's own meeting, always there to drop into, then any others
 * going on now, each with who is in it; beside them, the meeting hours. Inside
 * one, the page is the meeting's stage.
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
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 shrink-0 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            <span className="max-sm:sr-only">{t("new")}</span>
          </Button>
        </header>

        <VideoPausedNote className="mt-6 w-fit max-w-full" />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
          <div className="min-w-0">
            <MeetingRow meeting={main} office={office} known={known} main />
            {others.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 text-[13px] font-medium text-muted-foreground">{t("alsoOn")}</h2>
                <ul className="space-y-3">
                  {others.map((one) => (
                    <li key={one.id}>
                      <MeetingRow meeting={one} office={office} known />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside>
            <MeetingUsageCard />
          </aside>
        </div>
      </div>

      <NewMeetingDialog open={starting} onClose={() => setStarting(false)} onStarted={() => setStarting(false)} />
    </div>
  );
}

/** How long a meeting has been going. */
function Elapsed({ meeting }: { meeting: MeetingInfo }) {
  const elapsed = useElapsed(meeting.startedAt);
  return <span className="tabular-nums">{clock(elapsed)}</span>;
}

/**
 * A meeting: its name, whether it's on and for how long, who is in it (whoever
 * is talking ringed), and the way in. The office's own meeting is always
 * listed, waiting while nobody is in.
 */
function MeetingRow({ meeting, office, known, main = false }: { meeting: MeetingInfo; office: string; known: boolean; main?: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;
  const named = meeting.members.slice(0, NAMED);
  const rest = meeting.members.length - named.length;

  return (
    <section className="rounded-2xl border border-border bg-background">
      <div className={cn("flex items-center gap-4 px-5", main ? "py-5" : "py-4")}>
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl",
            main ? "size-11" : "size-10",
            live ? "bg-ok/10 text-ok" : "bg-muted text-muted-foreground",
          )}
        >
          <Video className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={cn("truncate font-semibold tracking-tight text-foreground", main ? "text-[17px]" : "text-[15px]")}>
            {nameOf(meeting, office)}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            {live ? (
              <>
                <span className="size-1.5 rounded-full bg-ok" aria-hidden />
                <Elapsed meeting={meeting} />
                <span aria-hidden>·</span>
                {t("people", { count: meeting.members.length })}
              </>
            ) : (
              t("emptyRoom")
            )}
          </p>
        </div>
        <Button
          size={main ? "md" : "sm"}
          variant={main || live ? "primary" : "secondary"}
          disabled={!known}
          onClick={() => callManager.joinMeeting(meeting.id)}
          className={cn("shrink-0", main ? "h-10 px-5 text-[13.5px]" : "h-9 px-4 text-[13px]")}
        >
          {live ? t("join") : t("start")}
        </Button>
      </div>
      {live && (
        <ul className="flex flex-wrap gap-2 border-t border-border px-5 py-3.5">
          {named.map((person) => (
            <Person key={person.id} person={person} />
          ))}
          {rest > 0 && (
            <li className="flex h-8 items-center rounded-full bg-muted px-3 text-[12.5px] font-medium tabular-nums text-muted-foreground">
              {t("more", { count: rest })}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function Person({ person }: { person: MeetingPerson }) {
  return (
    <li className="flex h-8 max-w-[12rem] items-center gap-2 rounded-full bg-muted pe-3 ps-1">
      <span className={cn("flex rounded-full ring-2 transition-[box-shadow]", person.speaking ? "ring-ok" : "ring-transparent")}>
        <Face seed={person.id} size={24} />
      </span>
      <span className="truncate text-[12.5px] font-medium text-foreground">{person.name}</span>
    </li>
  );
}
