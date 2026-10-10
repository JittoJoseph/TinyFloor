"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "@/components/ui/icons";
import { MAIN_MEETING, type MeetingInfo, type MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { Button } from "@/components/motion/button/base";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { bezel, bezelPanel, onBezel } from "@/components/ui/bezel";
import { MeetingStage } from "@/components/meetings/MeetingStage";
import { NewMeetingDialog } from "@/components/meetings/MeetingDialogs";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { MeetingUsageLine, VideoPausedNote } from "@/components/meetings/MeetingHours";
import { FreeToTalk, JoinPreview } from "@/components/meetings/BeforeJoining";
import { usePlace } from "./place";

/** Space between two pills, in pixels (gap-2). */
const PILL_GAP = 8;

/**
 * Meetings, on the rail (docs/12-meetings.md, docs/22), in an office or the
 * lobby, laid out the way Meet asks before a call: you on the left, as big as
 * the page allows, with your mic and camera; on the right "Ready to join?",
 * the office's own meeting, who's in it and the way in. Under that, any other
 * meetings on now and who is free to talk. At the foot, the meeting hours.
 * Inside a meeting, the page is its stage.
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
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pt-5 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 shrink-0 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            <span className="max-sm:sr-only">{t("new")}</span>
          </Button>
        </header>

        <VideoPausedNote className="mt-4 w-fit max-w-full" />

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-10">
            <JoinPreview />
            <JoinMain meeting={main} office={office} known={known} />
          </div>

          {/* What else is on, and who could be: under the way in, out of its way. */}
          <div className="mt-6 grid items-start gap-6 empty:hidden md:grid-cols-2 lg:mt-8">
            {others.length > 0 && (
              <section className="rounded-2xl border border-border bg-background px-4 pb-2 pt-3.5 [--face-ring:var(--ui-background)]">
                <h2 className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">{t("alsoOn")}</h2>
                <ul>
                  {others.map((one) => (
                    <OtherMeeting key={one.id} meeting={one} office={office} />
                  ))}
                </ul>
              </section>
            )}
            <FreeToTalk className="rounded-2xl border border-border bg-background px-4 pb-2 pt-3.5 [--face-ring:var(--ui-background)]" />
          </div>
        </main>

        {/* The month's hours, at the page's foot: there to see, never in the way. */}
        <footer className="border-t border-border py-4">
          <MeetingUsageLine />
        </footer>
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
 * The office's own meeting, as Meet's "Ready to join?", built like a door: the
 * meeting written on a black bezel (its name, how long it's been on, how many
 * are in), and set into it who those are, on one line, and one big way in.
 */
function JoinMain({ meeting, office, known }: { meeting: MeetingInfo; office: string; known: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;

  return (
    <section className={cn(bezel, "rounded-[30px] p-1.5")}>
      <div className={cn(onBezel, "px-4 pb-4 pt-3.5 sm:px-[18px] sm:pt-[18px]")}>
        <p className="text-[12.5px] font-medium text-muted-foreground">{t("readyTitle")}</p>
        <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground">{nameOf(meeting, office)}</h2>
        <div className="mt-2 flex min-h-5 items-center gap-2 text-[13px] text-muted-foreground">
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
            <span aria-hidden className="h-2.5 w-28 animate-pulse rounded-full bg-muted" />
          )}
        </div>
      </div>
      <div className={cn(bezelPanel, "rounded-[24px] p-4 sm:p-5")}>
        {live && <PeopleLine people={meeting.members} className="mb-4" />}
        <Button size="md" disabled={!known} onClick={() => callManager.joinMeeting(meeting.id)} className="h-12 w-full px-6 text-[15px]">
          {live ? t("joinNow") : t("start")}
        </Button>
      </div>
    </section>
  );
}

/** Another meeting going on now, as one quiet row: its name, how long and how many, and the way in. */
function OtherMeeting({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  return (
    <li className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2">
      <FaceStack seeds={meeting.members.map((person) => person.id)} size={24} max={3} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">{nameOf(meeting, office)}</p>
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-ok" aria-hidden />
          <Elapsed meeting={meeting} />
          <span aria-hidden>·</span>
          {t("people", { count: meeting.members.length })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => callManager.joinMeeting(meeting.id)}
        className="h-8 shrink-0 cursor-pointer rounded-full border border-border px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
      >
        {t("join")}
      </button>
    </li>
  );
}

/**
 * Who is in a meeting, on one line: as many names as fit, then how many others.
 * A hidden copy of every pill is measured to know where the line runs out.
 */
function PeopleLine({ people, className }: { people: MeetingPerson[]; className?: string }) {
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
    <div className={cn("relative overflow-hidden", className)}>
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
    <span
      data-others
      className="flex h-8 shrink-0 items-center rounded-full bg-muted px-3 text-[12.5px] font-medium tabular-nums text-muted-foreground"
    >
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
