import type { RoomTicket } from "@/lib/api";

/** As long as a ticket asked for ahead is used (floorWarmup's earlyTicket): it's good for a minute. */
const FRESH_MS = 40_000;

let handed: { at: number; ticket: RoomTicket } | null = null;

/** A ticket that came with something else (a guest made at the demo office's door): the next floor to ask uses it. */
export function handTicket(ticket: RoomTicket) {
  handed = { at: Date.now(), ticket };
}

/** The ticket handed over, once, while it's fresh; null to ask for one. */
export function takeHandedTicket(): RoomTicket | null {
  const found = handed;
  handed = null;
  return found && Date.now() - found.at < FRESH_MS ? found.ticket : null;
}
