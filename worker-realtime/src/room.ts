import { DurableObject } from "cloudflare:workers";
import {
  CALL_KINDS,
  VIDEO_QUALITIES,
  MEDIA_KINDS,
  CloseCode,
  HEARTBEAT_PING,
  HEARTBEAT_PONG,
  PRESENCE_STATUSES,
  isInsideMap,
  MAIN_MEETING,
  MEETING_ID,
  MEETING_NAME_MAX,
  type ClientMessage,
  type MeetingErrorCode,
  type MeetingInfo,
  type MeetingMember,
  type MusicState,
  type PlayerState,
  type PresenceStatus,
  type PresentPerson,
  type RoomRole,
  type RoomTicket,
  type MediaFlags,
  type MediaKind,
  type VideoKind,
  type VideoQuality,
  type ServerMessage,
  type SfuServerMessage,
  type Whereabouts,
} from "../../shared-protocol/src";
import { Board, parseStroke } from "./board";
import { Reporter } from "./discord";
import { ROOM_HEADER, SPAWN_HEADER, TICKET_HEADER, WHERE_HEADER } from "./headers";
import { lobbyCopyNumber } from "./lobby";
import { MeetingClock } from "./meeting-clock";
import { SfuApi, SfuError, type SfuTrack } from "./sfu";
import { Usage } from "./usage";

const DEFAULT_SPAWN = { x: 5, y: 5 };
const HEARTBEAT_TIMEOUT_MS = 90_000;
/** How often, at most, the room looks for sockets that stopped answering. */
const SWEEP_EVERY_MS = 10_000;
/** Video a person may be sent at once in a meeting: the four speakers they see, a screen, and one to swap in. */
const MAX_VIDEO_SUBSCRIPTIONS = 6;
/** How many people one invitation can ask in. */
const MAX_INVITES = 20;

/** Per-socket limits. Kept in the attachment, so they survive hibernation. */
const LIMITS = {
  // Walking crosses about 4 tiles a second, 6 on a diagonal; this leaves headroom.
  movesPerSecond: 12,
  actionsPerSecond: 4,
  drawsPerSecond: 30,
  sfuOpsPerSecond: 10,
  // Talking starts and stops a few times a second at most; the client holds it longer.
  speakingPerSecond: 4,
  messagesPerSecond: 60,
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
  /** When this person joined their meeting, for usage totals and the meeting's clock. */
  meetingSince: number | null;
  /** Whether they are talking in their meeting right now. */
  speaking: boolean;
  /**
   * This person's SFU session while in a meeting: the tracks they publish, and
   * the ones they are sent (by our side's mid), so the room can cap their video.
   */
  media: {
    sessionId: string;
    tracks: { mid: string; kind: MediaKind }[];
    subs?: { mid: string; userId: string; kind: MediaKind }[];
  } | null;
  /** What this person says is on in their meeting: mic, camera, screen. */
  flags: MediaFlags | null;
  joinedAt: number;
  lastSeenAt: number;
  /** Set when this socket was closed on purpose, so its close event doesn't announce a departure. */
  leaving: boolean;
  second: number;
  moves: number;
  actions: number;
  draws: number;
  sfuOps: number;
  speakingOps?: number;
  messages: number;
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
  /**
   * Attachments as they are right now. Reading one back from the socket costs a
   * deserialize, and a broadcast reads every socket's, so they are kept here
   * and only written back when something worth surviving hibernation changes.
   */
  private readonly attachments = new WeakMap<WebSocket, Attachment>();
  /** When the room last looked for sockets that went quiet, in memory only. */
  private sweptAt = 0;
  private board!: Board;
  private readonly reporter: Reporter;
  private readonly sfuApi: SfuApi;
  private usage!: Usage;
  /** Meeting hours, made once the room knows whether it is an office or a lobby copy. */
  private clockCache: MeetingClock | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(HEARTBEAT_PING, HEARTBEAT_PONG));
    this.reporter = new Reporter(env.DISCORD_WEBHOOK_URL);
    this.sfuApi = new SfuApi(env.REALTIME_APP_ID, env.REALTIME_APP_SECRET);
    this.createTables();
  }

  private createTables(): void {
    this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS room_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    // Meetings someone started. The main meeting has no row: it is always there.
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS meetings (id TEXT PRIMARY KEY, name TEXT, by_name TEXT, created_at INTEGER NOT NULL)",
    );
    this.board = new Board(this.ctx.storage.sql);
    this.usage = new Usage(this.ctx.storage.sql, this.env.DB);
  }

  presenceCount(): number {
    return this.present().length;
  }

  /** Who is here, once each, for a door or a dashboard that shows them before you walk in. */
  presentPeople(limit = 8): PresentPerson[] {
    const seen = new Map<string, PresentPerson>();
    for (const socket of this.present()) {
      const { userId, name, character, status } = this.attachmentOf(socket);
      if (!seen.has(userId)) seen.set(userId, { id: userId, name, character, status });
      if (seen.size >= limit) break;
    }
    return [...seen.values()];
  }

  private attachmentOf(socket: WebSocket): Attachment {
    let attachment = this.attachments.get(socket);
    if (!attachment) {
      attachment = socket.deserializeAttachment() as Attachment;
      this.attachments.set(socket, attachment);
    }
    return attachment;
  }

  /** Keeps an attachment through hibernation. Only state that must outlive it needs this. */
  private remember(socket: WebSocket, attachment: Attachment): void {
    this.attachments.set(socket, attachment);
    socket.serializeAttachment(attachment);
  }

  /** The room was deleted or archived: everyone leaves. */
  async disconnectAll(): Promise<void> {
    const sockets = this.present();
    for (const socket of sockets) {
      const attachment = this.attachmentOf(socket);
      this.leaveMeeting(attachment);
      this.closeQuietly(socket, CloseCode.RoomClosed, "room_closed", attachment);
    }
    if (sockets.length) await this.headcountChanged(this.attachmentOf(sockets[0]).room);
  }

  /** The room was deleted for good: everyone leaves and its storage goes. */
  async forget(): Promise<void> {
    await this.disconnectAll();
    // Pending usage was handed to D1 as everyone left, so nothing is lost here.
    await this.ctx.storage.deleteAll();
    this.clockCache = null;
    this.createTables();
  }

  /** A membership ended: that person leaves the floor. */
  async disconnectMember(userId: string): Promise<void> {
    let room: string | null = null;
    for (const socket of this.present()) {
      const attachment = this.attachmentOf(socket);
      if (attachment.userId !== userId) continue;
      this.depart(attachment);
      this.closeQuietly(socket, CloseCode.AccessRevoked, "access_revoked", attachment);
      room = attachment.room;
    }
    if (room) await this.headcountChanged(room);
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
      const old = this.attachmentOf(previous);
      if (!old.leaving) this.leaveMeeting(old);
      this.closeQuietly(previous, CloseCode.Replaced, "replaced");
    }

    if (this.present().length >= ticket.cap) {
      server.accept();
      server.close(CloseCode.RoomFull, "room_full");
      await this.headcountChanged(room);
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
      meetingSince: null,
      speaking: false,
      media: null,
      flags: null,
      joinedAt: now,
      lastSeenAt: now,
      leaving: false,
      second: 0,
      moves: 0,
      actions: 0,
      draws: 0,
      sfuOps: 0,
      messages: 0,
    };

    const others = this.present().map((socket) => playerState(this.attachmentOf(socket)));
    this.nameRoom(room);
    if (typeof ticket.hours === "number" && this.clock()?.setAllowance(ticket.hours)) this.clockChanged(room, now);

    this.ctx.acceptWebSocket(server, [userTag(ticket.sub)]);
    this.remember(server, attachment);

    send(server, {
      t: "welcome",
      self: playerState(attachment),
      players: others,
      music: this.music(),
      meetings: this.meetingsOf(room),
      usage: this.clock()!.usage(now),
    });
    this.broadcast({ t: "player_joined", player: playerState(attachment) }, server);
    this.reportToDiscord(room, attachment.name, attachment.character, request.headers.get(WHERE_HEADER));
    await this.headcountChanged(room);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const now = Date.now();
    const me = this.attachmentOf(socket);
    if (me.leaving) return;

    me.lastSeenAt = now;
    if (!this.withinLimits(socket, me, now)) {
      await this.headcountChanged(me.room);
      return;
    }

    const message = parse(raw);
    if (!message) {
      this.remember(socket, me);
      send(socket, { t: "error", code: "bad_message" });
      return;
    }

    switch (message.t) {
      case "move":
        this.move(socket, me, message.x, message.y, message.d);
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
      case "meeting_join":
        this.joinMeeting(socket, me, message.meeting);
        break;
      case "meeting_start":
        this.startMeeting(socket, me, message);
        break;
      case "meeting_leave":
        if (this.takeAction(me)) this.leaveMeeting(me);
        break;
      case "meeting_invite":
        this.invite(me, message.to);
        break;
      case "speaking":
        this.setSpeaking(me, message.on);
        break;
      case "sfu":
        // SFU calls wait on the network, and other messages from this person may
        // be handled meanwhile, so save first and let the handler re-read.
        me.sfuOps++;
        this.remember(socket, me);
        if (me.sfuOps <= LIMITS.sfuOpsPerSecond) await this.sfu(socket, message as unknown as Record<string, unknown>);
        return;
      default:
        send(socket, { t: "error", code: "bad_message" });
    }
    this.remember(socket, me);

    if (this.dropStaleSockets(now)) await this.headcountChanged(me.room);
  }

  async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    if (this.farewell(socket, code)) await this.headcountChanged(this.attachmentOf(socket).room);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    if (this.farewell(socket, 1011)) await this.headcountChanged(this.attachmentOf(socket).room);
  }

  // Handlers below change `me`; webSocketMessage saves it once they return.

  /**
   * Where someone's feet are, tile by tile. There is no distance check: a click
   * to walk records the destination straight away, so steering off halfway
   * legitimately "jumps" back from it. Over the rate limit, moves are dropped
   * quietly; the client sends its final tile when it stops, which catches up.
   */
  private move(socket: WebSocket, me: Attachment, x: number, y: number, d: unknown): void {
    if (!isInsideMap(x, y)) {
      send(socket, { t: "move_rejected", x: me.x, y: me.y });
      return;
    }
    me.moves++;
    if (me.moves > LIMITS.movesPerSecond) return;
    this.leaveSeat(me);
    me.x = x;
    me.y = y;
    const heading = Number.isInteger(d) && (d as number) >= 0 && (d as number) < 8 ? { d: d as number } : {};
    this.broadcast({ t: "moved", id: me.userId, x, y, ...heading }, socket);
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
    const { seat, x, y } = message;
    if (!Number.isInteger(seat) || seat < 0 || seat > 9999 || !isInsideMap(x, y)) return;

    const taken = this.present().some((other) => {
      const them = this.attachmentOf(other);
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

  /** Getting up from a chair, by standing or by walking off. Chairs have nothing to do with meetings. */
  private leaveSeat(me: Attachment): void {
    if (me.seat === null) return;
    me.seat = null;
    this.broadcast({ t: "stood", id: me.userId }, undefined, me.userId);
  }

  private meetingError(socket: WebSocket, code: MeetingErrorCode): void {
    send(socket, { t: "meeting_error", code });
  }

  /** Joining the main meeting, or one someone started. Any other meeting is left first. */
  private joinMeeting(socket: WebSocket, me: Attachment, meeting: unknown): void {
    if (!this.takeAction(me)) return;
    if (typeof meeting !== "string" || !MEETING_ID.test(meeting)) return this.meetingError(socket, "not_found");
    if (me.meeting === meeting) return;
    if (meeting !== MAIN_MEETING && !this.meetingRow(meeting)) return this.meetingError(socket, "not_found");
    this.enterMeeting(socket, me, meeting);
  }

  /** Someone starts a meeting of their own, joins it, and asks people in. */
  private startMeeting(socket: WebSocket, me: Attachment, message: Extract<ClientMessage, { t: "meeting_start" }>): void {
    if (!this.takeAction(me)) return;
    const id = `m-${randomId(8)}`;
    this.ctx.storage.sql.exec(
      "INSERT INTO meetings (id, name, by_name, created_at) VALUES (?, ?, ?, ?)",
      id,
      cleanMeetingName(message.name),
      me.name,
      Date.now(),
    );
    this.enterMeeting(socket, me, id);
    this.invite(me, message.invite, false);
  }

  private enterMeeting(socket: WebSocket, me: Attachment, meeting: string): void {
    // Out of the old meeting quietly: the list goes out once, with both changes.
    this.leaveMeeting(me, false);
    const members = this.meetingMembers(meeting).map((other) => memberOf(this.attachmentOf(other)));
    me.meeting = meeting;
    me.meetingSince = Date.now();
    me.speaking = false;
    this.remember(socket, me);
    send(socket, { t: "meeting_joined", meeting, members });
    this.broadcastToMeeting(meeting, { t: "meeting_member_joined", ...memberOf(me) }, me.userId);
    for (const other of this.meetingMembers(meeting)) {
      const them = this.attachmentOf(other);
      if (them.userId === me.userId) continue;
      if (them.media?.tracks.length) {
        sendSfu(socket, { op: "tracks", userId: them.userId, kinds: them.media.tracks.map((track) => track.kind) });
      }
      if (them.flags) sendSfu(socket, { op: "media", userId: them.userId, ...them.flags });
    }
    this.announceMeetings(me.room);
    this.meetingCounted(me.room, meeting);
  }

  /** Asks people into the meeting you are in: each hears who, and which meeting. */
  private invite(me: Attachment, to: unknown, counted = true): void {
    if (counted && !this.takeAction(me)) return;
    if (!me.meeting || !Array.isArray(to)) return;
    const name = me.meeting === MAIN_MEETING ? null : (this.meetingRow(me.meeting)?.name ?? null);
    const text = JSON.stringify({ t: "meeting_invited", from: me.userId, fromName: me.name, meeting: me.meeting, name });
    const asked = new Set(to.filter((id): id is string => typeof id === "string" && id !== me.userId).slice(0, MAX_INVITES));
    for (const id of asked) {
      for (const target of this.ctx.getWebSockets(userTag(id))) {
        const them = this.attachmentOf(target);
        if (!them.leaving && them.meeting !== me.meeting) sendText(target, text);
      }
    }
  }

  /** Talking or not, in a meeting: everyone in the room hears it, so the meeting shows who is talking to anyone looking. */
  private setSpeaking(me: Attachment, on: unknown): void {
    me.speakingOps = (me.speakingOps ?? 0) + 1;
    if (me.speakingOps > LIMITS.speakingPerSecond || !me.meeting || typeof on !== "boolean" || me.speaking === on) return;
    me.speaking = on;
    this.broadcast({ t: "speaking", id: me.userId, on });
  }

  /**
   * Out of a meeting: their tracks stop, so nobody keeps receiving them, and
   * whoever was watching them is no longer counted as doing so.
   */
  private leaveMeeting(me: Attachment, announce = true): void {
    if (me.meeting === null) return;
    const meeting = me.meeting;
    me.meeting = null;
    me.flags = null;
    me.speaking = false;
    this.meetingCounted(me.room, meeting);
    if (me.meetingSince !== null) {
      const now = Date.now();
      this.usage.stayed(0, now - me.meetingSince, 0, now);
      me.meetingSince = null;
    }
    if (me.media) {
      const { sessionId, tracks } = me.media;
      me.media = null;
      this.ctx.waitUntil(this.sfuApi.closeTracks(sessionId, tracks.map((track) => track.mid)).catch(() => undefined));
      this.broadcastToMeeting(meeting, { t: "sfu", op: "gone", userId: me.userId }, me.userId);
    }
    for (const socket of this.meetingMembers(meeting)) {
      const them = this.attachmentOf(socket);
      if (!them.media?.subs?.some((sub) => sub.userId === me.userId)) continue;
      them.media.subs = them.media.subs.filter((sub) => sub.userId !== me.userId);
      this.remember(socket, them);
    }
    this.broadcastToMeeting(meeting, { t: "meeting_member_left", id: me.userId }, me.userId);
    if (announce) this.announceMeetings(me.room);
  }

  private meetingRow(id: string): { name: string | null; by_name: string | null } | undefined {
    return this.ctx.storage.sql
      .exec<{ name: string | null; by_name: string | null }>("SELECT name, by_name FROM meetings WHERE id = ?", id)
      .toArray()[0];
  }

  /**
   * The meetings in this room: the main one always, then the ones people
   * started, oldest first. One nobody is in any more is gone for good.
   */
  private meetingsOf(room: string): MeetingInfo[] {
    const members = new Map<string, MeetingInfo["members"]>();
    for (const socket of this.present()) {
      const them = this.attachmentOf(socket);
      if (!them.meeting) continue;
      const list = members.get(them.meeting) ?? [];
      if (!list.some((one) => one.id === them.userId)) {
        list.push({
          id: them.userId,
          name: them.name,
          character: them.character,
          since: them.meetingSince ?? 0,
          speaking: them.speaking,
        });
      }
      members.set(them.meeting, list);
    }
    const info = (id: string, name: string | null, by: string | null): MeetingInfo => {
      const list = (members.get(id) ?? []).sort((a, b) => a.since - b.since);
      return { id, name, by, startedAt: list[0]?.since ?? null, members: list };
    };

    const started = this.ctx.storage.sql
      .exec<{ id: string; name: string | null; by_name: string | null }>("SELECT id, name, by_name FROM meetings ORDER BY created_at")
      .toArray();
    const empty = started.filter((row) => !members.has(row.id));
    for (const row of empty) this.ctx.storage.sql.exec("DELETE FROM meetings WHERE id = ?", row.id);
    return [
      info(MAIN_MEETING, null, null),
      ...started.filter((row) => members.has(row.id)).map((row) => info(row.id, row.name, row.by_name)),
    ];
  }

  /** Everyone in the room gets the meetings whole: small, and never out of step. */
  private announceMeetings(room: string): void {
    this.broadcast({ t: "meetings", meetings: this.meetingsOf(room) });
  }

  /**
   * One-to-one call signalling, passed to one person with the sender added.
   * If they aren't here, the caller hears the call ended, as with the Java server.
   */
  private relayCall(socket: WebSocket, me: Attachment, message: Record<string, unknown>): void {
    const { kind, to } = message;
    if (!CALL_KINDS.includes(kind as never) || typeof to !== "string") return;
    const targets = this.ctx.getWebSockets(userTag(to)).filter((target) => !this.attachmentOf(target).leaving);
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
      data = { ...(data as object), id, name: this.attachmentOf(added).name };
    }
    const relayed = JSON.stringify({ t: "call", kind, from: me.userId, fromName: me.name, data });
    for (const target of targets) sendText(target, relayed);
  }

  /** Meeting media through the SFU. The room decides who may publish and watch what, and how much. */
  private async sfu(socket: WebSocket, message: Record<string, unknown>): Promise<void> {
    const me = this.attachmentOf(socket);
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
          // Only tracks still open: the room may have closed some already (video paused).
          const open = mids.filter((mid) => (me.media?.subs ?? []).some((sub) => sub.mid === mid));
          me.media.subs = (me.media.subs ?? []).filter((sub) => !mids.includes(sub.mid));
          this.remember(socket, me);
          if (!open.length) return;
          return await this.sfuApi.closeTracks(me.media.sessionId, open);
        }
        case "answer":
          if (typeof message.sdp !== "string" || !me.media) return sendSfu(socket, { op: "error", code: "bad_request" });
          return await this.sfuApi.renegotiate(me.media.sessionId, message.sdp);
        case "media": {
          const flags = { mic: message.mic === true, camera: message.camera === true, screen: message.screen === true };
          const fresh = this.attachmentOf(socket);
          if (fresh.meeting !== meeting) return;
          fresh.flags = flags;
          this.remember(socket, fresh);
          return this.broadcastToMeeting(meeting, { t: "sfu", op: "media", userId: fresh.userId, ...flags }, fresh.userId);
        }
        case "quality":
          return await this.sfuQuality(socket, meeting, message);
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

    const me = this.attachmentOf(socket);
    if (me.meeting !== meeting || !me.media) {
      // They left the table while the SFU was answering.
      await this.sfuApi.closeTracks(sessionId, published.map((track) => track.mid));
      return;
    }
    const kinds = published.map((track) => track.kind);
    me.media.tracks = me.media.tracks.filter((track) => !kinds.includes(track.kind)).concat(published);
    this.remember(socket, me);

    sendSfu(socket, { op: "published", sdp: result.sessionDescription?.sdp ?? "" });
    this.broadcastToMeeting(meeting, { t: "sfu", op: "tracks", userId: me.userId, kinds }, me.userId);
  }

  private async sfuUnpublish(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const kinds = Array.isArray(message.kinds)
      ? (message.kinds.filter((kind) => MEDIA_KINDS.includes(kind)) as MediaKind[])
      : [];
    const me = this.attachmentOf(socket);
    if (!me.media || !kinds.length) return sendSfu(socket, { op: "error", code: "bad_request" });

    const closing = me.media.tracks.filter((track) => kinds.includes(track.kind));
    me.media.tracks = me.media.tracks.filter((track) => !kinds.includes(track.kind));
    this.remember(socket, me);
    this.broadcastToMeeting(
      meeting,
      { t: "sfu", op: "untracks", userId: me.userId, kinds: closing.map((track) => track.kind) },
      me.userId,
    );
    await this.sfuApi.closeTracks(me.media.sessionId, closing.map((track) => track.mid));
  }

  private async sfuSubscribe(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const wanted = Array.isArray(message.tracks)
      ? (message.tracks as { userId?: unknown; kind?: unknown; quality?: unknown }[]).slice(0, 30)
      : [];
    const me = this.attachmentOf(socket);
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
          ...(kind === "mic" ? {} : { simulcast: simulcast(want.quality) }),
        },
      });
    }
    // Past the meeting hours, meetings are voice only until the period resets (docs/14).
    if (this.clock()?.usage(Date.now()).paused) {
      const voices = found.filter((item) => item.kind === "mic");
      if (!voices.length) return sendSfu(socket, { op: "error", code: found.length ? "video_paused" : "no_tracks" });
      found.length = 0;
      found.push(...voices);
    }
    // Video is what costs: past the cap, the extra cameras and screens are left out.
    let room = MAX_VIDEO_SUBSCRIPTIONS - (me.media?.subs ?? []).filter((sub) => sub.kind !== "mic").length;
    const allowed = found.filter((item) => item.kind === "mic" || room-- > 0);
    if (!allowed.length) return sendSfu(socket, { op: "error", code: found.length ? "too_much_video" : "no_tracks" });
    found.length = 0;
    found.push(...allowed);

    const sessionId = await this.sessionFor(socket);
    const result = await this.sfuApi.newTracks(
      sessionId,
      found.map((item) => item.track),
    );
    const subscriber = this.attachmentOf(socket);
    if (subscriber.media) {
      const added = found.flatMap((item, index) => {
        const mid = result.tracks?.[index]?.mid;
        return mid ? [{ mid, userId: item.userId, kind: item.kind }] : [];
      });
      subscriber.media.subs = [...(subscriber.media.subs ?? []), ...added];
      this.remember(socket, subscriber);
    }
    sendSfu(socket, {
      op: "offer",
      sdp: result.requiresImmediateRenegotiation ? (result.sessionDescription?.sdp ?? "") : "",
      tracks: found.map((item, index) => ({ userId: item.userId, kind: item.kind, mid: result.tracks?.[index]?.mid ?? "" })),
    });
  }

  /** Watching someone's camera or screen in the other quality. */
  private async sfuQuality(socket: WebSocket, meeting: string, message: Record<string, unknown>): Promise<void> {
    const me = this.attachmentOf(socket);
    const publisher = typeof message.userId === "string" ? this.publisher(meeting, message.userId) : null;
    const kind = message.kind as VideoKind;
    const valid =
      me.media &&
      publisher?.media &&
      typeof message.mid === "string" &&
      (kind === "camera" || kind === "screen") &&
      VIDEO_QUALITIES.includes(message.quality as never);
    if (!valid) return sendSfu(socket, { op: "error", code: "bad_request" });

    const result = await this.sfuApi.updateTracks(me.media!.sessionId, [
      {
        location: "remote",
        sessionId: publisher!.media!.sessionId,
        trackName: kind,
        mid: message.mid as string,
        simulcast: simulcast(message.quality),
      },
    ]);
    if (result.requiresImmediateRenegotiation && result.sessionDescription) {
      sendSfu(socket, { op: "offer", sdp: result.sessionDescription.sdp, tracks: [] });
    }
  }

  /** The person's SFU session, created on first use and kept while they stay at the table. */
  private async sessionFor(socket: WebSocket): Promise<string> {
    const existing = this.attachmentOf(socket).media;
    if (existing) return existing.sessionId;
    const sessionId = await this.sfuApi.newSession();
    const me = this.attachmentOf(socket);
    if (me.media) return me.media.sessionId; // Another message made one meanwhile.
    me.media = { sessionId, tracks: [] };
    this.remember(socket, me);
    return sessionId;
  }

  private publisher(meeting: string, userId: string): Attachment | null {
    for (const socket of this.meetingMembers(meeting)) {
      const attachment = this.attachmentOf(socket);
      if (attachment.userId === userId) return attachment;
    }
    return null;
  }

  private meetingMembers(meeting: string): WebSocket[] {
    return this.present().filter((socket) => this.attachmentOf(socket).meeting === meeting);
  }

  private broadcastToMeeting(meeting: string, message: ServerMessage, exceptUserId: string): void {
    const text = JSON.stringify(message);
    for (const socket of this.meetingMembers(meeting)) {
      if (this.attachmentOf(socket).userId !== exceptUserId) sendText(socket, text);
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
      me.speakingOps = 0;
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
    if (now - this.sweptAt < SWEEP_EVERY_MS) return false;
    this.sweptAt = now;
    let dropped = false;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = this.attachmentOf(socket);
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
    const attachment = this.attachmentOf(socket);
    try {
      socket.close(validCloseCode(code), "closing");
    } catch {
      // Already closed.
    }
    if (attachment.leaving) return false;

    this.depart(attachment);
    this.endStay(attachment);
    attachment.leaving = true;
    this.remember(socket, attachment);
    return true;
  }

  /** Tells everyone else this person has gone. Leaving the room also leaves their meeting. */
  private depart(attachment: Attachment): void {
    this.leaveMeeting(attachment);
    this.broadcast({ t: "player_left", id: attachment.userId }, undefined, attachment.userId);
  }

  private nameRoom(room: string): void {
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO room_state (key, value) VALUES ('name', ?)", room);
  }

  private roomName(): string | null {
    return this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM room_state WHERE key = 'name'").toArray()[0]?.value ?? null;
  }

  /** Meeting hours: monthly for an office, daily for a lobby copy (docs/14). */
  private clock(): MeetingClock | null {
    if (this.clockCache) return this.clockCache;
    const room = this.roomName();
    if (!room) return null;
    this.clockCache = new MeetingClock(this.ctx.storage.sql, lobbyCopyNumber(room) === null ? "month" : "day");
    return this.clockCache;
  }

  /** Someone joined or left a meeting: it may have started or stopped counting. */
  private meetingCounted(room: string, meeting: string): void {
    const clock = this.clock();
    const now = Date.now();
    if (clock?.update(meeting, this.meetingMembers(meeting).length, now)) this.clockChanged(room, now);
  }

  /**
   * After the clock moved on: everyone hears the new total, video pauses the
   * moment the allowance is gone, the room wakes when it next needs to, and an
   * office's total is copied to D1 for its billing page.
   */
  private clockChanged(room: string, now: number): void {
    const clock = this.clock();
    if (!clock) return;
    const usage = clock.usage(now);
    const wasPaused =
      this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM room_state WHERE key = 'paused'").toArray()[0]?.value === "1";
    if (usage.paused !== wasPaused) {
      this.ctx.storage.sql.exec(
        "INSERT INTO room_state (key, value) VALUES ('paused', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        usage.paused ? "1" : "0",
      );
      if (usage.paused) this.pauseVideo();
    }
    this.broadcast({ t: "meeting_usage", usage });
    const wake = clock.nextWake(now);
    if (wake !== null) this.ctx.waitUntil(this.ctx.storage.setAlarm(wake));
    if (usage.period === "month") this.ctx.waitUntil(this.writeClock(room, now));
  }

  /** The allowance ran out: every meeting stops receiving cameras and screens; voices carry on. */
  private pauseVideo(): void {
    for (const socket of this.present()) {
      const them = this.attachmentOf(socket);
      const video = (them.media?.subs ?? []).filter((sub) => sub.kind !== "mic");
      if (!them.media || !video.length) continue;
      them.media.subs = (them.media.subs ?? []).filter((sub) => sub.kind === "mic");
      this.remember(socket, them);
      this.ctx.waitUntil(this.sfuApi.closeTracks(them.media.sessionId, video.map((sub) => sub.mid)).catch(() => undefined));
    }
  }

  /** The office's hours this month, for the API to show; a missed write is caught up by the next. */
  private async writeClock(room: string, now: number): Promise<void> {
    const clock = this.clock();
    if (!clock) return;
    clock.settle(now);
    const { key, seconds } = clock.periodTotal(now);
    await this.env.DB.prepare(
      `INSERT INTO usage_monthly (office_id, period, meeting_seconds, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (office_id, period) DO UPDATE SET meeting_seconds = excluded.meeting_seconds, updated_at = excluded.updated_at`,
    )
      .bind(room, key, seconds, now)
      .run()
      .catch((error) => console.error("meeting hours write failed", room, error));
  }

  /** Woken by the clock: settle up, and pause video if the allowance just ran out. */
  async alarm(): Promise<void> {
    const room = this.roomName();
    const clock = this.clock();
    if (!room || !clock) return;
    const now = Date.now();
    clock.settle(now);
    this.clockChanged(room, now);
  }

  /** The office's plan changed (from the API): its hours take effect straight away. */
  async setMeetingAllowance(officeId: string, hours: number): Promise<void> {
    this.nameRoom(officeId);
    const clock = this.clock();
    if (clock?.setAllowance(hours)) this.clockChanged(officeId, Date.now());
  }

  /** After people arrive or leave: usage totals are written when due. */
  private async headcountChanged(room: string): Promise<void> {
    const now = Date.now();
    const present = this.present().length;
    if (this.usage.due(present, now)) this.ctx.waitUntil(this.usage.flush(room, present, now));
  }

  /** Counts this person's time in the room, once, as their socket ends. */
  private endStay(attachment: Attachment): void {
    const now = Date.now();
    // Everyone else still here, plus the one leaving: how full the room was.
    const others = this.present().filter((socket) => this.attachmentOf(socket).userId !== attachment.userId);
    this.usage.stayed(now - attachment.joinedAt, 0, others.length + 1, now);
  }

  /** Someone walked into the public lobby. Offices never report who comes in. */
  private reportToDiscord(room: string, name: string, character: string, whereHeader: string | null): void {
    const lobby = lobbyCopyNumber(room);
    if (lobby === null) return;
    let where: Whereabouts = {};
    try {
      where = whereHeader ? JSON.parse(decodeURIComponent(whereHeader)) : {};
    } catch {
      // Only the Worker sets it; a bad one just means "somewhere".
    }
    const request = this.reporter.report({ kind: "lobby_join", name, character, lobby, where });
    if (request) this.ctx.waitUntil(request);
  }

  private closeQuietly(socket: WebSocket, code: number, reason: string, attachment = this.attachmentOf(socket)): void {
    if (!attachment.leaving) this.endStay(attachment);
    attachment.leaving = true;
    this.remember(socket, attachment);
    try {
      socket.close(code, reason);
    } catch {
      // Already closed.
    }
  }

  private present(): WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => !this.attachmentOf(socket).leaving);
  }

  private broadcast(message: ServerMessage, except?: WebSocket, exceptUserId?: string): void {
    const text = JSON.stringify(message);
    for (const socket of this.present()) {
      if (socket === except) continue;
      if (exceptUserId !== undefined && this.attachmentOf(socket).userId === exceptUserId) continue;
      sendText(socket, text);
    }
  }
}

function userTag(userId: string): string {
  return `user:${userId}`;
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

const LAYER: Record<VideoQuality, string> = { high: "h", medium: "m", low: "l" };

/** Which simulcast layer to forward: the quality asked for, or low when it isn't one. */
function simulcast(quality: unknown): NonNullable<SfuTrack["simulcast"]> {
  return {
    preferredRid: VIDEO_QUALITIES.includes(quality as VideoQuality) ? LAYER[quality as VideoQuality] : "l",
    priorityOrdering: "asciibetical",
    ridNotAvailable: "asciibetical",
  };
}

function stringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  return value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

/** A meeting's name as typed: no control characters, single spaces, trimmed; null when nothing is left. */
function cleanMeetingName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MEETING_NAME_MAX)
    .trim();
  return name || null;
}

function randomId(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
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
