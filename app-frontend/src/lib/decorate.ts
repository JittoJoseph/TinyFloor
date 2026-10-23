import { useSyncExternalStore } from "react";
import type { ClientMessage } from "@shared/messages";
import { FLOOR } from "@shared/map";
import { addedKey, canChange, deskOfSeat, officePieces, placeOn, thingsOn, type PieceChange } from "@shared/office";
import { deskOf, deskState } from "./desks";
import { applyPieceChange, pieceChanges } from "./pieces";
import { track } from "@/lib/analytics";

/**
 * Decorating your desk (docs/customization.md): your card (YouCard) grows into
 * what can stand on the desk and the chairs it can have, and the floor brings
 * the desk into view beside it. Everything you do shows at once and goes to
 * the room, which says yes (and tells everyone) or sends the office's pieces
 * back. The floor (DeskDecorator) picks things up, moves them and takes what's
 * carried in from the card; the card (DeskCustomizer) adds, swaps and
 * carries; both go through here.
 */
interface DecorateState {
  /** The desk being decorated: yours, while decorating. */
  desk: string | null;
  /** The piece picked on the desk: a thing on it, or its chair. */
  selected: string | null;
  /** Where the picked piece's buttons go on screen (page pixels, its top middle), while one is picked. */
  anchor: { x: number; y: number } | null;
  /** A thing being carried in from the card, until it's dropped on the desk or let go of. */
  carrying: string | null;
  undo: number;
  redo: number;
}

/** One change, as it was and as it became, for undoing and redoing. */
interface Step {
  key: string;
  before: PieceChange | null;
  after: PieceChange | null;
}

let state: DecorateState = { desk: null, selected: null, anchor: null, carrying: null, undo: 0, redo: 0 };
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

export function openDecorate() {
  const desk = myDesk();
  if (!desk || state.desk === desk) return;
  past = [];
  ahead = [];
  track("desk_decorate_opened");
  set({ desk, selected: null, anchor: null, carrying: null });
}

export function close() {
  if (state.desk === null) return;
  past = [];
  ahead = [];
  set({ desk: null, selected: null, anchor: null, carrying: null });
}

export const closeDecorate = close;

export const select = (key: string | null) => state.selected !== key && set({ selected: key, anchor: key ? state.anchor : null });

const samePoint = (a: { x: number; y: number } | null, b: { x: number; y: number } | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5);

/** The floor says where the picked piece's buttons go. */
export function setAnchor(anchor: { x: number; y: number } | null) {
  if (!samePoint(state.anchor, anchor)) set({ anchor });
}

/** A thing picked up from the card, to be carried onto the desk. */
export const startCarry = (item: string) => state.desk && set({ carrying: item, selected: null });
export const endCarry = () => state.carrying && set({ carrying: null });

// ---------- sending: no faster than the room takes them (a few a second) ----------

const SPACING_MS = 280;
const queue: ClientMessage[] = [];
let sending = false;

function enqueue(message: ClientMessage) {
  // A later change to the same piece replaces one still waiting: only where it ends up matters.
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

/** A piece as the floor has it, before anyone changed it. */
const floorPiece = (key: string) => FLOOR.pieces.find((piece) => piece.key === key);

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

/** A thing's change once it's here, with this item: nothing at all when that's how the floor has it. */
function thingChange(key: string, item: string, at: [number, number]): PieceChange | null {
  const piece = floorPiece(key);
  if (!piece) return { item, at };
  const same = piece.item === item && piece.x === at[0] && piece.y === at[1];
  if (same) return null;
  return { ...(piece.item === item ? {} : { item }), ...(piece.x === at[0] && piece.y === at[1] ? {} : { at }) };
}

/** A thing's pixels where it stands: [left, top, right, bottom] on the floor. */
function artBox(item: string, x: number, y: number): [number, number, number, number] {
  const [left, top, right, bottom] = FLOOR.things[item]?.art ?? [0, 0, 32, 32];
  return [x + left, y + top, x + right, y + bottom];
}

/**
 * Where a thing could go on the desk: the first spot along it, from the
 * left, where its pixels don't stand on another thing's; at the back of a near
 * desk first, then at its front; failing that, the first spot it fits at all.
 */
export function spotFor(item: string, except?: string): [number, number] | null {
  const desk = state.desk;
  if (!desk || !FLOOR.things[item]) return null;
  const spec = FLOOR.desks[desk];
  const others = thingsOn(desk, pieceChanges())
    .filter((piece) => piece.key !== except)
    .map((piece) => artBox(piece.item, piece.x, piece.y));
  const [left, , right] = FLOOR.things[item].art;
  const width = right - left;
  const feet = spec.side === "front" ? [spec.feet[0] + 8, spec.feet[1] - 2] : [spec.feet[1] - 2];
  let any: [number, number] | null = null;
  for (const foot of feet) {
    for (let middle = spec.along[0] + width / 2; middle <= spec.along[1] - width / 2; middle += 8) {
      const at = placeOn(desk, item, middle, foot);
      if (!at) continue;
      any ??= at;
      const [x0, y0, x1, y1] = artBox(item, ...at);
      if (!others.some(([a0, b0, a1, b1]) => x0 < a1 && x1 > a0 && y0 < b1 && y1 > b0)) return at;
    }
  }
  return any;
}

/** Puts a new thing on your desk, where it's dropped or else where there's room, and picks it. */
export function addThing(item: string, dropped?: [number, number]): boolean {
  const desk = state.desk;
  const at = dropped ?? spotFor(item);
  if (!desk || !at) return false;
  const key = addedKey(desk);
  if (!change(key, { item, at })) return false;
  track("desk_thing_added", { item });
  set({ selected: key });
  return true;
}

/** The picked thing swapped for another, where it stands if it fits there, otherwise where there's room. */
export function swapThing(key: string, item: string): boolean {
  const now = officePieces(pieceChanges()).find((piece) => piece.key === key);
  if (!now || !state.desk) return false;
  // Standing where the old one stood: the same middle, the same foot.
  const [left, , right, bottom] = FLOOR.things[now.item]?.art ?? [0, 0, 32, 32];
  const at = placeOn(state.desk, item, now.x + (left + right) / 2, now.y + bottom) ?? spotFor(item, key);
  return !!at && change(key, thingChange(key, item, at));
}

/** A thing moved along the desk (the floor, dropping it). */
export function moveThing(key: string, at: [number, number]): boolean {
  const now = officePieces(pieceChanges()).find((piece) => piece.key === key);
  return !!now && change(key, thingChange(key, now.item, at));
}

/** A thing taken off the desk: one it came with is hidden, one you added is gone. */
export function removeThing(key: string): boolean {
  const done = change(key, floorPiece(key) ? { hidden: true } : null);
  if (done) set({ selected: null });
  return done;
}

/** Your desk's chair, another of the chairs for its side. */
export function setChair(item: string): boolean {
  const desk = state.desk;
  if (!desk) return false;
  const spec = FLOOR.desks[desk];
  return change(spec.chair.key, item === spec.chair.item ? null : { item });
}

export function undo() {
  const step = past.pop();
  if (!step) return;
  if (change(step.key, step.before, false)) ahead.push(step);
  set({ selected: null });
}

export function redo() {
  const step = ahead.pop();
  if (!step) return;
  if (change(step.key, step.after, false)) past.push(step);
  set({ selected: null });
}

/** Everything on your desk, and its chair, back as the floor has them. */
export function resetDesk() {
  const desk = state.desk;
  if (!desk) return;
  const changes = { ...pieceChanges() };
  for (const key of Object.keys(changes)) {
    if (key.startsWith(`${desk}/`)) applyPieceChange(key, null);
  }
  past = [];
  ahead = [];
  queue.length = 0;
  enqueue({ t: "desk_reset" });
  track("desk_reset");
  set({ selected: null });
}
