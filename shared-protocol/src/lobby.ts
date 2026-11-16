import { deskSeats } from "./map";
import type { Desk } from "./messages";

/** Tickets for the public lobby name this room; the realtime Worker picks the copy. */
export const LOBBY_ROOM = "lobby";
export const LOBBY_COPY_CAPACITY = 20;

/**
 * The demo office's desks are for trying, by people who come and go: a desk
 * is yours while you're on its floor, and a change to it goes back to the
 * floor's own this long after it was made, one change at a time.
 */
export const LOBBY_PIECE_MS = 5 * 60_000;
/** A desk in the demo office held this long can be claimed by whoever sits at it, once no desk is free. */
export const LOBBY_DESK_HOLD_MS = 5 * 60_000;

/** Whether someone else's desk in the demo office is theirs to claim now: every desk taken, and this one held long enough. */
export function lobbyDeskOpen(desk: Desk, desks: readonly Desk[], now: number): boolean {
  if (now - (desk.since ?? now) < LOBBY_DESK_HOLD_MS) return false;
  const claimed = new Set(desks.map((one) => one.seat));
  return deskSeats().every((seat) => claimed.has(seat));
}
