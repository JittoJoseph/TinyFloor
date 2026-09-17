import { CloseCode, HEARTBEAT_PING, HEARTBEAT_PONG, type ClientMessage, type ServerMessage } from "@shared/messages";
import { ApiError, type RoomTicket } from "./api";

const HEARTBEAT_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const TOO_MANY_MESSAGES_PAUSE_MS = 30_000;

/** Why the room let go of us for good. The page shows a matching message. */
export type RoomEnd = "full" | "replaced" | "closed" | "revoked" | "signedOut" | "notFound";

export const ROOM_ENDED_EVENT = "roomEnded";
export const ROOM_CONNECTION_EVENT = "roomConnection";

/**
 * The connection to one room on tinyfloor-realtime. Every connection attempt
 * gets a fresh ticket from the API, so reconnecting after a drop or a deploy
 * works the same as arriving.
 */
export class RoomSocket {
  private ws: WebSocket | null = null;
  private onMessage?: (message: ServerMessage) => void;
  private queue: ClientMessage[] = [];
  private stopped = false;
  private attempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor(
    private readonly ticketFor: () => Promise<RoomTicket>,
    /** Where to appear; asked again on every reconnect so you come back where you were. */
    private readonly spawn: () => { x: number; y: number },
  ) {}

  setOnMessage(callback: (message: ServerMessage) => void) {
    this.onMessage = callback;
  }

  connect() {
    this.stopped = false;
    void this.open();
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (message.t !== "move" && message.t !== "walk_to") {
      // Positions are stale by the time we reconnect; everything else is worth keeping.
      this.queue.push(message);
    }
  }

  disconnect() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close(1000, "left");
    this.ws = null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private async open() {
    if (this.stopped) return;
    announce(this.attempts === 0 ? "connecting" : "reconnecting");

    let ticket: RoomTicket;
    try {
      ticket = await this.ticketFor();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return this.end("signedOut");
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return this.end("notFound");
      return this.retry();
    }
    if (this.stopped) return;

    const { x, y } = this.spawn();
    const url = `${ticket.url}?ticket=${encodeURIComponent(ticket.ticket)}&x=${x}&y=${y}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      announce("connected");
      this.startHeartbeat();
      for (const message of this.queue.splice(0)) ws.send(JSON.stringify(message));
    };

    ws.onmessage = (event) => {
      if (event.data === HEARTBEAT_PONG) return;
      try {
        this.onMessage?.(JSON.parse(event.data) as ServerMessage);
      } catch (error) {
        console.error("Bad message from the room", error);
      }
    };

    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopHeartbeat();
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
          return this.retry(TOO_MANY_MESSAGES_PAUSE_MS);
        default:
          return this.retry();
      }
    };
  }

  private retry(delay?: number) {
    if (this.stopped) return;
    announce("reconnecting");
    const wait = delay ?? Math.min(RECONNECT_BASE_MS * 2 ** this.attempts, RECONNECT_MAX_MS);
    this.attempts += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.open(), wait);
  }

  private end(reason: RoomEnd) {
    this.stopped = true;
    this.stopHeartbeat();
    window.dispatchEvent(new CustomEvent(ROOM_ENDED_EVENT, { detail: { reason } }));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(HEARTBEAT_PING);
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }
}

function announce(state: "connecting" | "connected" | "reconnecting") {
  window.dispatchEvent(new CustomEvent(ROOM_CONNECTION_EVENT, { detail: { state } }));
}
