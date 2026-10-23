import type { RoomTicket } from "@/lib/api";
import { PRESETS, characterLayers } from "@shared/character";
import { floorWalls } from "./floorWalls";

/**
 * What the floor's scene loads (MapManager, AnimationManager), each file once:
 * the atlas of everything on the floor. Its walls are painted ahead
 * (lib/floorWalls), and characters are drawn from their own strips
 * (lib/characterSheet); the presets, a few kilobytes each, are fetched ahead.
 * The office itself (shared-protocol map.ts) comes with the code.
 */
export const FLOOR_FILES = {
  items: "/catalog/items.png",
};

let warming = false;

/**
 * Starts what the floor needs while the page before it is still showing (the
 * lobby's door, an office being read): its code, its walls painted, and its sprites,
 * which the scene then finds in the browser's cache (public/_headers). Without
 * it each waited for the one before: code, then files, then the ticket.
 */
export function warmFloor() {
  if (warming || typeof window === "undefined") return;
  warming = true;
  void import("@/components/PhaserGame").catch(() => (warming = false));
  void floorWalls().catch(() => {});
  const files = [FLOOR_FILES.items, ...PRESETS.flatMap(characterLayers)];
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
