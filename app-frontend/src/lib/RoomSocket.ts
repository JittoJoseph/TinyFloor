import { CloseCode, HEARTBEAT_PONG, type ClientMessage, type ServerMessage } from "shared-protocol/messages";
import { ApiError, type RoomTicket } from "web-shared/lib/api";
import { floorStep } from "@/lib/floor";
import { Lifeline, OPEN_WITHIN_MS, STEADY_AFTER_MS, onReconnectHint, retryDelay } from "@/lib/socketLife";

const TOO_MANY_MESSAGES_PAUSE_MS = 30_000;
/**
 * Not kept for a reconnect: positions are stale by then, and the meeting's
 * media and the call report belong to the connection that dropped (the
 * meeting is joined again and the call reported again on welcome).
 */
const DROPPED_OFFLINE = new Set<ClientMessage["t"]>(["move", "walk_to", "sfu", "speaking", "call_usage"]);

/** Why the room let go of us for good. The page shows a matching message. */
export type RoomEnd = "full" | "replaced" | "closed" | "revoked" | "signedOut" | "notFound";

export const ROOM_ENDED_EVENT = "roomEnded";
export const ROOM_CONNECTION_EVENT = "roomConnection";

/**
 * The connection to one room on tinyfloor-realtime. Every connection attempt
 * gets a fresh ticket from the API, so reconnecting after a drop or a deploy
 * works the same as arriving. A socket that stops answering is dropped and
 * opened again (lib/socketLife), and one is opened straight away when the
 * network or the tab comes back instead of waiting out the backoff.
 */
export class RoomSocket {
  private ws: WebSocket | null = null;
  private onMessage?: (message: ServerMessage) => void;
  /** What the room said before anyone was listening: the floor is joined while it's still being built. */
  private held: ServerMessage[] = [];
  private queue: ClientMessage[] = [];
  private stopped = false;
  private attempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  /** Fetching a ticket for the next socket. */
  private opening = false;
  /** Asked to slow down (TooManyMessages): no reconnecting early before this. */
  private pausedUntil = 0;
  private lifeline?: Lifeline;
  private openTimer?: ReturnType<typeof setTimeout>;
  private steadyTimer?: ReturnType<typeof setTimeout>;
  private stopHints?: () => void;
  /** Welcomed once: from then on a connection is a return, not an arrival. */
  private welcomed = false;

  constructor(
    private readonly ticketFor: () => Promise<RoomTicket>,
    /** Where to appear; asked again on every reconnect so you come back where you were. */
    private readonly spawn: () => { x: number; y: number },
  ) {}

  /** Hears the room from now on, starting with whatever it has said already. */
  listen(callback: (message: ServerMessage) => void) {
    this.onMessage = callback;
    for (const message of this.held.splice(0)) callback(message);
  }

  connect() {
    this.stopped = false;
    this.stopHints ??= onReconnectHint(() => this.hint());
    void this.open();
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (!DROPPED_OFFLINE.has(message.t)) {
      this.queue.push(message);
    }
  }

  disconnect() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    this.stopHints?.();
    this.stopHints = undefined;
    const ws = this.ws;
    this.release();
    ws?.close(1000, "left");
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private async open() {
    if (this.stopped || this.opening) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    announce(this.welcomed || this.attempts > 0 ? "reconnecting" : "connecting");

    let ticket: RoomTicket;
    this.opening = true;
    try {
      ticket = await this.ticketFor();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return this.end("signedOut");
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return this.end("notFound");
      return this.retry();
    } finally {
      this.opening = false;
    }
    if (this.stopped) return;

    // Arriving, the room seats you at your desk if you have one (docs/product.md); until
    // a welcome, even a retried connection is still the arrival.
    const { x, y } = this.spawn();
    const url = `${ticket.url}?ticket=${encodeURIComponent(ticket.ticket)}&x=${x}&y=${y}${this.welcomed ? "" : "&arrive=1"}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    // Still opening after a while (a connection that will never answer): tried again.
    this.openTimer = setTimeout(() => ws.readyState === WebSocket.CONNECTING && this.drop(ws), OPEN_WITHIN_MS);

    ws.onopen = () => {
      if (this.ws !== ws) return;
      clearTimeout(this.openTimer);
      floorStep("open");
      // The backoff starts over only once it has held: one opened and closed at once keeps backing off.
      this.steadyTimer = setTimeout(() => (this.attempts = 0), STEADY_AFTER_MS);
      announce("connected");
      this.lifeline = new Lifeline(ws, () => this.drop(ws));
      for (const message of this.queue.splice(0)) ws.send(JSON.stringify(message));
    };

    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      this.lifeline?.heard();
      if (event.data === HEARTBEAT_PONG) return;
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.t === "welcome") {
          this.welcomed = true;
          floorStep("welcome");
        }
        if (this.onMessage) this.onMessage(message);
        else this.held.push(message);
      } catch (error) {
        console.error("Bad message from the room", error);
      }
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.release();
      if (this.stopped) return;

      switch (event.code) {
        case CloseCode.RoomFull:
          return this.end("full");
        case CloseCode.Replaced:
          return this.end("replaced");
        case CloseCode.RoomClosed:
          return this.end("closed");
        case CloseCode.AccessRevoked:
          return this.end("revoked");
        case CloseCode.TooManyMessages:
          this.pausedUntil = Date.now() + TOO_MANY_MESSAGES_PAUSE_MS;
          return this.retry(TOO_MANY_MESSAGES_PAUSE_MS);
        default:
          return this.retry();
      }
    };
  }

  private retry(delay?: number) {
    if (this.stopped) return;
    announce("reconnecting");
    const wait = delay ?? retryDelay(this.attempts);
    this.attempts += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.open(), wait);
  }

  /**
   * A socket that stopped answering, or never opened: let go of at once, not
   * closed and waited on (a dead one can take minutes to say it's closed), and
   * another one opened.
   */
  private drop(ws: WebSocket) {
    if (this.ws !== ws) return;
    this.release();
    ws.onopen = ws.onmessage = ws.onclose = null;
    try {
      ws.close(1000, "unresponsive");
    } catch {
      // Already gone.
    }
    this.retry();
  }

  /** The network or the tab came back: check the socket now, or open one now instead of waiting out the backoff. */
  private hint() {
    if (this.stopped || this.opening || Date.now() < this.pausedUntil) return;
    const ws = this.ws;
    if (ws?.readyState === WebSocket.OPEN) return this.lifeline?.probe();
    if (ws?.readyState === WebSocket.CONNECTING) return;
    if (this.reconnectTimer) void this.open();
  }

  private release() {
    this.ws = null;
    this.lifeline?.stop();
    this.lifeline = undefined;
    clearTimeout(this.openTimer);
    clearTimeout(this.steadyTimer);
  }

  private end(reason: RoomEnd) {
    this.stopped = true;
    this.stopHints?.();
    this.stopHints = undefined;
    this.release();
    window.dispatchEvent(new CustomEvent(ROOM_ENDED_EVENT, { detail: { reason } }));
  }
}

function announce(state: "connecting" | "connected" | "reconnecting") {
  window.dispatchEvent(new CustomEvent(ROOM_CONNECTION_EVENT, { detail: { state } }));
}
