"use client";

import { WebSocketManager } from "./WebSocketManager";

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

const FLUSH_MS = 60;
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
  private ws?: WebSocketManager;
  private strokes = new Map<string, Stroke>();
  private listeners = new Set<Listener>();
  private strokeListeners = new Set<StrokeListener>();
  private snapshot: BoardSnapshot = EMPTY;
  private open = false;
  private ready = false;
  private version = 0;

  private openListener = () => this.setOpen(true);

  private live?: Stroke;
  private pending: number[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;

  attach(ws: WebSocketManager) {
    this.ws = ws;
    window.addEventListener("openWhiteboard", this.openListener);
    this.ready = false;
    this.strokes.clear();
    this.bump();
    ws.send("board_sync", {});
  }

  detach() {
    window.removeEventListener("openWhiteboard", this.openListener);
    this.flush();
    this.ws = undefined;
    this.strokes.clear();
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

  setOpen(open: boolean) {
    if (this.open === open) return;
    if (!open) this.flush();
    this.open = open;
    this.bump();
  }

  handleMessage(type: string, data: Record<string, unknown>) {
    switch (type) {
      case "board_state": {
        this.strokes.clear();
        (data.strokes as Stroke[] | undefined)?.forEach((stroke) => {
          if (stroke?.id) this.strokes.set(stroke.id, normalise(stroke));
        });
        this.ready = true;
        this.bump();
        break;
      }
      case "board_draw": {
        const incoming = normalise(data as unknown as Stroke);
        if (!incoming.id || !incoming.points.length) return;

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
    const from = this.live.points.length;
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
    this.ws?.send("board_clear", {});
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

    this.ws?.send("board_draw", {
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
