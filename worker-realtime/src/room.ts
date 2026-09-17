import { DurableObject } from "cloudflare:workers";
import {
  CALL_KINDS,
  CAMERA_LAYERS,
  CHAT_MAX_LENGTH,
  MEDIA_KINDS,
  CloseCode,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
  PRESENCE_STATUSES,
  isInsideMap,
  type ClientMessage,
  type MeetingMember,
  type MusicState,
  type PlayerState,
  type PresenceStatus,
  type RoomRole,
  type RoomTicket,
  type MediaKind,
  type ServerMessage,
  type SfuServerMessage,
} from "../../shared-protocol/src";
import { Board, parseStroke } from "./board";
import { LobbyReporter } from "./discord";
import { COUNTRY_HEADER, ROOM_HEADER, SPAWN_HEADER, TICKET_HEADER } from "./headers";
import { lobbyCopyNumber } from "./lobby-router";
import { SfuApi, SfuError, type SfuTrack } from "./sfu";

const DEFAULT_SPAWN = { x: 5, y: 5 };
const HEARTBEAT_TIMEOUT_MS = 90_000;
const MAX_STEP_TILES = 2;
const MEETING_ID = /^[a-z0-9-]{1,32}$/;

/** Per-socket limits. Kept in the attachment, so they survive hibernation. */
const LIMITS = {
  movesPerSecond: 6,
  actionsPerSecond: 4,
  drawsPerSecond: 30,
  sfuOpsPerSecond: 10,
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
  seat: number | null;
  meeting: string | null;
  link: string | null;
  /** This person's SFU session and the tracks they publish, while at a meeting table. */
  media: { sessionId: string; tracks: { mid: string; kind: MediaKind }[] } | null;
  joinedAt: number;
  lastSeenAt: number;
  /** Set when this socket was closed on purpose, so its close event doesn't announce a departure. */
  leaving: boolean;
  second: number;
  moves: number;
  actions: number;
  draws: number;
  sfuOps: number;
  messages: number;
  chatWindow: number;
  chats: number;
}

/**
 * One workspace room, or one copy of the public lobby.
 *
 * Built for hibernation: no timers, every message is handled and broadcast on
 * the spot, and everything needed after waking up lives in the WebSocket
 * attachments or the room's SQLite. The heartbeat is answered by the runtime
 * without waking the room.
 */
export class Room extends DurableObject<Env> {
  private readonly board: Board;
  private readonly reporter: LobbyReporter;
  private readonly sfuApi: SfuApi;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(HEARTBEAT_PING, HEARTBEAT_PONG));
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS room_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    this.board = new Board(ctx.storage.sql);
    this.reporter = new LobbyReporter(env.DISCORD_WEBHOOK_URL);
    this.sfuApi = new SfuApi(env.REALTIME_APP_ID, env.REALTIME_APP_SECRET);
  }

  presenceCount(): number {
    return this.present().length;
  }

  /** The room was deleted or archived: everyone leaves. */
  disconnectAll(): void {
    for (const socket of this.present()) this.closeQuietly(socket, CloseCode.RoomClosed, "room_closed");
  }

  /** A guest link was revoked: whoever came in through it leaves. */
  disconnectLink(linkId: string): void {
    for (const socket of this.present()) {
      const attachment = attachmentOf(socket);
      if (attachment.link !== linkId) continue;
      this.depart(attachment);
      this.closeQuietly(socket, CloseCode.AccessRevoked, "access_revoked", attachment);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const ticket = JSON.parse(request.headers.get(TICKET_HEADER) ?? "null") as RoomTicket | null;
    const room = request.headers.get(ROOM_HEADER);
    if (!ticket || !room) return new Response("Unauthorized", { status: 401 });

    const now = Date.now();
    this.dropStaleSockets(now);

    const { 0: client, 1: server } = new WebSocketPair();

    // One connection per person: the older one goes, without a player_left,
    // because the new one arrives as player_joined for the same id.
    for (const previous of this.ctx.getWebSockets(userTag(ticket.sub))) {
      const old = attachmentOf(previous);
      if (!old.leaving) this.leaveMeeting(old);
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
      seat: null,
      meeting: null,
      link: ticket.link ?? null,
      media: null,
      joinedAt: now,
      lastSeenAt: now,
      leaving: false,
      second: 0,
      moves: 0,
      actions: 0,
      draws: 0,
      sfuOps: 0,
      messages: 0,
      chatWindow: 0,
      chats: 0,
    };

    const others = this.present().map((socket) => playerState(attachmentOf(socket)));

    this.ctx.acceptWebSocket(server, [userTag(ticket.sub)]);
    server.serializeAttachment(attachment);

    send(server, { t: "welcome", self: playerState(attachment), players: others, music: this.music() });
    this.broadcast({ t: "player_joined", player: playerState(attachment) }, server);
    this.reportToDiscord(room, {
      kind: "join",
      name: attachment.name,
      character: attachment.character,
      country: request.headers.get(COUNTRY_HEADER) ?? "",
    });
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
      case "sit":
        this.sit(socket, me, message);
        break;
      case "stand":
        this.stand(me, message.x, message.y);
        break;
      case "status":
        this.setStatus(me, message.status);
        break;
      case "chat":
        this.chat(socket, me, message.text, now);
        break;
      case "board_sync":
        send(socket, { t: "board_state", strokes: this.board.strokes() });
        break;
      case "board_draw":
        this.draw(socket, me, message);
        break;
      case "board_clear":
        this.clearBoard(me);
        break;
      case "music_set":
        this.setMusic(me, message, now);
        break;
      case "call":
        this.relayCall(socket, me, message);
        break;
      case "sfu":
        // SFU calls wait on the network, and other messages from this person may
        // be handled meanwhile, so save first and let the handler re-read.
        me.sfuOps++;
        socket.serializeAttachment(me);
        if (me.sfuOps <= LIMITS.sfuOpsPerSecond) await this.sfu(socket, message);
        return;
      default:
        send(socket, { t: "error", code: "bad_message" });
    }
    socket.serializeAttachment(me);

    if (this.dropStaleSockets(now)) await this.reportHeadcount(me.room);
  }

  async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    if (this.farewell(socket, code)) await this.reportHeadcount(attachmentOf(socket).room);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    if (this.farewell(socket, 1011)) await this.reportHeadcount(attachmentOf(socket).room);
  }

  // Handlers below change `me`; webSocketMessage saves it once they return.

  private move(socket: WebSocket, me: Attachment, x: number, y: number): void {
    me.moves++;
    const step = Math.max(Math.abs(x - me.x), Math.abs(y - me.y));
    if (me.moves > LIMITS.movesPerSecond || !isInsideMap(x, y) || step > MAX_STEP_TILES) {
      if (me.moves <= LIMITS.movesPerSecond + 1) send(socket, { t: "move_rejected", x: me.x, y: me.y });
      return;
    }
    this.leaveSeat(me);
    me.x = x;
    me.y = y;
    this.broadcast({ t: "moved", id: me.userId, x, y }, socket);
  }

  private walkTo(socket: WebSocket, me: Attachment, x: number, y: number): void {
    if (!this.takeAction(me) || !isInsideMap(x, y)) return;
    this.leaveSeat(me);
    me.x = x;
    me.y = y;
    this.broadcast({ t: "walking", id: me.userId, x, y }, socket);
  }

  private sit(socket: WebSocket, me: Attachment, message: Extract<ClientMessage, { t: "sit" }>): void {
    if (!this.takeAction(me)) return;
    const { seat, x, y, meeting } = message;
    if (!Number.isInteger(seat) || seat < 0 || seat > 9999 || !isInsideMap(x, y)) return;
    if (meeting !== undefined && (typeof meeting !== "string" || !MEETING_ID.test(meeting))) return;

    const taken = this.present().some((other) => {
      const them = attachmentOf(other);
      return them.userId !== me.userId && them.seat === seat;
    });
    if (taken) {
      send(socket, { t: "sit_rejected", seat });
      return;
    }

    this.leaveSeat(me);
    me.seat = seat;
    me.x = x;
    me.y = y;
    this.broadcast({ t: "sat", id: me.userId, seat, x, y }, socket);

    if (meeting) {
      const members = this.meetingMembers(meeting).map((other) => memberOf(attachmentOf(other)));
      me.meeting = meeting;
      send(socket, { t: "meeting_joined", meeting, members });
      this.broadcastToMeeting(meeting, { t: "meeting_member_joined", ...memberOf(me) }, me.userId);
      for (const other of this.meetingMembers(meeting)) {
        const them = attachmentOf(other);
        if (them.userId !== me.userId && them.media?.tracks.length) {
          sendSfu(socket, { op: "tracks", userId: them.userId, kinds: them.media.tracks.map((track) => track.kind) });
        }
      }
    }
  }

  private stand(me: Attachment, x: number, y: number): void {
    if (!this.takeAction(me)) return;
    if (isInsideMap(x, y)) {
      me.x = x;
      me.y = y;
    }
    this.leaveSeat(me);
  }

  private setStatus(me: Attachment, status: PresenceStatus): void {
    if (!this.takeAction(me) || !PRESENCE_STATUSES.includes(status)) return;
    me.status = status;
    this.broadcast({ t: "status", id: me.userId, status });
  }

  private chat(socket: WebSocket, me: Attachment, text: unknown, now: number): void {
    if (now - me.chatWindow >= 10_000) {
      me.chatWindow = now;
      me.chats = 0;
    }
    me.chats++;
    if (me.chats > LIMITS.chatsPerTenSeconds) {
      send(socket, { t: "error", code: "slow_down" });
      return;
    }
    const trimmed = typeof text === "string" ? text.trim().slice(0, CHAT_MAX_LENGTH) : "";
    if (!trimmed) return;

    this.broadcast({ t: "chat", id: me.userId, name: me.name, text: trimmed, at: now });
    this.reportToDiscord(me.room, { kind: "chat", name: me.name, text: trimmed });
  }

  private draw(socket: WebSocket, me: Attachment, message: object): void {
    me.draws++;
    if (me.draws > LIMITS.drawsPerSecond) return;
    const stroke = parseStroke(message);
    if (!stroke) return;
    this.board.append(stroke);
    this.broadcast({ t: "board_draw", by: me.userId, ...stroke }, socket);
  }

  private clearBoard(me: Attachment): void {
    if (!this.takeAction(me)) return;
    this.board.clear();
    this.broadcast({ t: "board_clear", by: me.userId });
  }

  private setMusic(me: Attachment, input: object, now: number): void {
    if (!this.takeAction(me)) return;
    const message = input as Record<string, unknown>;
    const current = this.music();
    const music: MusicState = {
      track: Number.isInteger(message.track) ? Math.max(0, message.track as number) : current.track,
      playing: typeof message.playing === "boolean" ? message.playing : current.playing,
      startedAt: now,
      offset:
        typeof message.offset === "number" && Number.isFinite(message.offset) ? Math.max(0, message.offset) : 0,
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO room_state (key, value) VALUES ('music', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      JSON.stringify(music),
    );
    this.broadcast({ t: "music", ...music });
  }

  private music(): MusicState {
    const row = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM room_state WHERE key = 'music'")
      .toArray()[0];
    return row ? (JSON.parse(row.value) as MusicState) : { track: 0, playing: false, startedAt: 0, offset: 0 };
  }

  /** Counts one of the shared per-second actions; false when over the limit. */
  private takeAction(me: Attachment): boolean {
    me.actions++;
    return me.actions <= LIMITS.actionsPerSecond;
  }

  /** Getting up from a chair, by standing or by walking off, also leaves its table's meeting. */
  private leaveSeat(me: Attachment): void {
    if (me.seat === null) return;
    this.leaveMeeting(me);
    me.seat = null;
    this.broadcast({ t: "stood", id: me.userId }, undefined, me.userId);
  }

  /** Leaving a table also stops the person's SFU tracks, so nobody keeps receiving them. */
  private leaveMeeting(me: Attachment): void {
    if (me.meeting === null) return;
    const meeting = me.meeting;
    me.meeting = null;
    if (me.media) {
      const { sessionId, tracks } = me.media;
      me.media = null;
      this.ctx.waitUntil(this.sfuApi.closeTracks(sessionId, tracks.map((track) => track.mid)).catch(() => undefined));
      this.broadcastToMeeting(meeting, { t: "sfu", op: "gone", userId: me.userId }, me.userId);
    }
    this.broadcastToMeeting(meeting, { t: "meeting_member_left", id: me.userId }, me.userId);
  }

  /**
   * Peer-to-peer call signalling, relayed to one person with the sender added.
   * If they aren't here, the caller hears the call ended, as with the Java server.
   */
  private relayCall(socket: WebSocket, me: Attachment, message: Record<string, unknown>): void {
    const { kind, to } = message;
    if (!CALL_KINDS.includes(kind as never) || typeof to !== "string") return;
    const targets = this.ctx.getWebSockets(userTag(to)).filter((target) => !attachmentOf(target).leaving);
    if (!targets.length) {
      if (kind !== "end") send(socket, { t: "call", kind: "end", from: to, fromName: "" });
      return;
    }

    let data = message.data;
    if (kind === "add") {
      // Adding someone to a call: name them from the room's own record, not the sender's word.
      const id = (data as { id?: unknown } | undefined)?.id;
      const added = typeof id === "string" ? this.ctx.getWebSockets(userTag(id))[0] : undefined;
      if (!added) return;
      data = { id, name: attachmentOf(added).name };
    }
    const relayed = JSON.stringify({ t: "call", kind, from: me.userId, fromName: me.name, data });
    for (const target of targets) sendText(target, relayed);
  }

  /** Meeting-table media through the SFU. The room decides who may publish and watch what. */
  private async sfu(socket: WebSocket, message: Record<string, unknown>): Promise<void> {
    const me = attachmentOf(socket);
    const meeting = me.meeting;
    if (!meeting) return sendSfu(socket, { op: "error", code: "not_in_meeting" });

    try {
      switch (message.op) {
        case "publish":
          return await this.sfuPublish(socket, meeting, message);
        case "unpublish":
          return await this.sfuUnpublish(socket, meeting, message);
        case "subscribe":
          return await this.sfuSubscribe(socket, meeting, message);
        case "unsubscribe": {
          const mids = stringList(message.mids, 20);
          if (!mids || !me.media) return sendSfu(socket, { op: "error", code: "bad_request" });
          return await this.sfuApi.closeTracks(me.media.sessionId, mids);
        }
        case "answer":
          if (typeof message.sdp !== "string" || !me.media) return sendSfu(socket, { op: "error", code: "bad_request" });
          return await this.sfuApi.renegotiate(me.media.sessionId, message.sdp);
        case "layer":
          return await this.sfuLayer(socket, meeting, message);
        default:
          return sendSfu(socket, { op: "error", code: "bad_request" });
      }
    } catch (error) {
      if (!(error instanceof SfuError)) throw error;
      sendSfu(socket, { op: "error", code: error.code });
    }
  }

  private async sfuPublish(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const tracks = Array.isArray(message.tracks) ? (message.tracks as { mid?: unknown; kind?: unknown }[]) : [];
    const valid =
      typeof message.sdp === "string" &&
      tracks.length > 0 &&
      tracks.length <= MEDIA_KINDS.length &&
      tracks.every((track) => typeof track.mid === "string" && MEDIA_KINDS.includes(track.kind as MediaKind)) &&
      new Set(tracks.map((track) => track.kind)).size === tracks.length;
    if (!valid) return sendSfu(socket, { op: "error", code: "bad_request" });
    const published = tracks as { mid: string; kind: MediaKind }[];

    const sessionId = await this.sessionFor(socket);
    const result = await this.sfuApi.newTracks(
      sessionId,
      published.map((track) => ({ location: "local", mid: track.mid, trackName: track.kind })),
      message.sdp as string,
    );

    const me = attachmentOf(socket);
    if (me.meeting !== meeting || !me.media) {
      // They left the table while the SFU was answering.
      await this.sfuApi.closeTracks(sessionId, published.map((track) => track.mid));
      return;
    }
    const kinds = published.map((track) => track.kind);
    me.media.tracks = me.media.tracks.filter((track) => !kinds.includes(track.kind)).concat(published);
    socket.serializeAttachment(me);

    sendSfu(socket, { op: "published", sdp: result.sessionDescription?.sdp ?? "" });
    this.broadcastToMeeting(meeting, { t: "sfu", op: "tracks", userId: me.userId, kinds }, me.userId);
  }

  private async sfuUnpublish(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const kinds = Array.isArray(message.kinds)
      ? (message.kinds.filter((kind) => MEDIA_KINDS.includes(kind)) as MediaKind[])
      : [];
    const me = attachmentOf(socket);
    if (!me.media || !kinds.length) return sendSfu(socket, { op: "error", code: "bad_request" });

    const closing = me.media.tracks.filter((track) => kinds.includes(track.kind));
    me.media.tracks = me.media.tracks.filter((track) => !kinds.includes(track.kind));
    socket.serializeAttachment(me);
    this.broadcastToMeeting(
      meeting,
      { t: "sfu", op: "untracks", userId: me.userId, kinds: closing.map((track) => track.kind) },
      me.userId,
    );
    await this.sfuApi.closeTracks(me.media.sessionId, closing.map((track) => track.mid));
  }

  private async sfuSubscribe(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const wanted = Array.isArray(message.tracks)
      ? (message.tracks as { userId?: unknown; kind?: unknown; layer?: unknown }[]).slice(0, 30)
      : [];
    const me = attachmentOf(socket);
    const found: { userId: string; kind: MediaKind; track: SfuTrack }[] = [];
    for (const want of wanted) {
      if (typeof want.userId !== "string" || want.userId === me.userId) continue;
      const publisher = this.publisher(meeting, want.userId);
      const kind = want.kind as MediaKind;
      if (!publisher?.media?.tracks.some((track) => track.kind === kind)) continue;
      found.push({
        userId: want.userId,
        kind,
        track: {
          location: "remote",
          sessionId: publisher.media.sessionId,
          trackName: kind,
          ...(kind === "camera" ? { simulcast: simulcast(want.layer) } : {}),
        },
      });
    }
    if (!found.length) return sendSfu(socket, { op: "error", code: "no_tracks" });

    const sessionId = await this.sessionFor(socket);
    const result = await this.sfuApi.newTracks(
      sessionId,
      found.map((item) => item.track),
    );
    sendSfu(socket, {
      op: "offer",
      sdp: result.requiresImmediateRenegotiation ? (result.sessionDescription?.sdp ?? "") : "",
      tracks: found.map((item, index) => ({ userId: item.userId, kind: item.kind, mid: result.tracks?.[index]?.mid ?? "" })),
    });
  }

  private async sfuLayer(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const me = attachmentOf(socket);
    const publisher = typeof message.userId === "string" ? this.publisher(meeting, message.userId) : null;
    if (!me.media || !publisher?.media || typeof message.mid !== "string" || !CAMERA_LAYERS.includes(message.layer as never)) {
      return sendSfu(socket, { op: "error", code: "bad_request" });
    }
    const result = await this.sfuApi.updateTracks(me.media.sessionId, [
      {
        location: "remote",
        sessionId: publisher.media.sessionId,
        trackName: "camera",
        mid: message.mid,
        simulcast: simulcast(message.layer),
      },
    ]);
    if (result.requiresImmediateRenegotiation && result.sessionDescription) {
      sendSfu(socket, { op: "offer", sdp: result.sessionDescription.sdp, tracks: [] });
    }
  }

  /** The person's SFU session, created on first use and kept while they stay at the table. */
  private async sessionFor(socket: WebSocket): Promise<string> {
    const existing = attachmentOf(socket).media;
    if (existing) return existing.sessionId;
    const sessionId = await this.sfuApi.newSession();
    const me = attachmentOf(socket);
    if (me.media) return me.media.sessionId; // Another message made one meanwhile.
    me.media = { sessionId, tracks: [] };
    socket.serializeAttachment(me);
    return sessionId;
  }

  private publisher(meeting: string, userId: string): Attachment | null {
    for (const socket of this.meetingMembers(meeting)) {
      const attachment = attachmentOf(socket);
      if (attachment.userId === userId) return attachment;
    }
    return null;
  }

  private meetingMembers(meeting: string): WebSocket[] {
    return this.present().filter((socket) => attachmentOf(socket).meeting === meeting);
  }

  private broadcastToMeeting(meeting: string, message: ServerMessage, exceptUserId: string): void {
    const text = JSON.stringify(message);
    for (const socket of this.meetingMembers(meeting)) {
      if (attachmentOf(socket).userId !== exceptUserId) sendText(socket, text);
    }
  }

  /** Counts this message against the socket's per-second budget; false when it must be dropped. */
  private withinLimits(socket: WebSocket, me: Attachment, now: number): boolean {
    const second = Math.floor(now / 1000);
    if (second !== me.second) {
      me.second = second;
      me.moves = 0;
      me.actions = 0;
      me.draws = 0;
      me.sfuOps = 0;
      me.messages = 0;
    }
    me.messages++;

    if (me.messages > LIMITS.messagesPerSecond) {
      this.depart(me);
      this.closeQuietly(socket, CloseCode.TooManyMessages, "too_many_messages", me);
      return false;
    }
    return true;
  }

  /**
   * A client that vanishes without closing isn't noticed straight away. Whenever
   * the room is awake anyway, anyone without a heartbeat or message for 90
   * seconds is let go. No timer is involved. Returns whether anyone was dropped.
   */
  private dropStaleSockets(now: number): boolean {
    let dropped = false;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = attachmentOf(socket);
      if (attachment.leaving) continue;
      const heartbeat = this.ctx.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0;
      if (now - Math.max(heartbeat, attachment.lastSeenAt) > HEARTBEAT_TIMEOUT_MS) {
        this.depart(attachment);
        this.closeQuietly(socket, 1001, "stale", attachment);
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

    this.depart(attachment);
    attachment.leaving = true;
    socket.serializeAttachment(attachment);
    return true;
  }

  /** Tells everyone else this person has gone. Leaving the room also leaves their meeting. */
  private depart(attachment: Attachment): void {
    this.leaveMeeting(attachment);
    this.broadcast({ t: "player_left", id: attachment.userId }, undefined, attachment.userId);
  }

  /** Lobby copies tell the router how many people they hold; other rooms don't. */
  private async reportHeadcount(room: string): Promise<void> {
    if (lobbyCopyNumber(room) === null) return;
    await this.env.LOBBY.getByName("global").report(room, this.present().length);
  }

  /** Only lobby copies report to Discord; workspace rooms never do. */
  private reportToDiscord(
    room: string,
    event: { kind: "join"; name: string; character: string; country: string } | { kind: "chat"; name: string; text: string },
  ): void {
    if (lobbyCopyNumber(room) === null) return;
    const request = this.reporter.report({ ...event, copy: room });
    if (request) this.ctx.waitUntil(request);
  }

  private closeQuietly(socket: WebSocket, code: number, reason: string, attachment = attachmentOf(socket)): void {
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

  private broadcast(message: ServerMessage, except?: WebSocket, exceptUserId?: string): void {
    const text = JSON.stringify(message);
    for (const socket of this.present()) {
      if (socket === except) continue;
      if (exceptUserId !== undefined && attachmentOf(socket).userId === exceptUserId) continue;
      sendText(socket, text);
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
    seat: attachment.seat,
  };
}

function sendSfu(socket: WebSocket, message: SfuServerMessage): void {
  send(socket, { t: "sfu", ...message });
}

/** Simulcast preferences: the requested layer, falling back to the next best one available. */
function simulcast(layer: unknown): NonNullable<SfuTrack["simulcast"]> {
  return {
    preferredRid: CAMERA_LAYERS.includes(layer as never) ? (layer as string) : "h",
    priorityOrdering: "asciibetical",
    ridNotAvailable: "asciibetical",
  };
}

function stringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  return value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

function memberOf(attachment: Attachment): MeetingMember {
  return { id: attachment.userId, name: attachment.name };
}

function send(socket: WebSocket, message: ServerMessage): void {
  sendText(socket, JSON.stringify(message));
}

function sendText(socket: WebSocket, text: string): void {
  try {
    socket.send(text);
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
