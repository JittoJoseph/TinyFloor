import { useSyncExternalStore } from "react";
import type { ClientMessage } from "shared-protocol/messages";
import { FLOOR } from "shared-protocol/map";
import { canChange, deskOfSeat, fitsIn, officePieces, spotKey, type PieceChange } from "shared-protocol/office";
import { deskOf, deskState, findAFreeDesk, goToMyDesk, subscribeDesks } from "./desks";
import { applyPieceChange, pieceChanges, stopTrying, tryPieceChange } from "./pieces";
import { track } from "web-shared/lib/analytics";
import { did } from "./settle";

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

/** One change, as it was and as it became. */
interface Change {
  key: string;
  before: PieceChange | null;
  after: PieceChange | null;
}

/** What one undo takes back: a change, or several made at once (a surprise), and the part it was made to. */
interface Step {
  part: string;
  changes: Change[];
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
  if (!sender) {
    stopWaiting();
    close();
  }
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
  did("decorate");
  set({ desk, part: firstPart(desk) });
}

/** Customizing asked for away from your desk, waiting for you to sit down at it. */
let waiting: { stop: () => void; timer: ReturnType<typeof setTimeout> } | null = null;
/** Long enough to walk across any floor; past it, something else happened on the way and it's let go. */
const WAIT_MS = 30_000;
/** A moment for sitting down to show before the camera moves to the desk. */
const SETTLE_MS = 250;

function stopWaiting() {
  if (!waiting) return;
  waiting.stop();
  clearTimeout(waiting.timer);
  waiting = null;
}

/**
 * Customize your desk, from wherever you are (the dock): at it, it opens; away
 * from it, you're walked there and sat down, then it opens. False without a desk.
 */
export function decorateMyDesk(): boolean {
  const mine = me ? deskOf(deskState().desks, me) : undefined;
  if (!mine) return false;
  stopWaiting();
  if (deskState().seat === mine.seat) {
    openDecorate();
    return true;
  }
  const stop = subscribeDesks(() => {
    const { desks, seat } = deskState();
    const now = me ? deskOf(desks, me) : undefined;
    if (!now || seat !== now.seat) return;
    stopWaiting();
    setTimeout(openDecorate, SETTLE_MS);
  });
  waiting = { stop, timer: setTimeout(stopWaiting, WAIT_MS) };
  goToMyDesk();
  return true;
}

/** "Find a desk" was asked for: once a desk is claimed, it opens for customizing. */
let decorateOnClaim = false;

/**
 * Finding a desk to make yours, from the dock: you're walked to the nearest
 * free one and sat down, its chip offers it, and claiming it opens it for
 * customizing. False when there's none free.
 */
export function findDeskToDecorate(): boolean {
  const found = findAFreeDesk();
  decorateOnClaim = found;
  return found;
}

subscribeDesks(() => {
  const { claimed, desks } = deskState();
  if (!decorateOnClaim || claimed === null || !me) return;
  const mine = deskOf(desks, me);
  if (!mine || mine.seat !== claimed) return;
  decorateOnClaim = false;
  setTimeout(decorateMyDesk, SETTLE_MS);
});

export function close() {
  if (state.desk === null) return;
  stopTrying();
  past = [];
  ahead = [];
  set({ desk: null, part: null });
}

export const closeDecorate = close;

/** A part of the desk picked, from the panel or the floor. */
export const pickPart = (key: string) => {
  if (!state.desk || state.part === key) return;
  stopTrying();
  set({ part: key });
};

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

/** A part as a change from the floor's own: picking what the floor has there is no change at all. */
function changeFor(key: string, item: string | null): PieceChange | null {
  const own = floorItem(key);
  return item === own ? null : item === null ? { hidden: true } : { item };
}

/** Shows a change and sends it, as it was before: null when it isn't allowed, or isn't a change. */
function apply(key: string, after: PieceChange | null): Change | null {
  const desk = state.desk;
  const changes = pieceChanges();
  if (!desk || !canChange(key, after, desk, changes)) return null;
  const before = changes[key] ?? null;
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  applyPieceChange(key, after);
  enqueue({ t: "piece", key, change: after });
  return { key, before, after };
}

/** Changes made together, kept as one step to undo, the part to show after. */
function commit(part: string, changes: Change[]) {
  if (!changes.length) return;
  past.push({ part, changes });
  ahead = [];
  set({});
}

/**
 * A part as this: a spot's thing (null, the spot emptied), the chair, the
 * desk's wood. False when it isn't allowed.
 */
export function setPart(key: string, item: string | null): boolean {
  stopTrying();
  const next = changeFor(key, item);
  const desk = state.desk;
  if (!desk || !canChange(key, next, desk, pieceChanges())) return false;
  const done = apply(key, next);
  if (done) {
    commit(key, [done]);
    track("desk_part_set", { item: item ?? "none" });
    did("decorate");
  }
  return true;
}

/** A moment before what's tried goes back, so going from one choice to the next doesn't flash the desk as it was between them. */
const LET_GO_MS = 90;
let lettingGo: ReturnType<typeof setTimeout> | null = null;

/** What a part would look like as this, shown on the floor while the pointer rests on it; nothing is sent. */
export function tryPart(key: string, item: string | null) {
  if (lettingGo) clearTimeout(lettingGo);
  lettingGo = null;
  const desk = state.desk;
  const next = changeFor(key, item);
  if (!desk || !canChange(key, next, desk, pieceChanges())) return;
  tryPieceChange(key, next);
}

/** The pointer has left a choice: the desk goes back as it is, unless another is tried at once. */
export function stopTryingPart() {
  if (lettingGo) clearTimeout(lettingGo);
  lettingGo = setTimeout(() => {
    lettingGo = null;
    stopTrying();
  }, LET_GO_MS);
}

function replay(step: Step, back: boolean) {
  for (const one of back ? [...step.changes].reverse() : step.changes) apply(one.key, back ? one.before : one.after);
}

export function undo() {
  const step = past.pop();
  if (!step) return;
  stopTrying();
  replay(step, true);
  ahead.push(step);
  set({ part: step.part });
}

export function redo() {
  const step = ahead.pop();
  if (!step) return;
  stopTrying();
  replay(step, false);
  past.push(step);
  set({ part: step.part });
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * A desk made up for you: something that fits in each spot (now and then
 * one left clear, as real desks are), a chair and a wood, as one step, so
 * one undo takes it back. Pressed again, another.
 */
export function surpriseDesk() {
  const desk = state.desk;
  if (!desk) return;
  stopTrying();
  const spec = FLOOR.desks[desk];
  const drawn = officePieces(pieceChanges());
  const now = (key: string) => drawn.find((piece) => piece.key === key)?.item ?? null;
  const done: Change[] = [];
  const things = Object.keys(FLOOR.things);
  // The widest spot always gets something, so it never comes out bare.
  const widest = spec.spots.reduce((best, spot) => (spot.x[1] - spot.x[0] > best.x[1] - best.x[0] ? spot : best), spec.spots[0]);
  for (const spot of spec.spots) {
    const key = spotKey(desk, spot.id);
    const fits = things.filter((item) => fitsIn(desk, spot, item) && item !== now(key));
    const clear = spot !== widest && Math.random() < 0.2;
    const one = apply(key, changeFor(key, clear || !fits.length ? null : pick(fits)));
    if (one) done.push(one);
  }
  const chairs = FLOOR.chairs[spec.side].map((chair) => chair.item).filter((item) => item !== now(spec.chair.key));
  if (chairs.length) {
    const one = apply(spec.chair.key, changeFor(spec.chair.key, pick(chairs)));
    if (one) done.push(one);
  }
  if (spec.body) {
    const woods = spec.body.options.filter((item) => item !== now(spec.body!.key));
    const one = woods.length ? apply(spec.body.key, changeFor(spec.body.key, pick(woods))) : null;
    if (one) done.push(one);
  }
  commit(state.part ?? firstPart(desk), done);
  track("desk_surprise");
  did("decorate");
}

/** Everything on your desk, its chair and its wood back as the floor has them. */
export function resetDesk() {
  const desk = state.desk;
  if (!desk) return;
  stopTrying();
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
