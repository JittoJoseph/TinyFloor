"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, ExternalLink } from "web-shared/components/ui/icons";
import { MAIN_MEETING } from "shared-protocol/messages";
import type { CalendarEvent } from "web-shared/lib/api";
import { googleAvailable } from "web-shared/components/auth/GoogleButton";
import { Link } from "@/lib/i18n/navigation";
import { callManager } from "@/lib/CallManager";
import { isOurs, useCalendar } from "@/lib/calendar";
import { usePlace } from "@/components/app/place";
import { cn } from "web-shared/lib/utils";

/** How many of the day's events are listed: the rest of a busy day is in Google Calendar. */
const SHOWN = 6;

/**
 * Your day, under the way into the office's meeting: what's still on your
 * calendar today, each with its way in (ours joins the office's meeting, a
 * Meet or Zoom link opens it), and a way to put a meeting here on everyone's
 * calendar. Without a calendar connected, a quiet line to connect one.
 */
export function YourDay() {
  const t = useTranslations("meetings.day");
  const place = usePlace();
  const { status, events } = useCalendar();
  const now = useMinute();
  if (place.kind !== "office" || place.role === "guest") return null;
  const midnight = new Date(now).setHours(24, 0, 0, 0);
  const left = events.filter((event) => !event.allDay && event.end > now && event.start < midnight).slice(0, SHOWN);

  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[12.5px] font-medium text-muted-foreground">{t("title")}</h2>
        <a
          href={invite(meetingsLink(place.paths.meetings), t("inviteTitle", { office: place.name }), t("inviteBody"))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Calendar className="size-3.5" />
          {t("schedule")}
        </a>
      </div>
      {status === "on" ? (
        left.length ? (
          <ul className="-mx-2">
            {left.map((event) => (
              <DayEvent key={event.id} event={event} now={now} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[13px] text-muted-foreground">{t("clear")}</p>
        )
      ) : status === "off" && googleAvailable ? (
        <p className="py-2 text-[13px] text-muted-foreground">
          {t.rich("connect", {
            link: (words) => (
              <Link href={`${place.paths.settings}#calendar`} className="font-medium text-foreground underline decoration-border-strong underline-offset-2 hover:decoration-foreground">
                {words}
              </Link>
            ),
          })}
        </p>
      ) : null}
    </section>
  );
}

function DayEvent({ event, now }: { event: CalendarEvent; now: number }) {
  const t = useTranslations("meetings.day");
  const locale = useLocale();
  const on = event.start <= now;
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const ours = event.link ? isOurs(event.link) : false;
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span className={cn("w-[4.5rem] shrink-0 text-[12.5px] tabular-nums", on ? "font-medium text-foreground" : "text-muted-foreground")}>
        {on ? t("now") : time.format(event.start)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-foreground">{event.title || t("untitled")}</p>
        <p className="text-[12px] tabular-nums text-muted-foreground">{t("until", { time: time.format(event.end) })}</p>
      </div>
      {event.link &&
        (ours ? (
          <button
            type="button"
            onClick={() => callManager.joinMeeting(MAIN_MEETING)}
            className="h-8 shrink-0 cursor-pointer rounded-full border border-border px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("join")}
          </button>
        ) : (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("open")}
            <ExternalLink className="size-3.5" />
          </a>
        ))}
    </li>
  );
}

/** The time, a minute at a time: what's on now moves along without anything else changing. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The office's Meetings page, in full: what an invite links to, so whoever opens it lands at the way in. */
function meetingsLink(path: string | undefined): string {
  return new URL(path ?? "/", location.origin).toString();
}

/**
 * Google Calendar's own new-event page, filled in: a meeting in this office,
 * its link as the place, so it's on everyone's calendar with the way in. No
 * access to anyone's calendar is needed for it (Google's event template link).
 */
function invite(link: string, title: string, body: string): string {
  const query = new URLSearchParams({ action: "TEMPLATE", text: title, location: link, details: `${body}\n${link}` });
  return `https://calendar.google.com/calendar/render?${query}`;
}
