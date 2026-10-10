"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
import { MeetingUsageLine, VideoPausedNote } from "@/components/meetings/MeetingHours";
import { usePlace } from "./place";

/** Space between two pills, in pixels (gap-2). */
const PILL_GAP = 8;

/**
 * Meetings, on the rail (docs/12-meetings.md, docs/22), in an office or the
 * lobby: the office's own meeting, always there to drop into, then any others
 * going on now, each with who is in it; under them, the meeting hours. Inside
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
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 shrink-0 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            <span className="max-sm:sr-only">{t("new")}</span>
          </Button>
        </header>

        <VideoPausedNote className="mt-6 w-fit max-w-full" />

        <div className="mt-6">
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

        <MeetingUsageLine className="mt-8 border-t border-border pt-4" />
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
 * A meeting: its name, whether it's on and for how long, who is in it as one
 * line of names, and the way in. The office's own meeting is always listed,
 * waiting while nobody is in.
 */
function MeetingRow({ meeting, office, known, main = false }: { meeting: MeetingInfo; office: string; known: boolean; main?: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;

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
            ) : known ? (
              t("emptyRoom")
            ) : (
              // Until the floor says who's in, nothing is claimed either way.
              <span aria-hidden className="my-1 h-2.5 w-28 animate-pulse rounded-full bg-muted" />
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
      {live && <PeopleLine people={meeting.members} />}
    </section>
  );
}

/**
 * Who is in a meeting, on one line: as many names as fit, then how many others.
 * A hidden copy of every pill is measured to know where the line runs out.
 */
function PeopleLine({ people }: { people: MeetingPerson[] }) {
  const line = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(people.length);

  useLayoutEffect(() => {
    const box = line.current;
    const measured = ruler.current;
    if (!box || !measured) return;
    const measure = () => {
      const widths = [...measured.querySelectorAll<HTMLElement>("[data-pill]")].map((pill) => pill.offsetWidth);
      const others = measured.querySelector<HTMLElement>("[data-others]")?.offsetWidth ?? 0;
      const room = box.clientWidth;
      let used = 0;
      let count = 0;
      for (const [index, width] of widths.entries()) {
        const last = index === widths.length - 1;
        const next = used + (index ? PILL_GAP : 0) + width;
        // Room for this name, and for the count after it unless it's the last.
        if (next + (last ? 0 : PILL_GAP + others) > room) break;
        used = next;
        count++;
      }
      setFits(Math.max(1, count));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [people]);

  const rest = people.length - fits;
  return (
    <div className="relative overflow-hidden border-t border-border px-5 py-3.5">
      <div ref={line} className="flex gap-2 overflow-hidden">
        {people.slice(0, fits).map((person) => (
          <Pill key={person.id} person={person} />
        ))}
        {rest > 0 && <Others count={rest} />}
      </div>
      <div ref={ruler} aria-hidden className="invisible absolute start-0 top-0 flex gap-2 whitespace-nowrap">
        {people.map((person) => (
          <Pill key={person.id} person={person} />
        ))}
        <Others count={people.length} />
      </div>
    </div>
  );
}

function Others({ count }: { count: number }) {
  const t = useTranslations("meetings");
  return (
    <span data-others className="flex h-8 shrink-0 items-center rounded-full bg-muted px-3 text-[12.5px] font-medium tabular-nums text-muted-foreground">
      {t("others", { count })}
    </span>
  );
}

function Pill({ person }: { person: MeetingPerson }) {
  return (
    <span data-pill className="flex h-8 min-w-0 max-w-[12rem] shrink-0 items-center gap-2 rounded-full bg-muted pe-3 ps-1">
      <Face seed={person.id} size={24} />
      <span className="truncate text-[12.5px] font-medium text-foreground">{person.name}</span>
    </span>
  );
}
