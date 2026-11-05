import { HEARTBEAT_PING } from "shared-protocol/messages";

/**
 * What keeps a socket to the realtime service honest, for the room's and the
 * chat's alike. A browser can hold a socket "open" long after it died: a
 * laptop that slept, Wi-Fi that changed. The server let us go after 90 s of
 * silence and the others saw us leave, while this side still thought it was
 * connected and anything sent went nowhere. Ideas from Phoenix's socket,
 * tldraw's sync client and partysocket.
 */

/** A ping this often; the service answers without waking (setWebSocketAutoResponse). */
const PING_EVERY_MS = 10_000;
/** A ping left unanswered this long, with nothing else heard meanwhile, and the socket is dead. */
const ANSWER_WITHIN_MS = 10_000;
/** After a hint the network changed (back online, the tab shown, the laptop awake), an answer is due sooner. */
const PROBE_WITHIN_MS = 5_000;
/** A socket still opening after this long is given up on and tried again. */
export const OPEN_WITHIN_MS = 8_000;
/** Up this long, and the next drop starts the backoff over; a socket that opens and is closed at once keeps backing off. */
export const STEADY_AFTER_MS = 5_000;

const RETRY_FIRST_MS = 300;
const RETRY_MAX_MS = 30_000;

/**
 * How long before the next try: quick at first, as a blip mends itself, then
 * doubling to 30 s, each with up to half again at random, so a whole office
 * dropped by a deploy doesn't come back in the same instant.
 */
export function retryDelay(attempt: number): number {
  const base = Math.min(RETRY_FIRST_MS * 2 ** attempt, RETRY_MAX_MS);
  return Math.round(base * (0.5 + Math.random() * 0.5));
}

/**
 * Pings an open socket and calls `dead` when it stops answering. Anything
 * heard counts as an answer, so a busy socket needs no pings answered.
 */
export class Lifeline {
  private timer?: ReturnType<typeof setInterval>;
  private heardAt = Date.now();
  /** By when an answer to the pings out must have come; 0 while none is waited for. */
  private dueBy = 0;
  private done = false;

  constructor(
    private readonly socket: WebSocket,
    private readonly dead: () => void,
  ) {
    this.timer = setInterval(() => this.tick(), PING_EVERY_MS / 2);
  }

  /** Something came in: the socket is alive. */
  heard() {
    this.heardAt = Date.now();
    this.dueBy = 0;
  }

  /** The network may have changed under us: ask now, and want the answer soon. */
  probe() {
    if (this.done || this.socket.readyState !== WebSocket.OPEN) return;
    this.ask(PROBE_WITHIN_MS);
    setTimeout(() => this.tick(), PROBE_WITHIN_MS + 50);
  }

  stop() {
    this.done = true;
    clearInterval(this.timer);
  }

  private tick() {
    if (this.done || this.socket.readyState !== WebSocket.OPEN) return;
    // Timers in a background tab run late, so it's the clock that's read, not the count of ticks.
    const now = Date.now();
    if (this.dueBy && now > this.dueBy) {
      this.stop();
      this.dead();
    } else if (!this.dueBy && now - this.heardAt >= PING_EVERY_MS) {
      this.ask(ANSWER_WITHIN_MS);
    }
  }

  private ask(within: number) {
    try {
      this.socket.send(HEARTBEAT_PING);
    } catch {
      return;
    }
    const due = Date.now() + within;
    this.dueBy = this.dueBy ? Math.min(this.dueBy, due) : due;
  }
}

/**
 * Calls `hint` whenever the connection is worth checking at once: the network
 * came back or changed, the tab was shown again, the page came back from the
 * back-forward cache, or the laptop woke (Chrome's `resume`, which it fires
 * where `visibilitychange` sometimes doesn't after a sleep). Returns the way to stop.
 */
export function onReconnectHint(hint: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const visible = () => {
    if (document.visibilityState === "visible") hint();
  };
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  window.addEventListener("online", hint);
  window.addEventListener("pageshow", hint);
  document.addEventListener("visibilitychange", visible);
  document.addEventListener("resume", hint);
  connection?.addEventListener("change", hint);
  return () => {
    window.removeEventListener("online", hint);
    window.removeEventListener("pageshow", hint);
    document.removeEventListener("visibilitychange", visible);
    document.removeEventListener("resume", hint);
    connection?.removeEventListener("change", hint);
  };
}
