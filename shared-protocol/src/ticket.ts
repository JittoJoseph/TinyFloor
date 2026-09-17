export type RoomRole = "owner" | "admin" | "member" | "guest";

/**
 * What the API vouches for when it lets someone into a room. Signed with
 * TICKET_SECRET, valid for a minute, and checked by the realtime Worker without
 * touching the database.
 */
export interface RoomTicket {
  v: 1;
  room: string;
  sub: string;
  name: string;
  character: string;
  role: RoomRole;
  cap: number;
  exp: number;
}
