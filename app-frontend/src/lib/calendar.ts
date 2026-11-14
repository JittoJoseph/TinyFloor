import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CalendarBusy } from "shared-protocol/messages";
import { api, ApiError, type BusyBlock, type CalendarEvent, type CalendarInfo } from "web-shared/lib/api";
import { busyAt, holds, isOurs } from "./calendarBusy";

export { isOurs } from "./calendarBusy";

/**
 * Your Google Calendar, on your own page (Settings connects it; worker-api
 * calendar.ts reads it): today's events, read again every few minutes while
 * the page is open, and from them whether you're in a meeting right now,
 * which the floor tells everyone (CalendarBusy) and shows as your note while
 * you haven't written one. Nobody else's page reads your calendar.
 */

/**
 * Google Calendar's own OAuth client: a Google Cloud project of its own
 * (TinyFloor Calendar), never sign-in's, since a sensitive scope on sign-in's
 * consent screen made Google show sign-in as unverified. Where it isn't set
 * (production, until Google has verified the calendar's access), there's no
 * calendar: no Calendar page, nothing in Settings, nothing read.
 */
export const CALENDAR_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
export const calendarAvailable = Boolean(CALENDAR_CLIENT_ID);
/** What connecting asks Google for: who you are (to show which account), and your calendar's events, read-only. */
export const CALENDAR_SCOPE = "openid email https://www.googleapis.com/auth/calendar.events.readonly";

/** How often your events are read again; a meeting added or moved shows within this. */
const EVERY_MS = 5 * 60_000;
/** Busy changes at an event's start or end; checked again then, plus this, so the clock has passed it. */
const AFTER_MS = 500;
export const CALENDAR_BUSY_EVENT = "tinyfloor:calendar-busy";

type State = { status: "unknown" | "off" | "on"; info: CalendarInfo | null; events: CalendarEvent[] };

let state: State = { status: "unknown", info: null, events: [] };
let busy: CalendarBusy | null = null;
const listeners = new Set<() => void>();
let syncing = 0;
let poll: ReturnType<typeof setInterval> | undefined;
let boundary: ReturnType<typeof setTimeout> | undefined;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  recount();
}

/** How many days of your own calendar are read: today and the six after it, what the Calendar page can show. */
export const DAYS_AHEAD = 7;

/** Midnight where you are, a number of days from today's. */
export function dayStart(offset = 0, now = Date.now()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  return start.getTime();
}

/** Today and the days after it where you are: what the Calendar page shows. */
function today(now = Date.now()): [number, number] {
  return [dayStart(0, now), dayStart(DAYS_AHEAD, now)];
}

/** Reads your calendar again: whether it's connected, and today's events. */
export async function readCalendar(): Promise<void> {
  if (!calendarAvailable) return set({ status: "off", info: null, events: [] });
  try {
    const { calendar } = await api.calendar(...today());
    set(calendar ? { status: "on", info: calendar, events: calendar.events ?? [] } : { status: "off", info: null, events: [] });
  } catch (error) {
    // A guest has no calendar; anything else (offline, Google slow) keeps what we had until next time.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) set({ status: "off", info: null, events: [] });
  }
}

/** Connected, with the code from Google's popup: read straight away. */
export async function connectCalendar(code: string): Promise<void> {
  const { calendar } = await api.connectCalendar(code);
  set({ status: "on", info: calendar });
  await readCalendar();
}

export async function disconnectCalendar(): Promise<void> {
  await api.disconnectCalendar();
  set({ status: "off", info: null, events: [] });
}

export async function showCalendarTitles(show: boolean): Promise<void> {
  const before = state.info;
  if (before) set({ info: { ...before, showTitles: show } });
  try {
    await api.showCalendarTitles(show);
  } catch (error) {
    if (before) set({ info: before });
    throw error;
  }
}

/**
 * Keeps your calendar read while something needs it (the floor, the Meetings
 * page): now, then every few minutes, and when the page comes back into view.
 * Returns how to stop; it stops when the last one does.
 */
export function syncCalendar(): () => void {
  if (!calendarAvailable) return () => {};
  if (syncing++ === 0) {
    void readCalendar();
    poll = setInterval(() => document.visibilityState === "visible" && void readCalendar(), EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    if (--syncing > 0) return;
    clearInterval(poll);
    clearTimeout(boundary);
    document.removeEventListener("visibilitychange", onVisible);
    // Out of the office (the demo office, say), nobody is told about your meetings.
    tell(null);
  };
}

function onVisible() {
  if (document.visibilityState === "visible") void readCalendar();
}

/** Your calendar as it stands, for a page. */
export function useCalendar(): State {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => void listeners.delete(listener)),
    () => state,
    () => state,
  );
}

/** Whether you're in a meeting now, as the floor is told it (MessageHandler sends it on arriving). */
export const myCalendarBusy = (): CalendarBusy | null => (busy && busy.until > Date.now() ? busy : null);

/** The floor told when whether you're in a meeting changes. */
function tell(next: CalendarBusy | null) {
  if (JSON.stringify(next) === JSON.stringify(busy)) return;
  busy = next;
  window.dispatchEvent(new CustomEvent<CalendarBusy | null>(CALENDAR_BUSY_EVENT, { detail: busy }));
}

/** Busy worked out again, the floor told when it changes, and checked again at the next start or end. */
function recount() {
  clearTimeout(boundary);
  const now = Date.now();
  tell(syncing && state.status === "on" ? busyAt(state.events, state.info?.showTitles ?? false, now) : null);
  const upcoming = state.events.filter(holds).flatMap((event) => [event.start, event.end]).filter((at) => at > now);
  if (upcoming.length && syncing) boundary = setTimeout(recount, Math.min(...upcoming) - now + AFTER_MS);
}

/** The time, a minute at a time (twice a minute, so it's never far behind): what's on now moves along by itself. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * Google Calendar's own new-event page, filled in: a meeting in this office,
 * its Meetings page as the place, so it lands on everyone's calendar with the
 * way in; at a time and with guests when they're known (a slot picked on the
 * team's day). Needs no access to anyone's calendar (Google's event template).
 */
export function scheduleLink(meetingsPath: string | undefined, title: string, body: string, at?: { start: number; end: number; guests?: string[] }): string {
  const link = new URL(meetingsPath ?? "/", location.origin).toString();
  const query = new URLSearchParams({ action: "TEMPLATE", text: title, location: link, details: `${body}\n${link}` });
  if (at) query.set("dates", `${googleTime(at.start)}/${googleTime(at.end)}`);
  if (at?.guests?.length) query.set("add", at.guests.join(","));
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** A time as Google's template wants it: UTC, to the second, no punctuation. */
const googleTime = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Where a meeting happens online, said the way people say it. */
export function placeOf(link: string): "tinyfloor" | "meet" | "zoom" | "teams" | "other" {
  if (isOurs(link)) return "tinyfloor";
  const host = (() => {
    try {
      return new URL(link).hostname;
    } catch {
      return "";
    }
  })();
  return host === "meet.google.com" ? "meet" : host.endsWith("zoom.us") ? "zoom" : host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com") ? "teams" : "other";
}

export type TeamCalendars = Array<{ id: string; timeZone: string | null; blocks: BusyBlock[] }>;

/**
 * Something the Calendar page reads for the week on screen, now and every few
 * minutes while it's open: the same as before while it's read again, so the
 * page doesn't blink; null until it's first read.
 */
function useWeekRead<T>(key: string | null, read: () => Promise<T>): { value: T | null; failed: boolean } {
  const [state, setState] = useState<{ key: string; value: T | null; failed: boolean }>({ key: "", value: null, failed: false });
  const reader = useRef(read);
  useEffect(() => {
    reader.current = read;
  });
  useEffect(() => {
    if (!key) return;
    let live = true;
    const load = () =>
      reader.current().then(
        (value) => live && setState({ key, value, failed: false }),
        () => live && setState((was) => ({ ...was, key, failed: true })),
      );
    void load();
    const poll = setInterval(() => document.visibilityState === "visible" && void load(), EVERY_MS);
    return () => {
      live = false;
      clearInterval(poll);
    };
  }, [key]);
  return state.key === key ? { value: state.value, failed: state.failed } : { value: null, failed: false };
}

/** Your own events in a week: all of them, titles and links (only your page ever sees these). */
export function useMyWeek(connected: boolean, from: number, to: number) {
  const { value } = useWeekRead(connected ? `me:${from}` : null, () => api.calendar(from, to).then(({ calendar }) => calendar?.events ?? []));
  return value;
}

/** The team's calendars in a week: when each of the office's people with one connected is busy, out or focusing. */
export function useTeamWeek(officeId: string, from: number, to: number) {
  const { value, failed } = useWeekRead(`${officeId}:${from}`, () => api.teamCalendar(officeId, from, to).then(({ people }) => people));
  return { team: value, failed };
}
