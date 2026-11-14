import { useSyncExternalStore } from "react";
import type { CalendarBusy } from "shared-protocol/messages";
import { api, ApiError, type CalendarEvent, type CalendarInfo } from "web-shared/lib/api";
import { busyAt, holds } from "./calendarBusy";

export { isOurs } from "./calendarBusy";

/**
 * Your Google Calendar, on your own page (Settings connects it; worker-api
 * calendar.ts reads it): today's events, read again every few minutes while
 * the page is open, and from them whether you're in a meeting right now,
 * which the floor tells everyone (CalendarBusy) and shows as your note while
 * you haven't written one. Nobody else's page reads your calendar.
 */

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

/** Today where you are, and a few hours of tomorrow: what the Meetings page lists, and enough to know what's next tonight. */
function today(now = Date.now()): [number, number] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return [start.getTime(), start.getTime() + 28 * 60 * 60_000];
}

/** Reads your calendar again: whether it's connected, and today's events. */
export async function readCalendar(): Promise<void> {
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
