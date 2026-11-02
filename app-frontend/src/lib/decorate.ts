import { useSyncExternalStore } from "react";
import type { ClientMessage } from "@shared/messages";
import { FLOOR } from "@shared/map";
import { canChange, deskOfSeat, spotKey, type PieceChange } from "@shared/office";
import { deskOf, deskState } from "./desks";
import { applyPieceChange, pieceChanges } from "./pieces";
import { track } from "@/lib/analytics";

/**
 * Decorating your desk (docs/customization.md): a desk is its spots, its
 * chair and its wood, and you change one part at a time. The panel at the
 * floor's edge (DeskPanel) shows the parts and what each can be; the floor
 * (DeskDecorator) brings the desk into view and picks a part where it's
 * pressed. Everything you do shows at once and goes to the room, which says
 * yes (and tells everyone) or sends the office's pieces back.
 */
interface DecorateState {
  /** The desk being decorated: yours, while decorating. */
  desk: string | null;
  /** The part picked: a spot's key, the chair's or the desk's own. */
  part: string | null;
  undo: number;
  redo: number;
}

/** One change, as it was and as it became, for undoing and redoing. */
interface Step {
  key: string;
  before: PieceChange | null;
  after: PieceChange | null;
}

let state: DecorateState = { desk: null, part: null, undo: 0, redo: 0 };
const listeners = new Set<() => void>();
let send: ((message: ClientMessage) => void) | null = null;
let me: string | null = null;
let past: Step[] = [];
let ahead: Step[] = [];

function set(next: Partial<DecorateState>) {
  state = { ...state, ...next, undo: past.length, redo: ahead.length };
  listeners.forEach((listener) => listener());
}

export const decorateState = () => state;

export function subscribeDecorate(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDecorate(): DecorateState {
  return useSyncExternalStore(subscribeDecorate, decorateState, decorateState);
}

/** The floor's socket and who you are, while there's a floor. */
export function attachDecorate(sender: ((message: ClientMessage) => void) | null, userId: string | null) {
  send = sender;
  me = userId;
  if (!sender) close();
}

/** Your desk here, by its key, if you have one. */
export function myDesk(): string | null {
  const mine = me ? deskOf(deskState().desks, me) : undefined;
  return mine ? deskOfSeat(mine.seat) : null;
}

/** The part a desk opens on: the spot in front of whoever sits there, its widest. */
function firstPart(desk: string): string {
  const spots = FLOOR.desks[desk].spots;
  const widest = spots.reduce((best, spot) => (spot.x[1] - spot.x[0] > best.x[1] - best.x[0] ? spot : best), spots[0]);
  return widest ? spotKey(desk, widest.id) : FLOOR.desks[desk].chair.key;
}

export function openDecorate() {
  const desk = myDesk();
  if (!desk || state.desk === desk) return;
  past = [];
  ahead = [];
  track("desk_decorate_opened");
  set({ desk, part: firstPart(desk) });
}

export function close() {
  if (state.desk === null) return;
  past = [];
  ahead = [];
  set({ desk: null, part: null });
}

export const closeDecorate = close;

/** A part of the desk picked, from the panel or the floor. */
export const pickPart = (key: string) => state.desk && state.part !== key && set({ part: key });

// ---------- sending: no faster than the room takes them (a few a second) ----------

const SPACING_MS = 280;
const queue: ClientMessage[] = [];
let sending = false;

function enqueue(message: ClientMessage) {
  // A later change to the same piece replaces one still waiting: only how it ends up matters.
  if (message.t === "piece") {
    const waiting = queue.findIndex((one) => one.t === "piece" && one.key === message.key);
    if (waiting >= 0) queue.splice(waiting, 1);
  }
  queue.push(message);
  if (!sending) flush();
}

function flush() {
  const next = queue.shift();
  if (!next) {
    sending = false;
    return;
  }
  sending = true;
  send?.(next);
  setTimeout(flush, SPACING_MS);
}

// ---------- changing ----------

/** What the floor has in a piece's place, before anyone changed it. */
const floorItem = (key: string) => FLOOR.pieces.find((piece) => piece.key === key)?.item ?? null;

/** Makes a change: shows it, remembers it for undo (unless it's an undo itself), sends it. False when it isn't allowed. */
function change(key: string, after: PieceChange | null, remember = true): boolean {
  const desk = state.desk;
  const changes = pieceChanges();
  if (!desk || !canChange(key, after, desk, changes)) return false;
  const before = changes[key] ?? null;
  if (JSON.stringify(before) === JSON.stringify(after)) return true;
  if (remember) {
    past.push({ key, before, after });
    ahead = [];
  }
  applyPieceChange(key, after);
  enqueue({ t: "piece", key, change: after });
  set({});
  return true;
}

/**
 * A part as this: a spot's thing (null, the spot emptied), the chair, the
 * desk's wood. Kept as the change from the floor's own, so picking what the
 * floor has there is no change at all.
 */
export function setPart(key: string, item: string | null): boolean {
  const own = floorItem(key);
  const next: PieceChange | null = item === own ? null : item === null ? { hidden: true } : { item };
  const done = change(key, next);
  if (done) track("desk_part_set", { item: item ?? "none" });
  return done;
}

export function undo() {
  const step = past.pop();
  if (!step) return;
  if (change(step.key, step.before, false)) ahead.push(step);
  set({ part: step.key });
}

export function redo() {
  const step = ahead.pop();
  if (!step) return;
  if (change(step.key, step.after, false)) past.push(step);
  set({ part: step.key });
}

/** Everything on your desk, its chair and its wood back as the floor has them. */
export function resetDesk() {
  const desk = state.desk;
  if (!desk) return;
  const changes = { ...pieceChanges() };
  const body = FLOOR.desks[desk].body?.key;
  for (const key of Object.keys(changes)) {
    if (key.startsWith(`${desk}/`) || key === body) applyPieceChange(key, null);
  }
  past = [];
  ahead = [];
  queue.length = 0;
  enqueue({ t: "desk_reset" });
  track("desk_reset");
  set({});
}
