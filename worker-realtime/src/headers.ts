import type { RoomTicket } from "../../shared-protocol/src";
/** Headers the Worker sets after checking a ticket. The room trusts them, so clients' copies are overwritten. */
export const TICKET_HEADER = "X-TinyFloor-Ticket";

/**
 * The verified ticket, handed to the object in a header. Names and status notes
 * can be in any script or carry emoji, and a header has to be plain ASCII, so
 * it travels percent-encoded.
 */
export function writeTicket(ticket: RoomTicket): string {
  return encodeURIComponent(JSON.stringify(ticket));
}

export function readTicket(value: string | null): RoomTicket | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as RoomTicket;
  } catch {
    return null;
  }
}
export const ROOM_HEADER = "X-TinyFloor-Room";
export const SPAWN_HEADER = "X-TinyFloor-Spawn";
/** Where the visitor is, as URI-encoded JSON (city names are not always ASCII). */
export const WHERE_HEADER = "X-TinyFloor-Where";
