import { DurableObject } from "cloudflare:workers";
import {
  CHANNEL_HISTORY_MAX,
  CHAT_BODY_MAX,
  CHAT_PAGE,
  CloseCode,
  GENERAL_CHANNEL,
  HEARTBEAT_PING,
  LOBBY_CHANNELS,
  LOBBY_CHAT,
  LOBBY_RETENTION_DAYS,
  HEARTBEAT_PONG,
  cleanChannelName,
  dmChannelId,
  dmMembers,
  isDm,
  type ChannelSummary,
  type ChatClientMessage,
  type ChatImage,
  type ChatMessage,
  type ChatServerMessage,
  type RoomTicket,
} from "../../shared-protocol/src";
import { TICKET_HEADER } from "./headers";

/** What the socket remembers about whoever is on it. */
interface Attachment {
  userId: string;
  name: string;
  /** Sends in this window, to keep a runaway client from filling the office. */
  sends: number;
  window: number;
}

interface ChannelRow extends Record<string, SqlStorageValue> {
  id: string;
  kind: string;
  name: string;
  created_at: number;
}

interface MessageRow extends Record<string, SqlStorageValue> {
  seq: number;
  channel: string;
  author: string;
  author_name: string;
  body: string;
  image: string | null;
  at: number;
  edited_at: SqlStorageValue;
}

/** A runaway client is stopped at ten messages a second; a person never gets near it. */
const SENDS_PER_TEN_SECONDS = 100;
/** Messages between trims. Cheap, and it keeps the object's storage bounded. */
const TRIM_EVERY = 500;
const TEN_SECONDS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Where "is this the lobby's chat" is kept, so an alarm knows without a request. */
const LOBBY_FLAG = "lobby";

/**
 * One of these per office. It holds that office's channels and messages in its
 * own SQLite, and fans new ones out over sockets that are already open.
 *
 * The sockets hibernate, so an office with ten people connected all day costs
 * nothing while nobody is typing: the object wakes for the millisecond it takes
 * to write a message and pass it on.
 *
 * The public lobby has one of these too, named "lobby", shared by every copy
 * of its floor. There the channels are fixed, guests may post under the name
 * they walked in with, people can edit and delete what they said, there are no
 * new channels or images, and an alarm once a day forgets anything older than
 * a week. Its direct messages are passed from one socket to the other and
 * never written down, so they last as long as both people stay.
 */
export class Chat extends DurableObject<Env> {
  private lobby = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.lobby = (await ctx.storage.get<boolean>(LOBBY_FLAG)) === true;
      this.sql.exec(`CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT NOT NULL,
        author TEXT NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        image TEXT,
        at INTEGER NOT NULL
      )`);
      this.sql.exec("CREATE INDEX IF NOT EXISTS messages_channel ON messages (channel, seq)");
      // Added with editing; older objects get the column the first time they wake.
      const columns = this.sql.exec<{ name: string }>("SELECT name FROM pragma_table_info('messages')").toArray();
      if (!columns.some((column) => column.name === "edited_at")) this.sql.exec("ALTER TABLE messages ADD COLUMN edited_at INTEGER");
      this.sql.exec(`CREATE TABLE IF NOT EXISTS reads (
        member TEXT NOT NULL,
        channel TEXT NOT NULL,
        seq INTEGER NOT NULL,
        PRIMARY KEY (member, channel)
      )`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS reactions (
        seq INTEGER NOT NULL,
        member TEXT NOT NULL,
        emoji TEXT NOT NULL,
        PRIMARY KEY (seq, member, emoji)
      )`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        seen_at INTEGER NOT NULL
      )`);
    });
  }

  private get sql(): SqlStorage {
    return this.ctx.storage.sql;
  }

  private readonly attachments = new WeakMap<WebSocket, Attachment>();

  async fetch(request: Request): Promise<Response> {
    const ticket = JSON.parse(request.headers.get(TICKET_HEADER) ?? "null") as RoomTicket | null;
    if (!ticket) return new Response("Unauthorized", { status: 401 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    if (ticket.room === `chat:${LOBBY_CHAT}` && !this.lobby) {
      this.lobby = true;
      await this.ctx.storage.put(LOBBY_FLAG, true);
    }
    const attachment: Attachment = { userId: ticket.sub, name: ticket.name, sends: 0, window: 0 };
    this.remember(server, attachment);

    this.sql.exec(
      `INSERT INTO people (id, name, seen_at) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, seen_at = excluded.seen_at`,
      ticket.sub,
      ticket.name,
      Date.now(),
    );

    // One person can have several tabs open; each gets its own socket.
    this.send(server, { t: "chat_ready", me: ticket.sub, channels: this.channelsFor(ticket.sub) });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    if (raw === HEARTBEAT_PING) return socket.send(HEARTBEAT_PONG);

    const me = this.attachmentOf(socket);
    if (!me) return;

    const now = Date.now();
    if (now - me.window > TEN_SECONDS) {
      me.window = now;
      me.sends = 0;
    }

    let message: ChatClientMessage;
    try {
      message = JSON.parse(raw) as ChatClientMessage;
    } catch {
      return;
    }

    switch (message.t) {
      case "chat_send":
        me.sends++;
        this.remember(socket, me);
        if (me.sends > SENDS_PER_TEN_SECONDS) return this.send(socket, { t: "chat_error", code: "slow_down" });
        return this.post(socket, me, message.channel, message.body, message.image, now);
      case "chat_history":
        return this.page(socket, me, message.channel, message.before);
      case "chat_read":
        return this.markRead(me.userId, message.channel, message.seq);
      case "chat_react":
        return this.react(me, message.seq, message.emoji, message.on);
      case "chat_channel":
        return this.makeChannel(socket, me, message.name, now);
      case "chat_dm":
        return this.openDm(socket, me, message.userId, now);
      case "chat_edit":
        return this.edit(me, message.seq, message.body, now);
      case "chat_delete":
        return this.remove(me, message.seq);
    }
  }

  webSocketClose(socket: WebSocket): void {
    const who = this.attachmentOf(socket);
    this.attachments.delete(socket);
    // The last tab of someone in the lobby closed: whatever they said privately there goes with them.
    if (!this.lobby || !who) return;
    const still = this.ctx.getWebSockets().some((other) => other !== socket && this.attachmentOf(other)?.userId === who.userId);
    if (!still) this.broadcast({ t: "chat_gone", userId: who.userId });
  }

  /** Someone's membership ended: their sockets close and their DMs stay put. */
  async removeMember(userId: string): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      if (this.attachmentOf(socket)?.userId !== userId) continue;
      try {
        socket.close(CloseCode.AccessRevoked, "access_revoked");
      } catch {
        // Already gone.
      }
      this.attachments.delete(socket);
    }
  }

  /** The office was closed: everything about its chat goes. */
  async forget(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.close(CloseCode.RoomClosed, "room_closed");
      } catch {
        // Already gone.
      }
    }
    this.sql.exec("DELETE FROM messages");
    this.sql.exec("DELETE FROM channels");
    this.sql.exec("DELETE FROM reads");
    this.sql.exec("DELETE FROM reactions");
    this.sql.exec("DELETE FROM people");
  }

  /** Keeps each channel to its last messages. Runs from the API's nightly job. */
  async trim(keep = CHANNEL_HISTORY_MAX): Promise<string[]> {
    const channels = this.sql.exec<{ channel: string }>("SELECT DISTINCT channel FROM messages").toArray();
    const dropped: string[] = [];
    for (const { channel } of channels) {
      const rows = this.sql
        .exec<{ image: string | null }>(
          `SELECT image FROM messages WHERE channel = ?1 AND seq <= (
             SELECT seq FROM messages WHERE channel = ?1 ORDER BY seq DESC LIMIT 1 OFFSET ?2
           )`,
          channel,
          keep,
        )
        .toArray();
      if (!rows.length) continue;
      for (const row of rows) if (row.image) dropped.push(JSON.parse(row.image).key as string);
      this.sql.exec(
        `DELETE FROM messages WHERE channel = ?1 AND seq <= (
           SELECT seq FROM messages WHERE channel = ?1 ORDER BY seq DESC LIMIT 1 OFFSET ?2
         )`,
        channel,
        keep,
      );
    }
    return dropped;
  }

  // -- the work ------------------------------------------------------------

  private post(
    socket: WebSocket,
    me: Attachment,
    channel: string,
    body: unknown,
    image: ChatImage | undefined,
    now: number,
  ): void {
    const text = typeof body === "string" ? body.trim().slice(0, CHAT_BODY_MAX) : "";
    const picture = this.lobby ? null : parseImage(image);
    if (this.lobby && image) return this.send(socket, { t: "chat_error", code: "offices_only" });
    if (!text && !picture) return;
    if (!this.mayPost(me.userId, channel)) return this.send(socket, { t: "chat_error", code: "no_such_channel" });
    if (this.lobby && isDm(channel)) return this.pass(socket, me, channel, text, now);

    this.ensureChannel(channel, me.userId, now);
    this.sql.exec(
      "INSERT INTO messages (channel, author, author_name, body, image, at) VALUES (?, ?, ?, ?, ?, ?)",
      channel,
      me.userId,
      me.name,
      text,
      picture ? JSON.stringify(picture) : null,
      now,
    );
    const seq = Number(this.sql.exec<{ seq: number }>("SELECT last_insert_rowid() AS seq").one().seq);
    const message: ChatMessage = {
      seq,
      channel,
      author: me.userId,
      authorName: me.name,
      body: text,
      at: now,
      ...(picture ? { image: picture } : {}),
    };

    // Your own message counts as read, so your unread badge stays quiet.
    this.markRead(me.userId, channel, seq);
    this.deliver(channel, { t: "chat_new", message });

    // History trims itself as it grows, so no nightly job has to walk offices.
    if (seq % TRIM_EVERY === 0) this.trim();

    if (this.lobby) this.ctx.waitUntil(this.keepAWeek(now));
  }

  /**
   * A direct message in the lobby: straight to the other person's open tabs
   * and your own, and nowhere else. Its number is below zero, so it never
   * meets a stored message's.
   */
  private passing = 0;
  private pass(socket: WebSocket, me: Attachment, channel: string, text: string, now: number): void {
    const pair = dmMembers(channel)!;
    const other = pair[0] === me.userId ? pair[1] : pair[0];
    const here = this.ctx.getWebSockets().some((one) => this.attachmentOf(one)?.userId === other);
    if (!here) return this.send(socket, { t: "chat_error", code: "not_here" });
    const message: ChatMessage = {
      seq: -(now * 1000 + (this.passing++ % 1000)),
      channel,
      author: me.userId,
      authorName: me.name,
      body: text,
      at: now,
      passing: true,
    };
    this.deliver(channel, { t: "chat_new", message });
  }

  /** In the lobby, the author can change what they said. */
  private edit(me: Attachment, seq: number, body: unknown, now: number): void {
    const text = typeof body === "string" ? body.trim().slice(0, CHAT_BODY_MAX) : "";
    const row = this.ownMessage(me, seq);
    if (!row || !text) return;
    this.sql.exec("UPDATE messages SET body = ?, edited_at = ? WHERE seq = ?", text, now, seq);
    this.deliver(row.channel, { t: "chat_edited", seq, channel: row.channel, body: text, edited: now });
  }

  /** In the lobby, the author can take back what they said. */
  private remove(me: Attachment, seq: number): void {
    const row = this.ownMessage(me, seq);
    if (!row) return;
    this.sql.exec("DELETE FROM reactions WHERE seq = ?", seq);
    this.sql.exec("DELETE FROM messages WHERE seq = ?", seq);
    this.deliver(row.channel, { t: "chat_deleted", seq, channel: row.channel });
  }

  private ownMessage(me: Attachment, seq: number): { channel: string } | null {
    if (!this.lobby || !Number.isFinite(seq)) return null;
    const row = this.sql.exec<{ channel: string; author: string }>("SELECT channel, author FROM messages WHERE seq = ?", seq).toArray()[0];
    return row && row.author === me.userId ? { channel: String(row.channel) } : null;
  }

  /** The lobby forgets: once a day, anything older than a week goes. */
  async alarm(): Promise<void> {
    if (!this.lobby) return;
    const now = Date.now();
    const cutoff = now - LOBBY_RETENTION_DAYS * DAY_MS;
    this.sql.exec("DELETE FROM reactions WHERE seq IN (SELECT seq FROM messages WHERE at < ?)", cutoff);
    this.sql.exec("DELETE FROM messages WHERE at < ?", cutoff);
    // Guests come and go; who they were goes with their messages.
    this.sql.exec("DELETE FROM reads WHERE member IN (SELECT id FROM people WHERE seen_at < ?)", cutoff);
    this.sql.exec("DELETE FROM people WHERE seen_at < ?", cutoff);
    const left = this.sql.exec<{ n: number }>("SELECT COUNT(*) AS n FROM messages").one().n;
    if (Number(left) > 0) await this.ctx.storage.setAlarm(now + DAY_MS);
  }

  /** The first message after a quiet spell starts the daily clean-up again. */
  private async keepAWeek(now: number): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(now + DAY_MS);
  }

  private page(socket: WebSocket, me: Attachment, channel: string, before?: number): void {
    if (!this.mayPost(me.userId, channel)) return;
    const rows = this.sql
      .exec<MessageRow>(
        `SELECT seq, channel, author, author_name, body, image, at, edited_at FROM messages
         WHERE channel = ? AND seq < ? ORDER BY seq DESC LIMIT ?`,
        channel,
        before ?? Number.MAX_SAFE_INTEGER,
        CHAT_PAGE + 1,
      )
      .toArray();
    const more = rows.length > CHAT_PAGE;
    const page = rows.slice(0, CHAT_PAGE).reverse();
    const reactions = this.reactionsFor(page.map((row) => row.seq));
    this.send(socket, {
      t: "chat_page",
      channel,
      more,
      messages: page.map((row) => toMessage(row, reactions.get(row.seq))),
    });
  }

  private markRead(userId: string, channel: string, seq: number): void {
    if (!Number.isFinite(seq)) return;
    this.sql.exec(
      `INSERT INTO reads (member, channel, seq) VALUES (?, ?, ?)
       ON CONFLICT (member, channel) DO UPDATE SET seq = MAX(seq, excluded.seq)`,
      userId,
      channel,
      seq,
    );
  }

  private react(me: Attachment, seq: number, emoji: unknown, on: boolean): void {
    const mark = typeof emoji === "string" ? emoji.slice(0, 8) : "";
    if (!mark || !Number.isFinite(seq)) return;
    const row = this.sql.exec<{ channel: string }>("SELECT channel FROM messages WHERE seq = ?", seq).toArray()[0];
    if (!row) return;
    if (on) {
      this.sql.exec("INSERT OR IGNORE INTO reactions (seq, member, emoji) VALUES (?, ?, ?)", seq, me.userId, mark);
    } else {
      this.sql.exec("DELETE FROM reactions WHERE seq = ? AND member = ? AND emoji = ?", seq, me.userId, mark);
    }
    this.deliver(row.channel, { t: "chat_reacted", seq, channel: row.channel, emoji: mark, by: me.userId, on });
  }

  private makeChannel(socket: WebSocket, me: Attachment, name: unknown, now: number): void {
    if (this.lobby) return this.send(socket, { t: "chat_error", code: "offices_only" });
    const clean = cleanChannelName(name);
    if (!clean) return this.send(socket, { t: "chat_error", code: "bad_name" });
    if (clean === GENERAL_CHANNEL) return this.send(socket, { t: "chat_error", code: "exists" });
    const already = this.sql.exec<ChannelRow>("SELECT id FROM channels WHERE id = ?", clean).toArray()[0];
    if (already) return this.send(socket, { t: "chat_error", code: "exists" });

    // Naming a channel is a deliberate act, so this one is written straight away.
    this.sql.exec(
      "INSERT INTO channels (id, kind, name, created_by, created_at) VALUES (?, 'channel', ?, ?, ?)",
      clean,
      clean,
      me.userId,
      now,
    );
    this.broadcast({ t: "chat_channel", channel: { id: clean, kind: "channel", name: clean, unread: 0 } });
  }

  private openDm(socket: WebSocket, me: Attachment, userId: unknown, now: number): void {
    if (typeof userId !== "string" || userId === me.userId) return;
    const id = dmChannelId(me.userId, userId);
    // The lobby's direct messages are never stored, so there is no channel to write down.
    if (!this.lobby) this.ensureChannel(id, me.userId, now);
    this.send(socket, { t: "chat_channel", channel: this.summary(id, me.userId) });
  }

  /** A channel row appears the first time it is actually used. */
  private ensureChannel(id: string, by: string, now: number): void {
    const kind = isDm(id) ? "dm" : "channel";
    this.sql.exec(
      `INSERT INTO channels (id, kind, name, created_by, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      id,
      kind,
      isDm(id) ? "" : id,
      by,
      now,
    );
  }

  /** Channels are the whole office's; a direct message is only its two people's. */
  private mayPost(userId: string, channel: string): boolean {
    if (typeof channel !== "string" || !channel) return false;
    const pair = dmMembers(channel);
    if (pair) return pair.includes(userId);
    if (this.lobby) return (LOBBY_CHANNELS as readonly string[]).includes(channel);
    return channel === GENERAL_CHANNEL || cleanChannelName(channel) === channel;
  }

  /** Everything this person should see in their sidebar. */
  private channelsFor(userId: string): ChannelSummary[] {
    if (this.lobby) return LOBBY_CHANNELS.map((channel) => this.summary(channel, userId));
    const rows = this.sql
      .exec<ChannelRow>("SELECT id, kind, name, created_at FROM channels ORDER BY created_at")
      .toArray();
    const ids = new Set(rows.map((row) => row.id));
    const summaries: ChannelSummary[] = [];
    if (!ids.has(GENERAL_CHANNEL)) summaries.push(this.summary(GENERAL_CHANNEL, userId));
    for (const row of rows) {
      const pair = dmMembers(row.id);
      if (pair && !pair.includes(userId)) continue;
      summaries.push(this.summary(row.id, userId));
    }
    return summaries;
  }

  private summary(channel: string, userId: string): ChannelSummary {
    const pair = dmMembers(channel);
    const other = pair ? (pair[0] === userId ? pair[1] : pair[0]) : undefined;
    const last = this.sql
      .exec<MessageRow>(
        "SELECT seq, author_name, body, image, at FROM messages WHERE channel = ? ORDER BY seq DESC LIMIT 1",
        channel,
      )
      .toArray()[0];
    const read = this.sql
      .exec<{ seq: number }>("SELECT seq FROM reads WHERE member = ? AND channel = ?", userId, channel)
      .toArray()[0];
    const unread = this.sql
      .exec<{ n: number }>(
        "SELECT COUNT(*) AS n FROM messages WHERE channel = ? AND seq > ? AND author != ?",
        channel,
        read?.seq ?? 0,
        userId,
      )
      .one().n;

    return {
      id: channel,
      kind: pair ? "dm" : "channel",
      name: pair ? this.nameOf(other!) : channel,
      ...(other ? { withId: other } : {}),
      unread: Number(unread),
      ...(last
        ? { lastAt: Number(last.at), lastBy: String(last.author_name), lastBody: last.image ? "📷" : String(last.body) }
        : {}),
    };
  }

  private nameOf(userId: string): string {
    const row = this.sql.exec<{ name: string }>("SELECT name FROM people WHERE id = ?", userId).toArray()[0];
    return row?.name ?? "Someone";
  }

  private reactionsFor(seqs: number[]): Map<number, Record<string, string[]>> {
    const found = new Map<number, Record<string, string[]>>();
    if (!seqs.length) return found;
    const rows = this.sql
      .exec<{ seq: number; member: string; emoji: string }>(
        `SELECT seq, member, emoji FROM reactions WHERE seq BETWEEN ? AND ?`,
        Math.min(...seqs),
        Math.max(...seqs),
      )
      .toArray();
    for (const row of rows) {
      const message = found.get(row.seq) ?? {};
      message[row.emoji] = [...(message[row.emoji] ?? []), row.member];
      found.set(row.seq, message);
    }
    return found;
  }

  /** A channel goes to everyone connected; a direct message to its two people. */
  private deliver(channel: string, message: ChatServerMessage): void {
    const pair = dmMembers(channel);
    for (const socket of this.ctx.getWebSockets()) {
      const who = this.attachmentOf(socket);
      if (!who) continue;
      if (pair && !pair.includes(who.userId)) continue;
      this.send(socket, message);
    }
  }

  private broadcast(message: ChatServerMessage): void {
    for (const socket of this.ctx.getWebSockets()) this.send(socket, message);
  }

  private send(socket: WebSocket, message: ChatServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // The socket went away between the check and the send.
    }
  }

  private attachmentOf(socket: WebSocket): Attachment | null {
    let attachment = this.attachments.get(socket);
    if (!attachment) {
      attachment = (socket.deserializeAttachment() as Attachment | null) ?? undefined;
      if (attachment) this.attachments.set(socket, attachment);
    }
    return attachment ?? null;
  }

  private remember(socket: WebSocket, attachment: Attachment): void {
    this.attachments.set(socket, attachment);
    socket.serializeAttachment(attachment);
  }
}

function parseImage(image: ChatImage | undefined): ChatImage | null {
  if (!image || typeof image.key !== "string" || !/^att\/[\w/-]{1,120}\.webp$/.test(image.key)) return null;
  const width = Number(image.width);
  const height = Number(image.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { key: image.key, width: Math.round(width), height: Math.round(height) };
}

function toMessage(row: MessageRow, reactions?: Record<string, string[]>): ChatMessage {
  return {
    seq: Number(row.seq),
    channel: String(row.channel),
    author: String(row.author),
    authorName: String(row.author_name),
    body: String(row.body),
    at: Number(row.at),
    ...(row.image ? { image: JSON.parse(String(row.image)) as ChatImage } : {}),
    ...(reactions ? { reactions } : {}),
    ...(row.edited_at ? { edited: Number(row.edited_at) } : {}),
  };
}
