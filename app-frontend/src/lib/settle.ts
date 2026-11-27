import { useSyncExternalStore } from "react";
import { track } from "web-shared/lib/analytics";

/**
 * Settling in (docs/product.md): the few things that make an office feel like
 * yours, tried one at a time, each pointed at where it's done (SettleIn) rather
 * than explained up front. A step is done however it gets done, from the
 * pointer or not, and is never pointed at again; one waved away is left alone.
 *
 * What's done is kept in this browser, per person: walking, your look and
 * saying hi are yours wherever you are, a desk and inviting your team are
 * per office (a desk here isn't a desk there).
 */
export type SettleStep = "move" | "look" | "desk" | "decorate" | "hello" | "invite" | "calendar";

/** Steps that belong to an office, not to you. */
const PER_OFFICE: ReadonlySet<SettleStep> = new Set(["desk", "decorate", "invite"]);
/** How long after the first pointer they keep coming: settling in is for the first days, not a fixture. */
const SETTLING_FOR = 14 * 24 * 60 * 60_000;

interface Kept {
  /** When the first pointer showed. */
  started: number;
  done: string[];
  skipped: string[];
}

let who: string | null = null;
let place = "demo";
let kept: Kept = { started: 0, done: [], skipped: [] };
const listeners = new Set<() => void>();
let version = 0;

const storageKey = (id: string) => `tf:settle:${id}`;
const idOf = (step: SettleStep) => (PER_OFFICE.has(step) ? `${step}@${place}` : step);

function load(id: string): Kept {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(id)) ?? "null") as Partial<Kept> | null;
    return { started: saved?.started ?? 0, done: saved?.done ?? [], skipped: saved?.skipped ?? [] };
  } catch {
    return { started: 0, done: [], skipped: [] };
  }
}

function save() {
  if (!who) return;
  try {
    localStorage.setItem(storageKey(who), JSON.stringify(kept));
  } catch {
    // Private browsing: kept for this visit only.
  }
}

function changed() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Who's settling in, and where: a person's office, or the demo office ("demo"). */
export function settleAs(userId: string | null, where: string) {
  if (userId === who && where === place) return;
  who = userId;
  place = where;
  kept = userId ? load(userId) : { started: 0, done: [], skipped: [] };
  changed();
}

/** Something was done, however it was: never pointed at again. */
export function did(step: SettleStep) {
  if (!who) return;
  const id = idOf(step);
  if (kept.done.includes(id)) return;
  kept = { ...kept, done: [...kept.done, id] };
  save();
  track("settle_done", { step });
  changed();
}

/** Waved away: left alone from now on. */
export function skip(step: SettleStep) {
  if (!who) return;
  const id = idOf(step);
  if (kept.skipped.includes(id)) return;
  kept = { ...kept, skipped: [...kept.skipped, id] };
  save();
  track("settle_skipped", { step });
  changed();
}

/** The first pointer showed: the days of settling in start counting. */
export function startSettling() {
  if (!who || kept.started) return;
  kept = { ...kept, started: Date.now() };
  save();
}

export const isDone = (step: SettleStep) => kept.done.includes(idOf(step));
export const isSkipped = (step: SettleStep) => kept.skipped.includes(idOf(step));
/** Still settling in: it hasn't started yet, or started within the last couple of weeks. */
export const stillSettling = () => !kept.started || Date.now() - kept.started < SETTLING_FOR;

export function useSettle(): number {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => void listeners.delete(listener)),
    () => version,
    () => 0,
  );
}

/** The floor's spot to walk to (WalkSpot), while there's a floor: shown while walking is the next thing to try. */
export interface FloorSpot {
  show(on: boolean): void;
  where(): { x: number; y: number; size: number; youLeft: boolean } | null;
}
let floorSpot: FloorSpot | null = null;
export const setFloorSpot = (spot: FloorSpot | null) => {
  floorSpot = spot;
};
export const getFloorSpot = () => floorSpot;

/** Something was just done while it was pointed at: the floor answers (your character bobs, GameScene). */
export const SETTLE_CHEER_EVENT = "settleCheer";
export const cheer = () => window.dispatchEvent(new Event(SETTLE_CHEER_EVENT));

