import type { RoomTicket } from "@/lib/api";
import { CHARACTERS } from "@shared/profile";

/** What the floor's scene loads (MapManager, AnimationManager), each file once. */
export const FLOOR_FILES = {
  map: "/tilesets/office-map.tmj",
  roomBuilder: "/tilesets/textures/Room_Builder_Office_32x32.png",
  modernOffice: "/tilesets/textures/Modern_Office_Black_Shadow_32x32.png",
  chairs: "/tilesets/items/chair.png",
  character: (name: string) => `/characters/${name}.png`,
};

let warming = false;

/**
 * Starts what the floor needs while the page before it is still showing (the
 * lobby's door, an office being read): its code, and the map and sprites,
 * which the scene then finds in the browser's cache (public/_headers). Without
 * it each waited for the one before: code, then files, then the ticket.
 */
export function warmFloor() {
  if (warming || typeof window === "undefined") return;
  warming = true;
  void import("@/components/PhaserGame").catch(() => (warming = false));
  const files = [FLOOR_FILES.map, FLOOR_FILES.roomBuilder, FLOOR_FILES.modernOffice, FLOOR_FILES.chairs, ...CHARACTERS.map(FLOOR_FILES.character)];
  for (const file of files) void fetch(file).catch(() => {});
}

/** A ticket is good for a minute (shared-protocol/src/ticket.ts); one older than this is asked for again. */
const EARLY_TICKET_FRESH_MS = 40_000;

/**
 * A room ticket asked for as soon as it can be, rather than once the scene is
 * built: the first connection uses it while it's fresh, every later one (a
 * reconnect) asks again.
 */
export function earlyTicket(ask: () => Promise<RoomTicket>) {
  let early: { at: number; ticket: Promise<RoomTicket> } | null = null;
  let used = false;
  return {
    start() {
      if (early || used) return;
      early = { at: Date.now(), ticket: ask() };
      early.ticket.catch(() => {});
    },
    ticketFor(): Promise<RoomTicket> {
      const kept = early;
      early = null;
      used = true;
      if (!kept || Date.now() - kept.at > EARLY_TICKET_FRESH_MS) return ask();
      return kept.ticket.catch(() => ask());
    },
  };
}
