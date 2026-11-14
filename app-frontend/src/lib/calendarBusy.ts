import type { CalendarBusy } from "shared-protocol/messages";
import type { CalendarEvent } from "web-shared/lib/api";

// Whether you're in a meeting, from your calendar's events (lib/calendar): on its own, so it can be tested.

/** An event that holds your time, at a time: a busy one with a start and an end, that you haven't marked free. */
export const holds = (event: CalendarEvent) => event.busy && !event.allDay;

/**
 * Whether you're in a meeting right now, and until when: the event on now,
 * run on through any that start as it ends (back to back is one stretch of
 * busy). Its title only if you show titles and it isn't private; a call if
 * it's somewhere else online.
 */
export function busyAt(events: CalendarEvent[], showTitles: boolean, now = Date.now()): CalendarBusy | null {
  const on = events.filter((event) => holds(event) && event.start <= now && event.end > now).sort((a, b) => b.end - a.end)[0];
  if (!on) return null;
  let until = on.end;
  for (const next of [...events].filter(holds).sort((a, b) => a.start - b.start)) if (next.start <= until && next.end > until) until = next.end;
  const title = showTitles && !on.private ? on.title.trim() : "";
  return { until, ...(title ? { title } : {}), ...(on.link && !isOurs(on.link) ? { call: true } : {}) };
}

/** A link to a TinyFloor meeting (Add to Google Calendar puts one in), rather than a call somewhere else. */
export function isOurs(link: string, here = globalThis.location?.hostname): boolean {
  try {
    const { hostname, pathname } = new URL(link);
    return (hostname === here || hostname === "tinyfloor.com" || hostname.endsWith(".tinyfloor.com")) && /\/office\/[^/]+\/meetings/.test(pathname);
  } catch {
    return false;
  }
}

