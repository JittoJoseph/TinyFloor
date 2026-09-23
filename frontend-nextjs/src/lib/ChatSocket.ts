"use client";

import { HEARTBEAT_PING, HEARTBEAT_PONG } from "@shared/messages";
import {
  GENERAL_CHANNEL,
  dmChannelId,
  type ChannelSummary,
  type ChatClientMessage,
  type ChatImage,
  type ChatMessage,
  type ChatServerMessage,
} from "@shared/chat";
import type { RoomTicket } from "./api";
import { playSound } from "./sounds";

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
  /** Total unread, for the badge on the rail. */
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
class ChatSocket {
  private ws: WebSocket | null = null;
  /** Which chat: an office's id, or the lobby. */
  private place: string | null = null;
  private ticketFor: (() => Promise<RoomTicket>) | null = null;
  private stopped = true;
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
    void this.open();
  }

  disconnect() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close(1000, "left");
    this.ws = null;
    this.place = null;
    this.ticketFor = null;
    this.queue = [];
    this.set(EMPTY);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
  getServerSnapshot = () => EMPTY;

  /** What the chat view is showing; its messages count as read. */
  watch(channel: string | null) {
    this.watching = channel;
    if (!channel) return;
    const seen = this.state.history[channel]?.at(-1)?.seq;
    // A lobby direct message (numbered below zero) is never stored, so there is nothing to mark read.
    if (seen && seen > 0) this.send({ t: "chat_read", channel, seq: seen });
    this.set({
      ...this.state,
      channels: this.state.channels.map((one) => (one.id === channel ? { ...one, unread: 0 } : one)),
      unread: total(this.state.channels.map((one) => (one.id === channel ? { ...one, unread: 0 } : one))),
    });
  }

  say(channel: string, body: string, image?: ChatImage) {
    this.send({ t: "chat_send", channel, body, ...(image ? { image } : {}) });
  }

  older(channel: string) {
    const first = this.state.history[channel]?.[0]?.seq;
    this.send({ t: "chat_history", channel, ...(first ? { before: first } : {}) });
  }

  react(seq: number, emoji: string, on: boolean) {
    this.send({ t: "chat_react", seq, emoji, on });
  }

  /** The lobby only: change or take back something you said. */
  edit(seq: number, body: string) {
    this.send({ t: "chat_edit", seq, body });
  }

  remove(seq: number) {
    this.send({ t: "chat_delete", seq });
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

  private async open() {
    if (this.stopped || !this.ticketFor) return;
    let url: string;
    let ticket: string;
    try {
      const minted = await this.ticketFor();
      url = minted.url;
      ticket = minted.ticket;
    } catch {
      return this.retry();
    }
    if (this.stopped) return;

    const socket = new WebSocket(`${url}?ticket=${encodeURIComponent(ticket)}`);
    this.ws = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.startHeartbeat();
      for (const message of this.queue.splice(0)) socket.send(JSON.stringify(message));
    };
    socket.onmessage = (event) => {
      if (event.data === HEARTBEAT_PONG) return;
      this.handle(JSON.parse(event.data as string) as ChatServerMessage);
    };
    socket.onclose = () => {
      this.stopHeartbeat();
      if (this.ws === socket) this.ws = null;
      this.retry();
    };
    socket.onerror = () => socket.close();
  }

  private retry() {
    if (this.stopped) return;
    const wait = Math.min(RECONNECT_BASE_MS * 2 ** this.attempts++, RECONNECT_MAX_MS);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => void this.open(), wait);
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
        this.set({ ...this.state, ready: true, me: message.me, channels, unread: total(channels) });
        break;
      }
      case "chat_new": {
        const { channel } = message.message;
        const seen = this.watching === channel;
        const history = [...(this.state.history[channel] ?? []), message.message];
        const channels = withGeneral(
          this.state.channels.some((one) => one.id === channel)
            ? this.state.channels.map((one) =>
                one.id === channel
                  ? {
                      ...one,
                      unread: seen || message.message.author === this.state.me ? 0 : one.unread + 1,
                      lastAt: message.message.at,
                      lastBy: message.message.authorName,
                      lastBody: message.message.image ? "📷" : message.message.body,
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
                  lastAt: message.message.at,
                  lastBy: message.message.authorName,
                  lastBody: message.message.body,
                } satisfies ChannelSummary,
              ],
        );
        this.set({
          ...this.state,
          channels,
          unread: total(channels),
          history: { ...this.state.history, [channel]: history },
        });
        if (seen && message.message.seq > 0) this.send({ t: "chat_read", channel, seq: message.message.seq });
        else if (message.message.author !== this.state.me) {
          playSound("message");
          this.incoming.forEach((listener) => listener(message.message));
        }
        break;
      }
      case "chat_page": {
        const known = this.state.history[message.channel] ?? [];
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
      case "chat_edited":
      case "chat_deleted": {
        const history = (this.state.history[message.channel] ?? []).flatMap((one) =>
          one.seq !== message.seq ? [one] : message.t === "chat_deleted" ? [] : [{ ...one, body: message.body, edited: message.edited }],
        );
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

const total = (channels: ChannelSummary[]) => channels.reduce((sum, one) => sum + one.unread, 0);

export const chat = new ChatSocket();
