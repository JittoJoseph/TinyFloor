"use client";

import { HEARTBEAT_PING, HEARTBEAT_PONG } from "@shared/messages";
import {
  GENERAL_CHANNEL,
  REPLY_SNIPPET,
  TYPING_EVERY_MS,
  TYPING_SHOWN_MS,
  dmChannelId,
  type ChannelSummary,
  type ChatClientMessage,
  type ChatFile,
  type ChatMessage,
  type ChatServerMessage,
  isDm,
  isVoice,
} from "@shared/chat";
import type { RoomTicket } from "@/lib/api";
import { playSound } from "./sounds";
import { help } from "./help";
import { track } from "@/lib/analytics";
import { lastConversation } from "./chatMemory";

const HEARTBEAT_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface ChatState {
  ready: boolean;
  me: string;
  channels: ChannelSummary[];
  /** Messages we have, oldest first, per channel. */
  history: Record<string, ChatMessage[]>;
  /** Channels with older messages still on the server. */
  more: Record<string, boolean>;
  /** For the badge on the rail: unread direct messages, and channel messages that mention you. */
  unread: number;
  /** The chat asked us to slow down; said under the composer for a moment. */
  slowDown: boolean;
  /** A lobby direct message found the other person gone; said under the composer for a moment. */
  notHere: boolean;
  /** People who left the lobby while in a conversation with you, by id, with their names. */
  left: Record<string, string>;
  version: number;
}

const EMPTY: ChatState = {
  ready: false,
  me: "",
  channels: [],
  history: {},
  more: {},
  unread: 0,
  slowDown: false,
  notHere: false,
  left: {},
  version: 0,
};

/**
 * The office's chat, on its own socket. It is opened with the office shell, not
 * with the chat view, so a badge can appear while you are walking around.
 */
/** Who is typing in one conversation, by id: their name, and until when to show it. */
type Typists = ReadonlyMap<string, { name: string; until: number }>;
const NOBODY: Typists = new Map();

class ChatSocket {
  private ws: WebSocket | null = null;
  /** Who's typing where; kept apart from the state, so a keystroke elsewhere doesn't redraw every conversation. */
  private typists = new Map<string, Typists>();
  private typingListeners = new Set<() => void>();
  /** Where you last said you're typing, and when. */
  private typingIn: string | null = null;
  private typedAt = 0;
  private typingSweep?: ReturnType<typeof setTimeout>;
  /** Which chat: an office's id, or the lobby. */
  private place: string | null = null;
  private ticketFor: (() => Promise<RoomTicket>) | null = null;
  private stopped = true;
  /**
   * Bumped on every connect and disconnect. A ticket, socket or retry from an
   * earlier one checks it and does nothing: the office remounts on a language
   * switch, and the old socket's close used to open a second one beside the
   * new, so every message came twice.
   */
  private generation = 0;
  private attempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private queue: ChatClientMessage[] = [];

  private state: ChatState = EMPTY;
  private listeners = new Set<() => void>();
  /** The channel on screen, so its messages are marked read as they arrive. */
  private watching: string | null = null;
  /** Told about messages from others that land somewhere you are not looking. */
  private incoming = new Set<(message: ChatMessage) => void>();
  /** Conversations whose latest messages are on their way, so they're asked for once. */
  private asked = new Set<string>();
  /** Conversations to start over from what the server says (after a dropped connection), not merge into. */
  private fresh = new Set<string>();
  /** Searches waiting for their answer, by what was asked. */
  private searches = new Map<string, Array<(found: ChatMessage[]) => void>>();

  /** For the nudges over the floor: someone said something you have not seen. */
  onIncoming(listener: (message: ChatMessage) => void) {
    this.incoming.add(listener);
    return () => {
      this.incoming.delete(listener);
    };
  }

  /** Opens a place's chat: an office's (its id) or the lobby's ("lobby"). */
  connect(place: string, ticketFor: () => Promise<RoomTicket>) {
    if (this.place === place && !this.stopped) return;
    this.disconnect();
    this.place = place;
    this.ticketFor = ticketFor;
    this.stopped = false;
    this.attempts = 0;
    void this.open(this.generation);
  }

  disconnect() {
    this.stopped = true;
    this.generation++;
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close(1000, "left");
    this.ws = null;
    this.place = null;
    this.ticketFor = null;
    this.queue = [];
    this.asked.clear();
    this.fresh.clear();
    this.set(EMPTY);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** What the chat view is showing; its messages count as read. */
  /** The channel on screen, if any. */
  get watched() {
    return this.watching;
  }

  watch(channel: string | null) {
    this.watching = channel;
    if (!channel) return;
    const seen = this.state.history[channel]?.at(-1)?.seq;
    // A lobby direct message (numbered below zero) is never stored, so there is nothing to mark read.
    if (seen && seen > 0) this.send({ t: "chat_read", channel, seq: seen });
    const channels = this.state.channels.map((one) => (one.id === channel ? { ...one, unread: 0, mentions: 0 } : one));
    this.set({ ...this.state, channels, unread: total(channels) });
  }

  /** Says something; `replyTo` answers a message in the same conversation. */
  say(channel: string, body: string, files: ChatFile[] = [], mentions: string[] = [], replyTo?: number) {
    // A lobby direct message (below zero) was never stored, so it can't be answered by number.
    const answering = replyTo !== undefined && replyTo > 0 ? { replyTo } : {};
    // The message itself tells the others you've stopped typing.
    if (this.typingIn === channel) this.typingIn = null;
    this.send({ t: "chat_send", channel, body, ...(files.length ? { files } : {}), ...(mentions.length ? { mentions } : {}), ...answering });
    // Where and what kind, never the words.
    track("message_sent", { kind: isDm(channel) ? "dm" : "channel", picture: files.length > 0, mentions: mentions.length, reply: "replyTo" in answering });
  }

  /**
   * Whether your box here has words in it: "on" when it gets some, again now
   * and then while you keep typing, "off" when it's emptied. Sending clears
   * it for everyone without a word from us (they see the message arrive).
   */
  typing(channel: string, on: boolean) {
    const now = Date.now();
    if (on) {
      if (this.typingIn && this.typingIn !== channel) this.sayTyping(this.typingIn, false);
      if (this.typingIn === channel && now - this.typedAt < TYPING_EVERY_MS) return;
      this.typingIn = channel;
      this.typedAt = now;
      this.sayTyping(channel, true);
    } else if (this.typingIn === channel) {
      this.typingIn = null;
      this.sayTyping(channel, false);
    }
  }

  private sayTyping(channel: string, on: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: "chat_typing", channel, on }));
  }

  /** For React: who's typing in a conversation (useTyping). */
  subscribeTyping = (listener: () => void) => {
    this.typingListeners.add(listener);
    return () => this.typingListeners.delete(listener);
  };
  typistsIn = (channel: string): Typists => this.typists.get(channel) ?? NOBODY;

  private setTypists(channel: string, next: Map<string, { name: string; until: number }>) {
    if (next.size) this.typists.set(channel, next);
    else this.typists.delete(channel);
    this.typingListeners.forEach((listener) => listener());
    // Gone a moment after they stop saying so: one timer for every conversation.
    clearTimeout(this.typingSweep);
    const soonest = Math.min(...[...this.typists.values()].flatMap((one) => [...one.values()].map((typist) => typist.until)));
    if (Number.isFinite(soonest)) this.typingSweep = setTimeout(() => this.sweepTypists(), Math.max(0, soonest - Date.now()) + 50);
  }

  private sweepTypists() {
    const now = Date.now();
    for (const [channel, typists] of [...this.typists]) {
      const left = new Map([...typists].filter(([, typist]) => typist.until > now));
      if (left.size !== typists.size) this.setTypists(channel, left);
    }
  }

  /** Words in the office's channels and your direct messages, newest first. */
  search(q: string): Promise<ChatMessage[]> {
    const words = q.trim();
    if (words.length < 2) return Promise.resolve([]);
    return new Promise((resolve) => {
      const waiting = this.searches.get(words) ?? [];
      waiting.push(resolve);
      this.searches.set(words, waiting);
      if (waiting.length === 1) this.send({ t: "chat_search", q: words });
      // Nothing back (gone offline): an empty answer rather than a spinner forever.
      setTimeout(() => this.answer(words, []), 8000);
    });
  }

  /** Loads a conversation back to one message, so a search result opens where it was said. */
  reach(channel: string, seq: number) {
    if (this.state.history[channel]?.some((one) => one.seq <= seq)) return;
    const first = this.state.history[channel]?.[0]?.seq;
    this.send({ t: "chat_history", channel, to: seq, ...(first ? { before: first } : {}) });
  }

  private answer(q: string, found: ChatMessage[]) {
    const waiting = this.searches.get(q);
    if (!waiting) return;
    this.searches.delete(q);
    waiting.forEach((resolve) => resolve(found));
  }

  /**
   * A conversation's latest messages, if we don't have them and haven't asked:
   * when it's opened, when the pointer rests on it in the list, and for the
   * one Chat will open, as soon as the chat connects, so it's there already.
   */
  warm(channel: string) {
    if (!this.state.ready || this.state.history[channel] || this.asked.has(channel)) return;
    this.asked.add(channel);
    this.send({ t: "chat_history", channel });
  }

  older(channel: string) {
    const first = this.state.history[channel]?.[0]?.seq;
    this.send({ t: "chat_history", channel, ...(first ? { before: first } : {}) });
  }

  react(seq: number, emoji: string, on: boolean) {
    this.send({ t: "chat_react", seq, emoji, on });
  }

  /**
   * Change or unsend something you said. A lobby direct message (below zero)
   * was never stored, so it says which conversation it is in.
   */
  edit(seq: number, body: string, channel: string, mentions: string[] = []) {
    this.send({ t: "chat_edit", seq, body, ...(seq < 0 ? { channel } : {}), ...(mentions.length ? { mentions } : {}) });
  }

  remove(seq: number, channel: string) {
    this.send({ t: "chat_delete", seq, ...(seq < 0 ? { channel } : {}) });
  }

  makeChannel(name: string) {
    this.send({ t: "chat_channel", name });
  }

  /** Opens (or finds) the direct message with someone, and returns its id. */
  openDm(userId: string): string {
    this.send({ t: "chat_dm", userId });
    return dmChannelId(this.state.me, userId);
  }

  private send(message: ChatClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
    else this.queue.push(message);
  }

  private async open(generation: number) {
    const current = () => !this.stopped && generation === this.generation;
    if (!current() || !this.ticketFor) return;
    let url: string;
    let ticket: string;
    try {
      const minted = await this.ticketFor();
      url = minted.url;
      ticket = minted.ticket;
    } catch {
      return this.retry(generation);
    }
    if (!current()) return;

    const socket = new WebSocket(`${url}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.startHeartbeat();
      for (const message of this.queue.splice(0)) socket.send(JSON.stringify(message));
    };
    socket.onmessage = (event) => {
      if (event.data === HEARTBEAT_PONG || this.ws !== socket) return;
      this.handle(JSON.parse(event.data as string) as ChatServerMessage);
    };
    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.stopHeartbeat();
      this.ws = null;
      this.retry(generation);
    };
    socket.onerror = () => socket.close();
  }

  private retry(generation: number) {
    if (this.stopped || generation !== this.generation) return;
    const wait = Math.min(RECONNECT_BASE_MS * 2 ** this.attempts++, RECONNECT_MAX_MS);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.open(generation), wait);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => this.ws?.send(HEARTBEAT_PING), HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }

  private handle(message: ChatServerMessage) {
    switch (message.t) {
      case "chat_ready": {
        // Coming back after a dropped connection: the lobby's direct messages live only here, so they stay.
        const kept = this.state.channels.filter((one) => one.kind === "dm" && !message.channels.some((other) => other.id === one.id));
        const channels = withGeneral([...message.channels, ...kept]);
        // What was said while we were away isn't in what we hold: the open conversation is
        // read again from the server, the rest when they're next opened. (A lobby direct
        // message, numbered below zero, was never stored, so it stays as it is.)
        this.asked.clear();
        const history: Record<string, ChatMessage[]> = {};
        for (const [id, messages] of Object.entries(this.state.history)) {
          if (!messages.some((one) => one.seq > 0)) history[id] = messages;
          else if (id === this.watching) {
            // Kept on screen until the server's version replaces it.
            this.fresh.add(id);
            history[id] = messages;
          }
        }
        this.set({ ...this.state, ready: true, me: message.me, channels, history, unread: total(channels) });
        if (this.watching && this.fresh.has(this.watching)) {
          this.asked.add(this.watching);
          this.send({ t: "chat_history", channel: this.watching });
        }
        if (this.place) this.warm(lastConversation(this.place) ?? GENERAL_CHANNEL);
        break;
      }
      case "chat_new": {
        const { channel } = message.message;
        // Their message is here, so they've stopped typing it.
        if (this.typists.get(channel)?.has(message.message.author)) {
          const left = new Map(this.typists.get(channel));
          left.delete(message.message.author);
          this.setTypists(channel, left);
        }
        if (this.state.history[channel]?.some((one) => one.seq === message.message.seq)) break;
        // On screen only counts while the tab is: a message that lands while you're
        // in another window waits as unread, and is marked read when you come back.
        const seen = this.watching === channel && document.visibilityState === "visible";
        // The main meeting's card is the floor's news, not a message: it counts as nobody's unread.
        const mine = message.message.author === this.state.me || !!message.message.meeting;
        const forMe = !mine && !seen && !!message.message.mentions?.includes(this.state.me);
        const history = [...(this.state.history[channel] ?? []), message.message];
        const channels = withGeneral(
          this.state.channels.some((one) => one.id === channel)
            ? this.state.channels.map((one) =>
                one.id === channel
                  ? {
                      ...one,
                      unread: seen || mine ? 0 : one.unread + 1,
                      mentions: seen || mine ? 0 : (one.mentions ?? 0) + (forMe ? 1 : 0),
                      ...(message.message.meeting
                        ? {}
                        : {
                            lastAt: message.message.at,
                            lastBy: message.message.authorName,
                            lastBody: message.message.body || (message.message.files?.some(isVoice) ? "🎤" : message.message.files?.length ? "📎" : ""),
                          }),
                    }
                  : one,
              )
            : [
                ...this.state.channels,
                {
                  id: channel,
                  kind: channel.startsWith("dm:") ? "dm" : "channel",
                  name: channel.startsWith("dm:") ? message.message.authorName : channel,
                  unread: seen ? 0 : 1,
                  mentions: forMe ? 1 : 0,
                  lastAt: message.message.at,
                  lastBy: message.message.authorName,
                  lastBody: message.message.body || (message.message.files?.length ? "📎" : ""),
                } satisfies ChannelSummary,
              ],
        );
        this.set({
          ...this.state,
          channels,
          unread: total(channels),
          history: { ...this.state.history, [channel]: history },
        });
        if (seen && message.message.seq > 0 && !message.message.meeting) this.send({ t: "chat_read", channel, seq: message.message.seq });
        else if (!mine) {
          // A sound only for what's yours, the same as the rail's count: a busy channel stays quiet.
          if (isDm(channel) || forMe) playSound("message");
          this.incoming.forEach((listener) => listener(message.message));
        }
        break;
      }
      case "chat_page": {
        this.asked.delete(message.channel);
        const known = this.fresh.delete(message.channel) ? [] : (this.state.history[message.channel] ?? []);
        const seqs = new Set(known.map((one) => one.seq));
        const merged = [...message.messages.filter((one) => !seqs.has(one.seq)), ...known].sort(
          (a, b) => a.seq - b.seq,
        );
        this.set({
          ...this.state,
          history: { ...this.state.history, [message.channel]: merged },
          more: { ...this.state.more, [message.channel]: message.more },
        });
        break;
      }
      case "chat_reacted": {
        const history = (this.state.history[message.channel] ?? []).map((one) => {
          if (one.seq !== message.seq) return one;
          const people = new Set(one.reactions?.[message.emoji] ?? []);
          if (message.on) people.add(message.by);
          else people.delete(message.by);
          const reactions = { ...one.reactions, [message.emoji]: [...people] };
          if (!people.size) delete reactions[message.emoji];
          return { ...one, reactions };
        });
        this.set({ ...this.state, history: { ...this.state.history, [message.channel]: history } });
        break;
      }
      case "chat_meeting": {
        const history = (this.state.history[message.channel] ?? []).map((one) =>
          one.seq === message.seq ? { ...one, meeting: message.meeting } : one,
        );
        this.set({ ...this.state, history: { ...this.state.history, [message.channel]: history } });
        break;
      }
      case "chat_edited":
      case "chat_deleted": {
        // The server checked a stored message's author; a passing one it can't, so its author must be who changed it.
        const history = (this.state.history[message.channel] ?? []).flatMap((one) => {
          // A reply to it shows the change too: the new words, or that it's gone.
          const answers = one.reply?.seq === message.seq && message.seq > 0;
          const reply = !answers
            ? one.reply
            : message.t === "chat_deleted"
              ? { seq: message.seq, gone: true as const }
              : { ...one.reply!, body: message.body.slice(0, REPLY_SNIPPET) };
          const kept = reply === one.reply ? one : { ...one, reply };
          return one.seq !== message.seq || (one.seq < 0 && one.author !== message.by)
            ? [kept]
            : message.t === "chat_deleted"
              ? []
              : [{ ...kept, body: message.body, edited: message.edited, mentions: message.mentions }];
        });
        this.set({ ...this.state, history: { ...this.state.history, [message.channel]: history } });
        break;
      }
      case "chat_gone": {
        // Someone left the lobby: the conversation with them, never stored, goes too.
        const gone = (id: string) => id.startsWith("dm:") && id.slice(3).split("~").includes(message.userId);
        const ended = this.state.channels.find((one) => gone(one.id));
        const channels = this.state.channels.filter((one) => !gone(one.id));
        const history = Object.fromEntries(Object.entries(this.state.history).filter(([id]) => !gone(id)));
        const left = ended ? { ...this.state.left, [message.userId]: ended.name } : this.state.left;
        this.set({ ...this.state, channels, history, left, unread: total(channels) });
        break;
      }
      case "chat_channel": {
        const channels = withGeneral(
          this.state.channels.some((one) => one.id === message.channel.id)
            ? this.state.channels.map((one) => (one.id === message.channel.id ? message.channel : one))
            : [...this.state.channels, message.channel],
        );
        this.set({ ...this.state, channels, unread: total(channels) });
        break;
      }
      case "chat_typing": {
        const typists = new Map(this.typists.get(message.channel));
        if (message.on) typists.set(message.userId, { name: message.name, until: Date.now() + TYPING_SHOWN_MS });
        else if (!typists.delete(message.userId)) break;
        this.setTypists(message.channel, typists);
        break;
      }
      case "chat_found":
        this.answer(message.q, message.messages);
        break;
      case "help_changed":
        help.changed();
        break;
      case "chat_error":
        if (message.code === "slow_down") {
          this.set({ ...this.state, slowDown: true });
          setTimeout(() => this.set({ ...this.state, slowDown: false }), 4000);
        }
        if (message.code === "not_here") {
          this.set({ ...this.state, notHere: true });
          setTimeout(() => this.set({ ...this.state, notHere: false }), 4000);
        }
        break;
    }
  }

  private set(state: ChatState) {
    this.state = { ...state, version: this.state.version + 1 };
    for (const listener of this.listeners) listener();
  }
}

/** #general is there from the first day, whether or not anyone has used it. */
function withGeneral(channels: ChannelSummary[]): ChannelSummary[] {
  const has = channels.some((one) => one.id === GENERAL_CHANNEL);
  const all = has
    ? channels
    : [{ id: GENERAL_CHANNEL, kind: "channel" as const, name: GENERAL_CHANNEL, unread: 0 }, ...channels];
  // Channels first, in the order they were made; direct messages after, newest first.
  return [
    ...all.filter((one) => one.kind === "channel"),
    ...all.filter((one) => one.kind === "dm").sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0)),
  ];
}

/**
 * What the rail counts, the way Slack does: every unread direct message, and in
 * a channel only what mentions you. A channel that's merely busy is bold in the
 * list, not a number that never goes away.
 */
const total = (channels: ChannelSummary[]) =>
  channels.reduce((sum, one) => sum + (one.kind === "dm" ? one.unread : (one.mentions ?? 0)), 0);

export const chat = new ChatSocket();

// Back in the tab: what arrived in the open conversation meanwhile is read now.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") chat.watch(chat.watched);
  });
}
