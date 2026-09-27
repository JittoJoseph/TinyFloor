"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Footprints, Plus, Video } from "lucide-react";
import { MAIN_MEETING, type MeetingInfo } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { Button } from "@/components/motion/button/base";
import { PixelAvatar } from "@/components/PixelAvatar";
import { faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { MeetingStage } from "@/components/meetings/MeetingStage";
import { NewMeetingDialog } from "@/components/meetings/MeetingDialogs";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { useOffice } from "./OfficeShell";

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
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button size="md" variant="secondary" onClick={() => setStarting(true)} className="h-10 gap-2 px-4 text-[13px]">
            <Plus className="size-4" />
            {t("new")}
          </Button>
        </header>

        <MainMeeting meeting={main} office={office} known={known} />

        {others.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[13px] font-medium text-muted-foreground">{t("others")}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {others.map((one) => (
                <li key={one.id}>
                  <OtherMeeting meeting={one} office={office} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <Footprints className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("walkHint")}
        </p>
      </div>

      <NewMeetingDialog open={starting} onClose={() => setStarting(false)} onStarted={() => setStarting(false)} />
    </div>
  );
}

/** How long a meeting has been going, or that nobody is in it. */
function Status({ meeting }: { meeting: MeetingInfo }) {
  const t = useTranslations("meetings");
  const elapsed = useElapsed(meeting.startedAt);
  const live = meeting.members.length > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums",
        live ? "bg-ok/12 text-ok" : "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-ok" : "bg-faint")} aria-hidden />
      {live ? t("liveFor", { time: clock(elapsed) }) : t("quiet")}
    </span>
  );
}

/** Who is in a meeting, as their characters, lit while they talk. */
function Attendees({ meeting, max, size }: { meeting: MeetingInfo; max: number; size: "lg" | "sm" }) {
  const t = useTranslations("meetings");
  const shown = meeting.members.slice(0, max);
  const extra = meeting.members.length - shown.length;
  return (
    <ul className="flex flex-wrap items-end gap-2">
      {shown.map((member) => (
        <li key={member.id} className="flex flex-col items-center gap-1.5">
          <span
            className={cn(
              "relative overflow-hidden rounded-2xl ring-2 transition-shadow duration-200",
              size === "lg" ? "size-16" : "size-11",
              member.speaking ? "ring-brand" : "ring-transparent",
            )}
          >
            <span className="absolute inset-0 opacity-30" style={{ backgroundImage: faceBackground(member.id) }} />
            <PixelAvatar character={member.character} width={size === "lg" ? 40 : 28} style={{ left: "50%", top: "112%" }} />
          </span>
          {size === "lg" && <span className="max-w-16 truncate text-[11.5px] font-medium text-muted-foreground">{member.name}</span>}
        </li>
      ))}
      {extra > 0 && (
        <li className={cn("flex items-center justify-center rounded-2xl bg-muted text-[12px] font-semibold text-muted-foreground", size === "lg" ? "mb-6 size-16" : "size-11")}>
          {t("plus", { count: extra })}
        </li>
      )}
    </ul>
  );
}

function MainMeeting({ meeting, office, known }: { meeting: MeetingInfo; office: string; known: boolean }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  const live = meeting.members.length > 0;
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-background">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          {known ? <Status meeting={meeting} /> : <span className="block h-[26px] w-24 animate-pulse rounded-full bg-muted" />}
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-foreground">{nameOf(meeting, office)}</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{t("mainBody")}</p>
        </div>
        <Button size="md" disabled={!known} onClick={() => callManager.joinMeeting(meeting.id)} className="h-11 gap-2 px-5 text-[14px]">
          <Video className="size-4" />
          {live ? t("join") : t("startMain")}
        </Button>
      </div>
      <div className="border-t border-border bg-card/50 px-5 py-4 sm:px-6">
        {!known ? (
          <span className="block h-9 w-2/3 animate-pulse rounded-xl bg-muted" />
        ) : live ? (
          <Attendees meeting={meeting} max={10} size="lg" />
        ) : (
          <p className="py-2 text-[13px] text-muted-foreground">{t("nobodyIn")}</p>
        )}
      </div>
    </section>
  );
}

function OtherMeeting({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const nameOf = useMeetingName();
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{nameOf(meeting, office)}</p>
          {meeting.name && meeting.by && <p className="truncate text-[12.5px] text-muted-foreground">{t("startedBy", { name: meeting.by })}</p>}
          <div className="mt-2">
            <Status meeting={meeting} />
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => callManager.joinMeeting(meeting.id)} className="h-9 px-3.5 text-[13px]">
          {t("join")}
        </Button>
      </div>
      <Attendees meeting={meeting} max={6} size="sm" />
    </div>
  );
}
