/** Headers the Worker sets after checking a ticket. The room trusts them, so clients' copies are overwritten. */
export const TICKET_HEADER = "X-TinyFloor-Ticket";
export const ROOM_HEADER = "X-TinyFloor-Room";
export const SPAWN_HEADER = "X-TinyFloor-Spawn";
/** Where the visitor is, as URI-encoded JSON (city names are not always ASCII). */
export const WHERE_HEADER = "X-TinyFloor-Where";
