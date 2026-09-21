import { LOBBY_COPY_CAPACITY } from "../../shared-protocol/src";

/** The most copies the lobby opens; past this, the last one turns people away as full. */
const MAX_COPIES = 50;

export function lobbyCopy(number: number): string {
  return `lobby-${number}`;
}

/** The copy number for a room name like "lobby-3", or null for any other room. */
export function lobbyCopyNumber(room: string): number | null {
  const match = /^lobby-([1-9]\d{0,3})$/.exec(room);
  return match ? Number(match[1]) : null;
}

/**
 * The lowest-numbered lobby copy with space. Each room knows its own head
 * count, so this asks lobby-1, then lobby-2, until one has room — normally one
 * call. Two visitors arriving together can both land in a copy with one space
 * left; the room turns the second away as full, and trying again lands them in
 * the next copy.
 */
export async function placeInLobby(env: Env): Promise<string> {
  for (let number = 1; number < MAX_COPIES; number++) {
    const copy = lobbyCopy(number);
    if ((await env.ROOM.getByName(copy).presenceCount()) < LOBBY_COPY_CAPACITY) return copy;
  }
  return lobbyCopy(MAX_COPIES);
}
