"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "web-shared/components/ui/icons";
import type { CalendarEvent } from "web-shared/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useOffice } from "@/components/app/OfficeShell";
import { usePlace } from "@/components/app/place";
import { dayStart, readCalendar, scheduleLink, useCalendar, useMyWeek, useNow, useTeamWeek } from "@/lib/calendar";
import { ConnectCard, ConnectRow } from "./Connect";
import { EventDetails } from "./EventDetails";
import { Sidebar } from "./Sidebar";
import { WeekGrid, type Overlay } from "./WeekGrid";

const DAY = 24 * 60 * 60_000;
/** Your calendar's colour, and each teammate's, in turn. */
const MINE = "#14a39a";
const COLORS = ["#7c5cff", "#e5862d", "#e0559a", "#3b82f6", "#3fa34d", "#c2410c", "#0ea5c6", "#9b59d0"];
/** Teammates whose calendars you've ticked, kept in this browser. */
const SHOWN_KEY = "tinyfloor:calendar-shown";
/** Narrower than this, the week is a day at a time. */
const WIDE = 900;

function readShown(): string[] {
  try {
    const kept = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]");
    return Array.isArray(kept) ? kept.filter((one) => typeof one === "string") : [];
  } catch {
    return [];
  }
}

/** The first day of the week where you are (Sunday in the US, Monday in most places), from the language's own week. */
function firstDay(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } });
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 1;
    return first % 7;
  } catch {
    return 1;
  }
}

function useWide() {
  return useSyncExternalStore(
    (change) => (addEventListener("resize", change), () => removeEventListener("resize", change)),
    () => innerWidth >= WIDE,
    () => true,
  );
}

/**
 * The Calendar page, on the rail, laid out the way people know a calendar:
 * what's coming up and whose calendars are on it down the side, and the week
 * (a day, on a phone) as a grid with now marked. Your meetings open their
 * details and the way in; teammates you tick show over yours in their colour;
 * an empty half hour (or Schedule) puts a meeting here on everyone's calendar.
 */
export function CalendarPage() {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const place = usePlace();
  const { user } = useAuth();
  const { office, overview } = useOffice();
  const { status, info, events: soon } = useCalendar();
  const now = useNow();
  const wide = useWide();
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<string[]>(readShown);
  const [open, setOpen] = useState<{ event: CalendarEvent; at: { x: number; y: number } } | null>(null);
  useEffect(() => void readCalendar(), []);

  // The days on screen: the week (from its first day) on a wide screen, a day on a phone; moved a week or a day at a time.
  const today = dayStart(0, now);
  const weekStart = today - ((new Date(today).getDay() - firstDay(locale) + 7) % 7) * DAY;
  const days = wide
    ? Array.from({ length: 7 }, (_, i) => dayStart(0, weekStart + (offset * 7 + i) * DAY + DAY / 2))
    : [dayStart(offset, now)];
  const from = days[0];
  const to = dayStart(1, days[days.length - 1]);
  const connected = status === "on";
  const mine = useMyWeek(connected, from, to) ?? [];
  const { team } = useTeamWeek(office.id, from, to);

  const members = overview.members;
  const you = members.find((one) => one.id === user?.id);
  const withCalendar = new Set((team ?? []).map((one) => one.id));
  const teammates = members.filter((one) => one.id !== user?.id && withCalendar.has(one.id));
  const quiet = team ? members.filter((one) => one.id !== user?.id && !withCalendar.has(one.id)) : [];
  const colorOf = (id: string) => COLORS[Math.max(0, members.findIndex((one) => one.id === id)) % COLORS.length];
  const overlays: Overlay[] = (team ?? [])
    .filter((one) => shown.includes(one.id) && one.id !== user?.id)
    .map((one) => ({ id: one.id, name: members.find((member) => member.id === one.id)?.displayName ?? "", color: colorOf(one.id), blocks: one.blocks }));

  const toggle = (id: string) => {
    const next = shown.includes(id) ? shown.filter((one) => one !== id) : [...shown, id];
    setShown(next);
    try {
      localStorage.setItem(SHOWN_KEY, JSON.stringify(next));
    } catch {
      // Not kept: it's still shown for now.
    }
  };
  // A meeting here, on Google Calendar's own new-event page: at a time picked on the grid, with the teammates on the week as guests.
  const schedule = (start?: number) => {
    const guests = members.filter((one) => overlays.some((overlay) => overlay.id === one.id) && one.email).map((one) => one.email!);
    window.open(
      scheduleLink(place.paths.meetings, t("inviteTitle", { office: place.name }), t("inviteBody"), start ? { start, end: start + 30 * 60_000, guests } : undefined),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const month = new Intl.DateTimeFormat(locale, wide ? { month: "long", year: "numeric" } : { weekday: "long", day: "numeric", month: "long" }).format(wide ? days[3] : days[0]);
  const showingNow = now >= from && now < to;

  return (
    <div className="absolute inset-0 z-[60] flex bg-card">
      {wide && (
        <aside className="flex w-72 shrink-0 flex-col border-e border-border">
          <Sidebar
            connected={connected}
            off={status === "off"}
            email={info?.email ?? null}
            events={soon}
            now={now}
            you={you}
            myColor={MINE}
            teammates={teammates}
            quiet={quiet}
            shown={shown}
            colorOf={colorOf}
            onToggle={toggle}
            onOpen={(event, at) => setOpen({ event, at })}
            settingsHref={place.paths.settings}
          />
        </aside>
      )}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          {!wide && <h1 className="me-2 text-[18px] font-semibold tracking-tight text-foreground">{t("title")}</h1>}
          <button
            type="button"
            disabled={showingNow && offset === 0}
            onClick={() => setOffset(0)}
            className="h-8 cursor-pointer rounded-full border border-border px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50"
          >
            {t("today")}
          </button>
          <button type="button" aria-label={t(wide ? "previousWeek" : "previousDay")} onClick={() => setOffset((was) => was - 1)} className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button type="button" aria-label={t(wide ? "nextWeek" : "nextDay")} onClick={() => setOffset((was) => was + 1)} className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
          <p className="ms-1 text-[15px] font-semibold text-foreground">{month}</p>
          <button
            type="button"
            onClick={() => schedule()}
            className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            {t("schedule")}
          </button>
        </header>
        {/* Not connected, with teammates on the week: on a phone, Google Calendar as a row above it (the sidebar has it otherwise). */}
        {!wide && status === "off" && overlays.length > 0 && <ConnectRow className="mx-3 mb-2 rounded-xl border border-border px-1" />}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <WeekGrid days={days} now={now} events={mine} color={MINE} overlays={overlays} onOpen={(event, at) => setOpen({ event, at })} onSchedule={schedule} />
          {/* Not connected and nothing on the week: the way to connect, in its middle. */}
          {status === "off" && overlays.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center p-4">
              <ConnectCard />
            </div>
          )}
        </div>
      </main>
      {open && <EventDetails event={open.event} at={open.at} now={now} onClose={() => setOpen(null)} />}
    </div>
  );
}
