"use client";

import { useFormatter, useTranslations } from "next-intl";
import { MAIN_MEETING } from "@shared/messages";
import type { ChatMeeting } from "@shared/chat";
import { Check, Video } from "@/components/ui/icons";
import { FaceStack } from "@/components/ui/Face";
import { callManager } from "@/lib/CallManager";
import { useMeetings } from "@/lib/meetings";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { usePlace } from "../place";

/**
 * The main meeting in #general: a card of its own, set in from the edge
 * where messages' words start and a little apart from them, so it reads as
 * news in the channel rather than something someone posted. The meeting's
 * mark, its name and when it started (and how long it has run, or ran), and
 * under a hairline who is or was in it. While it's going, Join, the one
 * thing in colour. Whether it's still going is the floor's word
 * (useMeetings), so a card can't keep offering a meeting that has ended.
 */
export function MeetingCard({ meeting, latest }: { meeting: ChatMeeting; latest: boolean }) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const place = usePlace();
  const nameOf = useMeetingName();
  const { meetings } = useMeetings();
  const mine = useMyMeeting();
  const main = meetings.find((one) => one.id === MAIN_MEETING);
  // The newest card, not marked over, with the floor saying people are in: it's going on.
  const live = latest && !meeting.ended && (main ? main.members.length > 0 : meeting.here.length > 0);
  const elapsed = useElapsed(live ? (main?.startedAt ?? meeting.started) : null);
  const inIt = live && mine?.id === MAIN_MEETING;

  const people = live && main ? main.members.map((one) => ({ id: one.id, name: one.name })) : meeting.people;
  const names = people.map((one) => one.name);
  // Up to three by name ("Jordan, Ryan and John"); past that, the first two and how many others.
  const who =
    names.length <= 3
      ? names.length > 1
        ? `${names.slice(0, -1).join(", ")} ${t("meetingAnd")} ${names.at(-1)}`
        : (names[0] ?? "")
      : t("meetingOthers", { first: names.slice(0, 2).join(", "), count: names.length - 2 });
  const lasted = (meeting.ended ?? meeting.started) - meeting.started;
  const started = format.dateTime(meeting.started, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="px-5 pb-2 pt-4 sm:px-6">
      <div className="ms-12 w-[25rem] max-w-[calc(100%-3rem)] rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
            <Video className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              {nameOf(main ?? { id: MAIN_MEETING, name: null, by: null }, place.name)}
            </p>
            <p className="truncate text-[12.5px] tabular-nums text-muted-foreground">
              {live ? (
                <>
                  {t("meetingStartedAt", { time: started })}
                  <span aria-hidden> · </span>
                  {clock(elapsed)}
                </>
              ) : (
                <>
                  {t("meetingEnded")}
                  <span aria-hidden> · </span>
                  {lasted < 60_000 ? t("meetingUnderMinute") : t("meetingRan", { minutes: Math.round(lasted / 60_000) })}
                </>
              )}
            </p>
          </div>
          {live &&
            (inIt ? (
              <span className="flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-[12.5px] font-medium text-muted-foreground">
                <Check className="size-3.5" strokeWidth={2.4} />
                {t("meetingYoureIn")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => callManager.joinMeeting(MAIN_MEETING)}
                className="h-8 shrink-0 cursor-pointer rounded-full bg-ok px-4 text-[12.5px] font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
              >
                {t("meetingJoin")}
              </button>
            ))}
        </div>
        <div className="flex items-center gap-2.5 border-t border-border px-3 py-2.5 [--face-ring:var(--ui-card)]">
          <FaceStack seeds={people.map((one) => one.id)} size={22} max={5} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">{live ? t("meetingIn", { who }) : who}</span>
        </div>
      </div>
    </div>
  );
}
