import { api, type OfficeOverview } from "@/lib/api";
import { earlyTicket, warmFloor } from "@/lib/floorWarmup";

type Ahead = { officeId: string; at: number; overview: Promise<OfficeOverview>; ticket: ReturnType<typeof earlyTicket> };

let ahead: Ahead | null = null;

/** How long what was asked for ahead is still worth using rather than asking again. */
const FRESH_MS = 30_000;

/**
 * Opening the app, the office you were last in is asked for before its page
 * has even loaded: the office, a ticket to its floor, and the floor's code
 * and files, all at once. Its page (OfficeShell) takes them up when it opens.
 */
export function openOfficeAhead(officeId: string) {
  if (ahead?.officeId === officeId && Date.now() - ahead.at < FRESH_MS) return;
  const overview = api.overview(officeId);
  overview.catch(() => {});
  const ticket = earlyTicket(() => api.officeTicket(officeId));
  ticket.start();
  warmFloor();
  ahead = { officeId, at: Date.now(), overview, ticket };
}

/** What was asked for ahead for this office, while it's fresh. */
export function officeAhead(officeId: string): Ahead | null {
  return ahead && ahead.officeId === officeId && Date.now() - ahead.at < FRESH_MS ? ahead : null;
}

/** Taken up by the office's page: anything later asks afresh. */
export function clearOfficeAhead() {
  ahead = null;
}
