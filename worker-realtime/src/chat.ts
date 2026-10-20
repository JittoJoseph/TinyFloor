import { DurableObject } from "cloudflare:workers";
import {
  CHANNEL_HISTORY_MAX,
  CHAT_BODY_MAX,
  CHAT_PAGE,
  CloseCode,
  FILE_MAX,
  FILES_PER_MESSAGE,
  GENERAL_CHANNEL,
  JUMP_MAX,
  MENTIONS_MAX,
  SEARCH_MAX,
  HEARTBEAT_PING,
  LOBBY_CHANNELS,
  LOBBY_CHAT,
  LOBBY_RETENTION_DAYS,
  HEARTBEAT_PONG,
  MODERATOR,
  cleanChannelName,
  dmChannelId,
  dmMembers,
  isDm,
  type ChannelSummary,
  type ChatClientMessage,
  type ChatFile,
  type ChatMessage,
  type ChatServerMessage,
  type LobbyChatPage,
  type RoomTicket,
} from "../../shared-protocol/src";
import { readTicket, TICKET_HEADER } from "./headers";

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
  files: string | null;
  mentions: string | null;
  at: number;
  edited_at: SqlStorageValue;
}

const COLUMNS = "seq, channel, author, author_name, body, files, mentions, at, edited_at";

/** A runaway client is stopped at ten messages a second; a person never gets near it. */
const SENDS_PER_TEN_SECONDS = 100;
/** Messages between trims. Cheap, and it keeps the object's storage bounded. */
const TRIM_EVERY = 500;
const TEN_SECONDS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Where "is this the lobby's chat" is kept, so an alarm knows without a request. */
const LOBBY_FLAG = "lobby";
/** The office this chat belongs to, which its files are kept under. */
const OFFICE_KEY = "office";

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
 * they walked in with, there are no new channels or files, TinyFloor's admin
 * can change or take down any message, and an alarm once a day forgets anything older than
 * a week. Its direct messages are passed from one socket to the other and
 * never written down, so they last as long as both people stay.
 */
export class Chat extends DurableObject<Env> {
  private lobby = false;
  private office: string | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.lobby = (await ctx.storage.get<boolean>(LOBBY_FLAG)) === true;
      this.office = (await ctx.storage.get<string>(OFFICE_KEY)) ?? null;
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
      // And with files and mentions, both JSON. (`image` is from before files, and was never used.)
      if (!columns.some((column) => column.name === "files")) this.sql.exec("ALTER TABLE messages ADD COLUMN files TEXT");
      if (!columns.some((column) => column.name === "mentions")) this.sql.exec("ALTER TABLE messages ADD COLUMN mentions TEXT");
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
    const ticket = readTicket(request.headers.get(TICKET_HEADER));
    if (!ticket) return new Response("Unauthorized", { status: 401 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    if (ticket.room === `chat:${LOBBY_CHAT}` && !this.lobby) {
      this.lobby = true;
      await this.ctx.storage.put(LOBBY_FLAG, true);
    }
    if (!this.lobby && !this.office && ticket.room.startsWith("chat:")) {
      this.office = ticket.room.slice("chat:".length);
      await this.ctx.storage.put(OFFICE_KEY, this.office);
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
        return this.post(socket, me, message.channel, message.body, message.files, message.mentions, now);
      case "chat_history":
        return this.page(socket, me, message.channel, message.before, message.to);
      case "chat_search":
        return this.search(socket, me, message.q);
      case "chat_read":
        return this.markRead(me.userId, message.channel, message.seq);
      case "chat_react":
        return this.react(me, message.seq, message.emoji, message.on);
      case "chat_channel":
        return this.makeChannel(socket, me, message.name, now);
      case "chat_dm":
        return this.openDm(socket, me, message.userId, now);
      case "chat_edit":
        return this.edit(me, message.seq, message.body, message.channel, message.mentions, now);
      case "chat_delete":
        return this.remove(me, message.seq, message.channel);
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

  /**
   * Help and feedback's ticket changed: everyone here (or only `userId`, in
   * the lobby) reads it again from the API. Nothing about it is said here.
   */
  async helpChanged(userId?: string): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      const who = this.attachmentOf(socket);
      if (who && (!userId || who.userId === userId)) this.send(socket, { t: "help_changed" });
    }
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
    this.unfile(this.allFiles());
    this.sql.exec("DELETE FROM messages");
    this.sql.exec("DELETE FROM channels");
    this.sql.exec("DELETE FROM reads");
    this.sql.exec("DELETE FROM reactions");
    this.sql.exec("DELETE FROM people");
  }

  /** Keeps each channel to its last messages, and their files with them. */
  async trim(keep = CHANNEL_HISTORY_MAX): Promise<string[]> {
    const channels = this.sql.exec<{ channel: string }>("SELECT DISTINCT channel FROM messages").toArray();
    const dropped: string[] = [];
    for (const { channel } of channels) {
      const rows = this.sql
        .exec<{ files: string | null }>(
          `SELECT files FROM messages WHERE channel = ?1 AND seq <= (
             SELECT seq FROM messages WHERE channel = ?1 ORDER BY seq DESC LIMIT 1 OFFSET ?2
           )`,
          channel,
          keep,
        )
        .toArray();
      if (!rows.length) continue;
      for (const row of rows) dropped.push(...keysOf(row.files));
      this.sql.exec(
        `DELETE FROM messages WHERE channel = ?1 AND seq <= (
           SELECT seq FROM messages WHERE channel = ?1 ORDER BY seq DESC LIMIT 1 OFFSET ?2
         )`,
        channel,
        keep,
      );
    }
    this.unfile(dropped);
    return dropped;
  }

  /** Files go from R2 with their messages. A failed delete leaves a file nobody can reach, never a broken message. */
  private unfile(keys: string[]): void {
    if (!keys.length || !this.env.FILES) return;
    for (let at = 0; at < keys.length; at += 1000) {
      const batch = keys.slice(at, at + 1000);
      this.ctx.waitUntil(this.env.FILES.delete(batch).catch((error: unknown) => console.error("chat: couldn't delete files", error)));
    }
  }

  private allFiles(): string[] {
    return this.sql
      .exec<{ files: string | null }>("SELECT files FROM messages WHERE files IS NOT NULL")
      .toArray()
      .flatMap((row) => keysOf(row.files));
  }

  // -- the work ------------------------------------------------------------

  private post(
    socket: WebSocket,
    me: Attachment,
    channel: string,
    body: unknown,
    files: unknown,
    mentions: unknown,
    now: number,
  ): void {
    const text = typeof body === "string" ? body.trim().slice(0, CHAT_BODY_MAX) : "";
    if (this.lobby && Array.isArray(files) && files.length) return this.send(socket, { t: "chat_error", code: "offices_only" });
    const shared = this.lobby ? [] : parseFiles(files, this.office);
    if (!text && !shared.length) return;
    const named = parseMentions(mentions, me.userId);
    if (!this.mayPost(me.userId, channel)) return this.send(socket, { t: "chat_error", code: "no_such_channel" });
    if (this.lobby && isDm(channel)) return this.pass(socket, me, channel, text, now);

    this.ensureChannel(channel, me.userId, now);
    this.sql.exec(
      "INSERT INTO messages (channel, author, author_name, body, files, mentions, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      channel,
      me.userId,
      me.name,
      text,
      shared.length ? JSON.stringify(shared) : null,
      named.length ? JSON.stringify(named) : null,
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
      ...(shared.length ? { files: shared } : {}),
      ...(named.length ? { mentions: named } : {}),
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

  /** Anyone can change what they said, anywhere they can still post. */
  private edit(me: Attachment, seq: number, body: unknown, channel: unknown, mentions: unknown, now: number): void {
    const text = typeof body === "string" ? body.trim().slice(0, CHAT_BODY_MAX) : "";
    if (!text || !Number.isFinite(seq)) return;
    const named = parseMentions(mentions, me.userId);
    const change = { t: "chat_edited", seq, body: text, edited: now, by: me.userId, ...(named.length ? { mentions: named } : {}) } as const;
    if (seq < 0) return this.passChange(me, channel, (dm) => ({ ...change, channel: dm }));
    const row = this.ownMessage(me, seq);
    if (!row) return;
    this.sql.exec(
      "UPDATE messages SET body = ?, mentions = ?, edited_at = ? WHERE seq = ?",
      text,
      named.length ? JSON.stringify(named) : null,
      now,
      seq,
    );
    this.deliver(row.channel, { ...change, channel: row.channel });
  }

  /** And take it back: unsent, it goes for everyone. */
  private remove(me: Attachment, seq: number, channel: unknown): void {
    if (!Number.isFinite(seq)) return;
    if (seq < 0) return this.passChange(me, channel, (dm) => ({ t: "chat_deleted", seq, channel: dm, by: me.userId }));
    const row = this.ownMessage(me, seq);
    if (!row) return;
    this.drop(seq, row.channel, me.userId);
  }

  private drop(seq: number, channel: string, by: string): void {
    const row = this.sql.exec<{ files: string | null }>("SELECT files FROM messages WHERE seq = ?", seq).toArray()[0];
    this.unfile(keysOf(row?.files ?? null));
    this.sql.exec("DELETE FROM reactions WHERE seq = ?", seq);
    this.sql.exec("DELETE FROM messages WHERE seq = ?", seq);
    this.deliver(channel, { t: "chat_deleted", seq, channel, by });
  }

  private ownMessage(me: Attachment, seq: number): { channel: string } | null {
    const row = this.sql.exec<{ channel: string; author: string }>("SELECT channel, author FROM messages WHERE seq = ?", seq).toArray()[0];
    if (!row || row.author !== me.userId || !this.mayPost(me.userId, String(row.channel))) return null;
    return { channel: String(row.channel) };
  }

  /**
   * A change to a lobby direct message, which was never written down: passed to
   * the two people like the message was. Nothing here can say who wrote it, so
   * it carries who sent the change, and clients only apply it to that person's line.
   */
  private passChange(me: Attachment, channel: unknown, message: (dm: string) => ChatServerMessage): void {
    if (!this.lobby || typeof channel !== "string" || !dmMembers(channel)?.includes(me.userId)) return;
    this.deliver(channel, message(channel));
  }

  // -- for the admin page, through tinyfloor-api ---------------------------

  /** The lobby's channels, and a page of one of them. */
  async moderationPage(channel: string, before?: number): Promise<LobbyChatPage> {
    const counts = new Map(
      this.sql
        .exec<{ channel: string; n: number; last: number }>("SELECT channel, COUNT(*) AS n, MAX(at) AS last FROM messages GROUP BY channel")
        .toArray()
        .map((row) => [String(row.channel), { messages: Number(row.n), lastAt: Number(row.last) }]),
    );
    const channels = LOBBY_CHANNELS.map((id) => ({ id, ...(counts.get(id) ?? { messages: 0, lastAt: null }) }));
    const open = (LOBBY_CHANNELS as readonly string[]).includes(channel) ? channel : LOBBY_CHANNELS[0];
    const rows = this.sql
      .exec<MessageRow>(
        `SELECT ${COLUMNS} FROM messages
         WHERE channel = ? AND seq < ? ORDER BY seq DESC LIMIT ?`,
        open,
        before ?? Number.MAX_SAFE_INTEGER,
        CHAT_PAGE + 1,
      )
      .toArray();
    const page = rows.slice(0, CHAT_PAGE).reverse();
    return { channels, channel: open, messages: page.map((row) => toMessage(row)), more: rows.length > CHAT_PAGE };
  }

  /** Changes or takes down any message; everyone connected sees it happen. */
  async moderate(seq: number, change: { body: string } | { remove: true }): Promise<boolean> {
    const row = this.sql.exec<{ channel: string }>("SELECT channel FROM messages WHERE seq = ?", seq).toArray()[0];
    if (!row) return false;
    const channel = String(row.channel);
    if ("remove" in change) {
      this.drop(seq, channel, MODERATOR);
      return true;
    }
    const text = typeof change.body === "string" ? change.body.trim().slice(0, CHAT_BODY_MAX) : "";
    if (!text) return false;
    const now = Date.now();
    this.sql.exec("UPDATE messages SET body = ?, edited_at = ? WHERE seq = ?", text, now, seq);
    this.deliver(channel, { t: "chat_edited", seq, channel, body: text, edited: now, by: MODERATOR });
    return true;
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

  private page(socket: WebSocket, me: Attachment, channel: string, before?: number, to?: number): void {
    if (!this.mayPost(me.userId, channel)) return;
    const below = typeof before === "number" && Number.isFinite(before) ? before : Number.MAX_SAFE_INTEGER;
    // Back to a message (a search result): everything down to it, and a few before it for context.
    const reach =
      typeof to === "number" && Number.isFinite(to)
        ? Number(
            this.sql
              .exec<{ n: number }>("SELECT COUNT(*) AS n FROM messages WHERE channel = ? AND seq < ? AND seq >= ?", channel, below, to)
              .one().n,
          ) + 10
        : CHAT_PAGE;
    const size = Math.min(Math.max(reach, CHAT_PAGE), JUMP_MAX);
    const rows = this.sql
      .exec<MessageRow>(
        `SELECT ${COLUMNS} FROM messages
         WHERE channel = ? AND seq < ? ORDER BY seq DESC LIMIT ?`,
        channel,
        below,
        size + 1,
      )
      .toArray();
    const more = rows.length > size;
    const page = rows.slice(0, size).reverse();
    const reactions = this.reactionsFor(page.map((row) => row.seq));
    this.send(socket, {
      t: "chat_page",
      channel,
      more,
      messages: page.map((row) => toMessage(row, reactions.get(row.seq))),
    });
  }

  /**
   * Words anywhere you can read: the office's channels and your own direct
   * messages, newest first, matched on what was said and on file names, with
   * case and accents folded.
   */
  private search(socket: WebSocket, me: Attachment, q: unknown): void {
    const words = typeof q === "string" ? q.trim().slice(0, 100) : "";
    if (fold(words).length < 2) return this.send(socket, { t: "chat_found", q: words, messages: [] });
    const needle = fold(words);
    // SQLite folds only ASCII case, so the narrowing is on what's cheap and the matching is done here.
    const rows = this.sql
      .exec<MessageRow>(
        `SELECT ${COLUMNS} FROM messages
         WHERE (channel NOT LIKE 'dm:%' OR instr(channel, ?) > 0)
         ORDER BY seq DESC LIMIT 20000`,
        me.userId,
      )
      .toArray();
    const found: ChatMessage[] = [];
    for (const row of rows) {
      if (found.length >= SEARCH_MAX) break;
      const named = parseStored(row.files).some((file) => fold(file.name).includes(needle));
      if (!named && !fold(String(row.body)).includes(needle)) continue;
      if (!this.mayPost(me.userId, String(row.channel))) continue;
      found.push(toMessage(row));
    }
    this.send(socket, { t: "chat_found", q: words, messages: found });
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
        "SELECT seq, author_name, body, files, at FROM messages WHERE channel = ? ORDER BY seq DESC LIMIT 1",
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
    // In a channel, the unread ones that mention you: what's counted there, the rest only make it bold.
    const mentions = pair
      ? 0
      : Number(
          this.sql
            .exec<{ n: number }>(
              `SELECT COUNT(*) AS n FROM messages
               WHERE channel = ? AND seq > ? AND author != ? AND mentions IS NOT NULL
                 AND EXISTS (SELECT 1 FROM json_each(messages.mentions) WHERE value = ?)`,
              channel,
              read?.seq ?? 0,
              userId,
              userId,
            )
            .one().n,
        );

    return {
      id: channel,
      kind: pair ? "dm" : "channel",
      name: pair ? this.nameOf(other!) : channel,
      ...(other ? { withId: other } : {}),
      unread: Number(unread),
      ...(mentions ? { mentions } : {}),
      ...(last
        ? { lastAt: Number(last.at), lastBy: String(last.author_name), lastBody: String(last.body) || (last.files ? "📎" : "") }
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

/** Files for a message: well formed, kept under this office, a few at most. */
function parseFiles(files: unknown, office: string | null): ChatFile[] {
  if (!office || !Array.isArray(files)) return [];
  const prefix = `att/${office}/`;
  const found: ChatFile[] = [];
  for (const file of files.slice(0, FILES_PER_MESSAGE) as Array<Partial<ChatFile> | null>) {
    if (!file || typeof file.key !== "string" || !file.key.startsWith(prefix)) continue;
    if (!/^[\w-]{8,64}(\.[a-z0-9]{1,8})?$/.test(file.key.slice(prefix.length))) continue;
    const size = Number(file.size);
    if (!Number.isFinite(size) || size <= 0 || size > FILE_MAX) continue;
    const name = typeof file.name === "string" && file.name.trim() ? file.name.trim().slice(0, 200) : "file";
    const type = typeof file.type === "string" && file.type ? file.type.slice(0, 100) : "application/octet-stream";
    const width = Number(file.width);
    const height = Number(file.height);
    const sized = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
    found.push({ key: file.key, name, size: Math.round(size), type, ...(sized ? { width: Math.round(width), height: Math.round(height) } : {}) });
  }
  return found;
}

/** Who a message mentions: ids, each once, never its author, a handful at most. */
function parseMentions(mentions: unknown, author: string): string[] {
  if (!Array.isArray(mentions)) return [];
  const ids = mentions.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64 && id !== author);
  return [...new Set(ids)].slice(0, MENTIONS_MAX);
}

function parseStored(files: SqlStorageValue): ChatFile[] {
  if (typeof files !== "string") return [];
  try {
    return JSON.parse(files) as ChatFile[];
  } catch {
    return [];
  }
}

function keysOf(files: SqlStorageValue): string[] {
  return parseStored(files).map((file) => file.key);
}

/** For matching: case and accents folded, so "cafe" finds "Café". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function toMessage(row: MessageRow, reactions?: Record<string, string[]>): ChatMessage {
  const files = parseStored(row.files);
  const mentions = typeof row.mentions === "string" ? (JSON.parse(row.mentions) as string[]) : [];
  return {
    seq: Number(row.seq),
    channel: String(row.channel),
    author: String(row.author),
    authorName: String(row.author_name),
    body: String(row.body),
    at: Number(row.at),
    ...(files.length ? { files } : {}),
    ...(mentions.length ? { mentions } : {}),
    ...(reactions ? { reactions } : {}),
    ...(row.edited_at ? { edited: Number(row.edited_at) } : {}),
  };
}
