import { DurableObject } from "cloudflare:workers";
import {
  CHAT_MAX_LENGTH,
  CloseCode,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
  PRESENCE_STATUSES,
  isInsideMap,
  type ClientMessage,
  type PlayerState,
  type PresenceStatus,
  type RoomRole,
  type RoomTicket,
  type ServerMessage,
} from "../../shared-protocol/src";
import { ROOM_HEADER, SPAWN_HEADER, TICKET_HEADER } from "./headers";
import { lobbyCopyNumber } from "./lobby-router";

const DEFAULT_SPAWN = { x: 5, y: 5 };
const HEARTBEAT_TIMEOUT_MS = 90_000;
const MAX_STEP_TILES = 2;

/** Per-socket limits. Kept in the attachment, so they survive hibernation. */
const LIMITS = {
  movesPerSecond: 6,
  actionsPerSecond: 4,
  messagesPerSecond: 60,
  chatsPerTenSeconds: 5,
};

interface Attachment {
  room: string;
  userId: string;
  name: string;
  character: string;
  guest: boolean;
  role: RoomRole;
  x: number;
  y: number;
  status: PresenceStatus;
  joinedAt: number;
  lastSeenAt: number;
  /** Set when this socket was closed on purpose, so its close event doesn't announce a departure. */
  leaving: boolean;
  second: number;
  moves: number;
  actions: number;
  messages: number;
  chatWindow: number;
  chats: number;
}

/**
 * One workspace room, or one copy of the public lobby.
 *
 * Built for hibernation: no timers, every message is handled and broadcast on
 * the spot, and everything needed after waking up lives in the WebSocket
 * attachments. The heartbeat is answered by the runtime without waking the room.
 */
export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(HEARTBEAT_PING, HEARTBEAT_PONG));
  }

  presenceCount(): number {
    return this.present().length;
  }

  async fetch(request: Request): Promise<Response> {
    const ticket = JSON.parse(request.headers.get(TICKET_HEADER) ?? "null") as RoomTicket | null;
    const room = request.headers.get(ROOM_HEADER);
    if (!ticket || !room) return new Response("Unauthorized", { status: 401 });

    const now = Date.now();
    this.dropStaleSockets(now);

    const { 0: client, 1: server } = new WebSocketPair();

    for (const previous of this.ctx.getWebSockets(userTag(ticket.sub))) {
      this.closeQuietly(previous, CloseCode.Replaced, "replaced");
    }

    if (this.present().length >= ticket.cap) {
      server.accept();
      server.close(CloseCode.RoomFull, "room_full");
      await this.reportHeadcount(room);
      return new Response(null, { status: 101, webSocket: client });
    }

    const attachment: Attachment = {
      room,
      userId: ticket.sub,
      name: ticket.name,
      character: ticket.character,
      guest: ticket.role === "guest",
      role: ticket.role,
      ...spawnFrom(request.headers.get(SPAWN_HEADER)),
      status: "available",
      joinedAt: now,
      lastSeenAt: now,
      leaving: false,
      second: 0,
      moves: 0,
      actions: 0,
      messages: 0,
      chatWindow: 0,
      chats: 0,
    };

    const others = this.present().map((socket) => playerState(attachmentOf(socket)));

    this.ctx.acceptWebSocket(server, [userTag(ticket.sub)]);
    server.serializeAttachment(attachment);

    send(server, { t: "welcome", self: playerState(attachment), players: others });
    this.broadcast({ t: "player_joined", player: playerState(attachment) }, server);
    await this.reportHeadcount(room);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const now = Date.now();
    const me = attachmentOf(socket);
    if (me.leaving) return;

    me.lastSeenAt = now;
    if (!this.withinLimits(socket, me, now)) {
      await this.reportHeadcount(me.room);
      return;
    }

    const message = parse(raw);
    if (!message) {
      socket.serializeAttachment(me);
      send(socket, { t: "error", code: "bad_message" });
      return;
    }

    switch (message.t) {
      case "move":
        this.move(socket, me, message.x, message.y);
        break;
      case "walk_to":
        this.walkTo(socket, me, message.x, message.y);
        break;
      case "status":
        this.setStatus(socket, me, message.status);
        break;
      case "chat":
        this.chat(socket, me, message.text, now);
        break;
      default:
        socket.serializeAttachment(me);
        send(socket, { t: "error", code: "bad_message" });
    }

    if (this.dropStaleSockets(now)) await this.reportHeadcount(me.room);
  }

  async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    if (this.farewell(socket, code)) await this.reportHeadcount(attachmentOf(socket).room);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    if (this.farewell(socket, 1011)) await this.reportHeadcount(attachmentOf(socket).room);
  }

  private move(socket: WebSocket, me: Attachment, x: number, y: number): void {
    me.moves++;
    const step = Math.max(Math.abs(x - me.x), Math.abs(y - me.y));
    if (me.moves > LIMITS.movesPerSecond || !isInsideMap(x, y) || step > MAX_STEP_TILES) {
      socket.serializeAttachment(me);
      if (me.moves <= LIMITS.movesPerSecond + 1) send(socket, { t: "move_rejected", x: me.x, y: me.y });
      return;
    }
    me.x = x;
    me.y = y;
    socket.serializeAttachment(me);
    this.broadcast({ t: "moved", id: me.userId, x, y }, socket);
  }

  private walkTo(socket: WebSocket, me: Attachment, x: number, y: number): void {
    me.actions++;
    if (me.actions > LIMITS.actionsPerSecond || !isInsideMap(x, y)) {
      socket.serializeAttachment(me);
      return;
    }
    me.x = x;
    me.y = y;
    socket.serializeAttachment(me);
    this.broadcast({ t: "walking", id: me.userId, x, y }, socket);
  }

  private setStatus(socket: WebSocket, me: Attachment, status: PresenceStatus): void {
    me.actions++;
    if (me.actions > LIMITS.actionsPerSecond || !PRESENCE_STATUSES.includes(status)) {
      socket.serializeAttachment(me);
      return;
    }
    me.status = status;
    socket.serializeAttachment(me);
    this.broadcast({ t: "status", id: me.userId, status });
  }

  private chat(socket: WebSocket, me: Attachment, text: unknown, now: number): void {
    if (now - me.chatWindow >= 10_000) {
      me.chatWindow = now;
      me.chats = 0;
    }
    me.chats++;
    socket.serializeAttachment(me);

    if (me.chats > LIMITS.chatsPerTenSeconds) {
      send(socket, { t: "error", code: "slow_down" });
      return;
    }
    const trimmed = typeof text === "string" ? text.trim().slice(0, CHAT_MAX_LENGTH) : "";
    if (!trimmed) return;

    this.broadcast({ t: "chat", id: me.userId, name: me.name, text: trimmed, at: now });
  }

  /** Counts this message against the socket's per-second budget; false when it must be dropped. */
  private withinLimits(socket: WebSocket, me: Attachment, now: number): boolean {
    const second = Math.floor(now / 1000);
    if (second !== me.second) {
      me.second = second;
      me.moves = 0;
      me.actions = 0;
      me.messages = 0;
    }
    me.messages++;

    if (me.messages > LIMITS.messagesPerSecond) {
      socket.serializeAttachment(me);
      this.closeQuietly(socket, CloseCode.TooManyMessages, "too_many_messages");
      this.broadcast({ t: "player_left", id: me.userId });
      return false;
    }
    return true;
  }

  /**
   * A client that vanishes without closing isn't noticed straight away. Whenever
   * the room is awake anyway, anyone without a heartbeat or message for 90
   * seconds is let go. No timer is involved.
   */
  /** Returns whether anyone was dropped. */
  private dropStaleSockets(now: number): boolean {
    let dropped = false;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = attachmentOf(socket);
      if (attachment.leaving) continue;
      const heartbeat = this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0;
      const lastHeard = Math.max(heartbeat, attachment.lastSeenAt);
      if (now - lastHeard > HEARTBEAT_TIMEOUT_MS) {
        this.closeQuietly(socket, 1001, "stale");
        this.broadcast({ t: "player_left", id: attachment.userId });
        dropped = true;
      }
    }
    return dropped;
  }

  /** Returns whether this was a departure the room hadn't already announced. */
  private farewell(socket: WebSocket, code: number): boolean {
    const attachment = attachmentOf(socket);
    try {
      socket.close(validCloseCode(code), "closing");
    } catch {
      // Already closed.
    }
    if (attachment.leaving) return false;

    attachment.leaving = true;
    socket.serializeAttachment(attachment);
    this.broadcast({ t: "player_left", id: attachment.userId }, socket);
    return true;
  }

  /** Lobby copies tell the router how many people they hold; other rooms don't. */
  private async reportHeadcount(room: string): Promise<void> {
    if (lobbyCopyNumber(room) === null) return;
    await this.env.LOBBY.getByName("global").report(room, this.present().length);
  }

  private closeQuietly(socket: WebSocket, code: number, reason: string): void {
    const attachment = attachmentOf(socket);
    attachment.leaving = true;
    socket.serializeAttachment(attachment);
    try {
      socket.close(code, reason);
    } catch {
      // Already closed.
    }
  }

  private present(): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => !attachmentOf(socket).leaving);
  }

  private broadcast(message: ServerMessage, except?: WebSocket): void {
    const text = JSON.stringify(message);
    for (const socket of this.present()) {
      if (socket === except) continue;
      try {
        socket.send(text);
      } catch {
        // The close event will clean this socket up.
      }
    }
  }
}

function userTag(userId: string): string {
  return `user:${userId}`;
}

function attachmentOf(socket: WebSocket): Attachment {
  return socket.deserializeAttachment() as Attachment;
}

function playerState(attachment: Attachment): PlayerState {
  return {
    id: attachment.userId,
    name: attachment.name,
    character: attachment.character,
    x: attachment.x,
    y: attachment.y,
    status: attachment.status,
    guest: attachment.guest,
  };
}

function send(socket: WebSocket, message: ServerMessage): void {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // The close event will clean this socket up.
  }
}

function spawnFrom(header: string | null): { x: number; y: number } {
  const [x, y] = (header ?? "").split(",").map(Number);
  return isInsideMap(x, y) ? { x, y } : { ...DEFAULT_SPAWN };
}

function parse(raw: string | ArrayBuffer): ClientMessage | null {
  if (typeof raw !== "string") return null;
  try {
    const message = JSON.parse(raw) as ClientMessage;
    return message && typeof message === "object" && typeof message.t === "string" ? message : null;
  } catch {
    return null;
  }
}

/** 1005 and 1006 can't be sent in a close frame; anything else outside the allowed range is replaced. */
function validCloseCode(code: number): number {
  return code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000;
}
