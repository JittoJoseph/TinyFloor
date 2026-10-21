"use client";

import type { ServerMessage } from "@shared/messages";
import type { RoomSocket } from "./RoomSocket";
import { learned } from "./actions";

/**
 * The board's shape, width to height, wherever it's drawn on or shown: points
 * are fractions of it, so every screen and the board on the wall need the same
 * shape for a circle to stay a circle.
 */
export const BOARD_ASPECT = 2;
/** Someone who drew this recently is still drawing, as far as the room can tell. */
const DRAWING_MS = 6000;

export interface Stroke {
  id: string;
  color: string;
  size: number;
  erase: boolean;
  points: number[];
}

export interface BoardSnapshot {
  open: boolean;
  ready: boolean;
  strokes: Stroke[];
  version: number;
}

type Listener = () => void;
type StrokeListener = (stroke: Stroke, from: number) => void;

/**
 * Points closer together than this add nothing to see, so they are not sent.
 * Coordinates are fractions of the board, so this is a fraction too: about two
 * pixels across a 900px board.
 */
const MIN_POINT_GAP = 0.002;
const FLUSH_MS = 100;
const EMPTY: BoardSnapshot = {
  open: false,
  ready: false,
  strokes: [],
  version: 0,
};

/**
 * Keeps the room's drawing in sync. Points travel as normalised 0..1 pairs so a
 * stroke lands in the same place on every screen, and outgoing points are
 * batched so a fast scribble is a handful of messages rather than hundreds.
 */
class WhiteboardManager {
  private ws?: RoomSocket;
  private strokes = new Map<string, Stroke>();
  private listeners = new Set<Listener>();
  private strokeListeners = new Set<StrokeListener>();
  private snapshot: BoardSnapshot = EMPTY;
  private open = false;
  private ready = false;
  private version = 0;

  private live?: Stroke;
  private pending: number[] = [];
  /** When each person last drew, by id; the room sends who drew each stroke. */
  private drawers = new Map<string, number>();
  private flushTimer?: ReturnType<typeof setTimeout>;

  attach(ws: RoomSocket) {
    this.ws = ws;
    this.ready = false;
    this.strokes.clear();
    this.bump();
  }

  /** Asks for the whole board; done on arrival and again after a reconnect. */
  sync() {
    this.ws?.send({ t: "board_sync" });
  }

  detach() {
    this.flush();
    this.ws = undefined;
    this.strokes.clear();
    this.drawers.clear();
    this.open = false;
    this.ready = false;
    this.live = undefined;
    this.bump();
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => EMPTY;

  /** Lets the canvas paint only what changed instead of redrawing everything. */
  onStroke(listener: StrokeListener) {
    this.strokeListeners.add(listener);
    return () => this.strokeListeners.delete(listener);
  }

  getStrokes() {
    return [...this.strokes.values()];
  }

  /** Who else is drawing on it now. */
  drawing(now = Date.now()): string[] {
    return [...this.drawers].filter(([, at]) => now - at < DRAWING_MS).map(([id]) => id);
  }

  setOpen(open: boolean) {
    if (this.open === open) return;
    if (open) learned("draw");
    else this.flush();
    this.open = open;
    this.bump();
  }

  handleMessage(message: Extract<ServerMessage, { t: "board_state" | "board_draw" | "board_clear" }>) {
    switch (message.t) {
      case "board_state": {
        this.strokes.clear();
        message.strokes.forEach((stroke) => {
          if (stroke?.id) this.strokes.set(stroke.id, normalise(stroke));
        });
        this.ready = true;
        this.bump();
        break;
      }
      case "board_draw": {
        const incoming = normalise(message);
        if (!incoming.id || !incoming.points.length) return;
        this.drawers.set(message.by, Date.now());

        const existing = this.strokes.get(incoming.id);
        const from = existing ? existing.points.length : 0;
        if (existing) existing.points.push(...incoming.points);
        else this.strokes.set(incoming.id, incoming);

        this.emitStroke(this.strokes.get(incoming.id)!, from);
        break;
      }
      case "board_clear": {
        this.strokes.clear();
        this.bump();
        break;
      }
    }
  }

  beginStroke(color: string, size: number, erase: boolean, x: number, y: number) {
    this.flush();
    this.live = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      color,
      size,
      erase,
      points: [x, y],
    };
    this.strokes.set(this.live.id, this.live);
    this.pending = [x, y];
    this.emitStroke(this.live, 0);
    this.scheduleFlush();
  }

  extendStroke(x: number, y: number) {
    if (!this.live) return;
    // A pen reports far more points than a line needs; near-identical ones are dropped.
    const points = this.live.points;
    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    if (Math.abs(x - lastX) < MIN_POINT_GAP && Math.abs(y - lastY) < MIN_POINT_GAP) return;
    const from = points.length;
    this.live.points.push(x, y);
    this.pending.push(x, y);
    this.emitStroke(this.live, Math.max(0, from - 2));
    this.scheduleFlush();
  }

  endStroke() {
    if (!this.live) return;
    this.flush();
    this.live = undefined;
  }

  clear() {
    this.endStroke();
    this.strokes.clear();
    this.ws?.send({ t: "board_clear" });
    this.bump();
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      this.flush();
    }, FLUSH_MS);
  }

  private flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (!this.live || !this.pending.length) return;

    this.ws?.send({
      t: "board_draw",
      id: this.live.id,
      color: this.live.color,
      size: this.live.size,
      erase: this.live.erase,
      points: this.pending,
    });
    this.pending = [];
  }

  private emitStroke(stroke: Stroke, from: number) {
    this.version += 1;
    this.strokeListeners.forEach((listener) => listener(stroke, from));
  }

  private bump() {
    this.version += 1;
    this.snapshot = {
      open: this.open,
      ready: this.ready,
      strokes: this.getStrokes(),
      version: this.version,
    };
    this.listeners.forEach((listener) => listener());
  }
}

function normalise(stroke: Stroke): Stroke {
  return {
    id: stroke.id,
    color: stroke.color || "#2c2c2c",
    size: Number(stroke.size) || 3,
    erase: Boolean(stroke.erase),
    points: (stroke.points || []).map(Number),
  };
}

export const whiteboard = new WhiteboardManager();
