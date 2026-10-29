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
export const LOBBY_CHANNELS = ["general", "feedback"] as const;
/** Who a change was made by when TinyFloor's admin made it, rather than the author. */
export const MODERATOR = "moderator";
export const LOBBY_RETENTION_DAYS = 7;
/** Kept per channel, oldest trimmed as it grows. */
export const CHANNEL_HISTORY_MAX = 5000;
/** The biggest file chat takes, in bytes. */
export const FILE_MAX = 10 * 1024 * 1024;
/** Files on one message. */
export const FILES_PER_MESSAGE = 4;
/** People one message can mention. */
export const MENTIONS_MAX = 20;
/** Messages a search finds, newest first. */
export const SEARCH_MAX = 30;
/** How far back opening a found message loads at most, so it's never a whole channel at once. */
export const JUMP_MAX = 500;

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
  /** Of those, the ones that mention you: what a channel counts, where it's otherwise only bold. */
  mentions?: number;
  /** The last thing said, for the channel list. */
  lastAt?: number;
  lastBy?: string;
  lastBody?: string;
}

/** A file shared in chat. Images carry their size, so they take their room before they load. */
export interface ChatFile {
  /** The object key in R2: `att/<office>/<id>.<ext>`. */
  key: string;
  name: string;
  /** Bytes. */
  size: number;
  /** Its media type, as the browser said when it was shared. */
  type: string;
  width?: number;
  height?: number;
  /** A voice message: how long it plays, in seconds. */
  duration?: number;
  /** A voice message: how loud it is along the way, as VOICE_PEAKS numbers from 0 to 100, for its waveform. */
  peaks?: number[];
}

/** Whether a file shows as a picture: the kinds every browser draws safely. */
export function isPicture(file: Pick<ChatFile, "type">): boolean {
  return /^image\/(png|jpeg|webp|gif|avif)$/.test(file.type);
}

/** Whether a file is a voice message recorded in chat, rather than a sound file someone shared. */
export function isVoice(file: Pick<ChatFile, "type" | "duration">): boolean {
  return file.type.startsWith("audio/") && typeof file.duration === "number";
}

/** The longest voice message, in seconds, and how many bars its waveform has. */
export const VOICE_MAX_SECONDS = 300;
export const VOICE_PEAKS = 48;

/**
 * Typing: a browser says "on" when its box gets words and again at most this
 * often while they keep typing, and "off" when the box empties; sending
 * clears it too. Without a word for this long (a tab closed mid-sentence) it
 * goes by itself.
 */
export const TYPING_EVERY_MS = 8000;
export const TYPING_SHOWN_MS = 15000;

/** How much of the message replied to a reply shows. */
export const REPLY_SNIPPET = 160;

/**
 * The message a reply answers, as the reply shows it: who said it and how it
 * begins, read when the reply is sent out, so an edit shows and a deleted
 * one says it's gone rather than keeping its words.
 */
export interface ChatReply {
  seq: number;
  author?: string;
  authorName?: string;
  body?: string;
  /** Files on it, for one that was only a picture. */
  files?: number;
  gone?: true;
}

export interface ChatMessage {
  seq: number;
  channel: string;
  author: string;
  authorName: string;
  body: string;
  files?: ChatFile[];
  /** Who it mentions, by id; the words say "@Name". */
  mentions?: string[];
  at: number;
  /** Emoji to the people who reacted with it. */
  reactions?: Record<string, string[]>;
  /** When it was last edited, if it was. */
  edited?: number;
  /** A lobby direct message: passed along, never stored. */
  passing?: boolean;
  /** The message this answers, if it's a reply. */
  reply?: ChatReply;
  /** The office's main meeting, shown in #general as a card rather than words. */
  meeting?: ChatMeeting;
}

/**
 * The main meeting in #general, the way a group call shows in a group chat:
 * when it started, everyone who came, who is in it now, and when it ended.
 * It is written by the floor as people come and go, never by a person.
 */
export interface ChatMeeting {
  started: number;
  ended?: number;
  /** Everyone who has been in it, in the order they came, with the name they had then. */
  people: Array<{ id: string; name: string }>;
  /** Who is in it now, by id. */
  here: string[];
}

/** How many faces a meeting card keeps. */
export const MEETING_PEOPLE_MAX = 24;

/** What a client sends up the chat socket. */
export type ChatClientMessage =
  | { t: "chat_send"; channel: string; body: string; files?: ChatFile[]; mentions?: string[]; replyTo?: number }
  /** A page of history; with `to`, everything back to that message, so a search result can be opened in place. */
  | { t: "chat_history"; channel: string; before?: number; to?: number }
  | { t: "chat_search"; q: string }
  /** You're writing in this conversation: passed to the others in it, never stored. */
  | { t: "chat_typing"; channel: string; on: boolean }
  | { t: "chat_read"; channel: string; seq: number }
  | { t: "chat_react"; seq: number; emoji: string; on: boolean }
  | { t: "chat_channel"; name: string }
  | { t: "chat_dm"; userId: string }
  /** The lobby only: change or take back something you said. */
  // `channel` is only needed for a lobby direct message, which isn't stored anywhere to look it up.
  | { t: "chat_edit"; seq: number; body: string; channel?: string; mentions?: string[] }
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
  | { t: "chat_edited"; seq: number; channel: string; body: string; edited: number; by: string; mentions?: string[] }
  | { t: "chat_meeting"; seq: number; channel: string; meeting: ChatMeeting }
  | { t: "chat_found"; q: string; messages: ChatMessage[] }
  | { t: "chat_typing"; channel: string; userId: string; name: string; on: boolean }
  | { t: "chat_deleted"; seq: number; channel: string; by: string }
  /** Someone left the lobby: their direct messages go with them. */
  | { t: "chat_gone"; userId: string }
  /** Help and feedback's ticket changed (the team answered, or closed it): read it again from the API. */
  | { t: "help_changed" }
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
