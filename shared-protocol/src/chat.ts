/**
 * The office's own chat: channels everyone in the office can read, and direct
 * messages between two of them. It rides its own socket, separate from the
 * floor, so unread counts work while you are walking around.
 *
 * Chat on the floor (`t: "chat"` in `messages.ts`) is a different thing: it is
 * transient, nearby only, and never stored.
 */

export const CHAT_BODY_MAX = 4000;
export const CHAT_PAGE = 50;
/** Every office has this channel from the day it is made, without a row anywhere. */
export const GENERAL_CHANNEL = "general";
export const CHANNEL_NAME_MAX = 32;

/**
 * The public lobby has one chat for every copy of its floor: the same channels
 * whichever copy you landed in, fixed ones only, open to guests, and nothing
 * older than a week. You can edit or delete what you said there. Direct
 * messages in the lobby are passed along and never stored: they last until
 * either of you leaves. New channels and images are what an office adds, so
 * the lobby shows them and says so.
 */
export const LOBBY_CHAT = "lobby";
export const LOBBY_CHANNELS = ["general", "introductions", "feedback"] as const;
/** Who a change was made by when TinyFloor's admin made it, rather than the author. */
export const MODERATOR = "moderator";
export const LOBBY_RETENTION_DAYS = 7;
/** Kept per channel, oldest trimmed by the nightly job. */
export const CHANNEL_HISTORY_MAX = 5000;

export type ChannelKind = "channel" | "dm";

export interface ChannelSummary {
  id: string;
  kind: ChannelKind;
  /** The channel's name, or the other person's name for a direct message. */
  name: string;
  /** Who you are talking to, for a direct message. */
  withId?: string;
  /** Messages you have not read. */
  unread: number;
  /** The last thing said, for the channel list. */
  lastAt?: number;
  lastBy?: string;
  lastBody?: string;
}

export interface ChatImage {
  /** The object key in R2. */
  key: string;
  width: number;
  height: number;
}

export interface ChatMessage {
  seq: number;
  channel: string;
  author: string;
  authorName: string;
  body: string;
  image?: ChatImage;
  at: number;
  /** Emoji to the people who reacted with it. */
  reactions?: Record<string, string[]>;
  /** When it was last edited, if it was. */
  edited?: number;
  /** A lobby direct message: passed along, never stored. */
  passing?: boolean;
}

/** What a client sends up the chat socket. */
export type ChatClientMessage =
  | { t: "chat_send"; channel: string; body: string; image?: ChatImage }
  | { t: "chat_history"; channel: string; before?: number }
  | { t: "chat_read"; channel: string; seq: number }
  | { t: "chat_react"; seq: number; emoji: string; on: boolean }
  | { t: "chat_channel"; name: string }
  | { t: "chat_dm"; userId: string }
  /** The lobby only: change or take back something you said. */
  // `channel` is only needed for a lobby direct message, which isn't stored anywhere to look it up.
  | { t: "chat_edit"; seq: number; body: string; channel?: string }
  | { t: "chat_delete"; seq: number; channel?: string };

/** What the chat object sends down. */
export type ChatServerMessage =
  | { t: "chat_ready"; me: string; channels: ChannelSummary[] }
  | { t: "chat_new"; message: ChatMessage }
  | { t: "chat_page"; channel: string; messages: ChatMessage[]; more: boolean }
  | { t: "chat_reacted"; seq: number; channel: string; emoji: string; by: string; on: boolean }
  | { t: "chat_channel"; channel: ChannelSummary }
  // `by` is who changed it: its author, or MODERATOR. A lobby direct message was never stored, so
  // the server can't check it; clients apply a change to one only when `by` is its author.
  | { t: "chat_edited"; seq: number; channel: string; body: string; edited: number; by: string }
  | { t: "chat_deleted"; seq: number; channel: string; by: string }
  /** Someone left the lobby: their direct messages go with them. */
  | { t: "chat_gone"; userId: string }
  | { t: "chat_error"; code: string };

/** The id of the direct-message channel between two people, whoever asks. */
export function dmChannelId(a: string, b: string): string {
  return `dm:${[a, b].sort().join("~")}`;
}

export function isDm(channel: string): boolean {
  return channel.startsWith("dm:");
}

/** The two people in a direct-message channel. */
export function dmMembers(channel: string): [string, string] | null {
  if (!isDm(channel)) return null;
  const [a, b] = channel.slice(3).split("~");
  return a && b ? [a, b] : null;
}

/** A channel name: lowercase, dashes for spaces, no punctuation to get wrong. */
export function cleanChannelName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, CHANNEL_NAME_MAX);
}
