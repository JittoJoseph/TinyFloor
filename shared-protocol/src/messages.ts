import type { PieceChange, PieceChanges } from "./office";

export type PresenceStatus = "available" | "busy" | "away" | "in_call";

export const PRESENCE_STATUSES: readonly PresenceStatus[] = ["available", "busy", "away", "in_call"];

/** The plain-text heartbeat. The room answers it without waking up. */
export const HEARTBEAT_PING = "ping";
export const HEARTBEAT_PONG = "pong";

/** Whiteboard limits, carried over from the Java server. */
export const BOARD_MAX_STROKES = 400;
export const BOARD_MAX_POINTS_PER_STROKE = 4000;

/**
 * A few words beside someone's status, with an icon their name tag on the
 * floor shows: "Lunch, back at 2" with a bowl. It can clear itself when they
 * say, so a note never goes stale and nobody has to remember to take it down.
 */
export interface StatusNote {
  /** One of NOTE_ICONS, drawn the same everywhere; null for words alone. */
  icon: NoteIcon | null;
  text: string;
  /** When it clears itself, in milliseconds; null keeps it until it's changed. */
  until: number | null;
}

/**
 * The icons a note can have. A fixed set rather than any emoji: they look the
 * same on every device and match the rest of the app.
 */
export const NOTE_ICONS = [
  "chat",
  "focus",
  "lunch",
  "coffee",
  "meeting",
  "away",
  "sick",
  "holiday",
  "travel",
  "home",
  "commute",
  "code",
  "writing",
  "presenting",
  "call",
  "night",
] as const;
export type NoteIcon = (typeof NOTE_ICONS)[number];

/** The emoji notes had before they had icons, for a tab opened before then. */
const FROM_EMOJI: Record<string, NoteIcon> = {
  "💬": "chat",
  "🎧": "focus",
  "🍜": "lunch",
  "☕": "coffee",
  "🚶": "away",
  "📅": "meeting",
  "🎯": "focus",
  "🛠️": "code",
  "📞": "call",
  "🤒": "sick",
  "🌴": "holiday",
  "✈️": "travel",
  "🏠": "home",
  "🌙": "night",
};

export const STATUS_NOTE_MAX = 80;
/** A note can be set to last a week at most; longer than that, it's out of date. */
const NOTE_LONGEST_MS = 8 * 24 * 60 * 60 * 1000;

/** The note while it lasts; null once it has cleared itself. */
export function liveNote(note: StatusNote | null | undefined, now = Date.now()): StatusNote | null {
  return note && (note.until === null || note.until > now) ? note : null;
}

/** A note as someone sent it, made safe to keep and to show, or null for none. */
export function cleanNote(value: unknown, now = Date.now()): StatusNote | null {
  if (!value || typeof value !== "object") return null;
  const { icon, emoji, text, until } = value as Record<string, unknown>;
  const words =
    typeof text === "string"
      ? text
          .replace(/[\u0000-\u001f\u007f]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, STATUS_NOTE_MAX)
      : "";
  const mark = NOTE_ICONS.includes(icon as NoteIcon)
    ? (icon as NoteIcon)
    : typeof emoji === "string"
      ? (FROM_EMOJI[emoji.trim().replace(/\uFE0F$/, "")] ?? FROM_EMOJI[emoji.trim()] ?? null)
      : null;
  if (!words && !mark) return null;
  const ends = typeof until === "number" && Number.isFinite(until) && until > now ? Math.min(until, now + NOTE_LONGEST_MS) : null;
  return { icon: mark, text: words, until: ends };
}

export interface PlayerState {
  id: string;
  name: string;
  character: string;
  x: number;
  y: number;
  status: PresenceStatus;
  guest: boolean;
  seat: number | null;
  /** Their status note, while it lasts. */
  note?: StatusNote | null;
  /** Playing music from Spotify in TinyFloor: a mark on their name tag says so. */
  listening?: boolean;
}

/** A desk that is someone's own in an office (docs/product.md): they arrive sitting at it, and nobody else sits there. */
export interface Desk {
  seat: number;
  userId: string;
  name: string;
}

export interface MeetingMember {
  id: string;
  name: string;
}

/**
 * Every office has one meeting that is always there to join, and anyone can
 * start more; those last only while someone is in them. Meetings belong to the
 * room, not to a table: joining one walks you into the meeting room.
 */
export const MAIN_MEETING = "main";
export const MEETING_NAME_MAX = 40;
/** Ad hoc meetings are named `m-` and eight letters or digits. */
export const MEETING_ID = /^(main|m-[a-z0-9]{8})$/;

/** Someone in a meeting, as everyone in the room sees it. */
export interface MeetingPerson {
  id: string;
  name: string;
  character: string;
  /** When they joined, in server milliseconds. */
  since: number;
  speaking: boolean;
}

/** A meeting as the room lists it: the main one always, others while anyone is in them. */
export interface MeetingInfo {
  id: string;
  /** Null for the main meeting, and for one started without a name. */
  name: string | null;
  /** Who started it; null for the main meeting. */
  by: string | null;
  /** When the first person still in it joined; null when it's empty. */
  startedAt: number | null;
  members: MeetingPerson[];
}

/** Why the room turned a meeting request down. */
export type MeetingErrorCode = "not_found";

/**
 * Meeting hours (docs/pricing.md): the time a meeting has two or more people in it,
 * pooled across the place's meetings for the period. Past the allowance,
 * meetings carry on with voice only until the period resets.
 */
export interface MeetingUsage {
  /** Seconds used this period, as of when this was sent. */
  used: number;
  /** Seconds included in the period; null where there is no limit. */
  allowance: number | null;
  /** Meetings counting right now: `used` grows by this many seconds a second. */
  live: number;
  /** An office's allowance is monthly; a lobby copy's, daily. */
  period: "month" | "day";
  /** When `used` goes back to zero. */
  resetsAt: number;
  /** Video is paused in meetings until the reset (or a bigger plan). */
  paused: boolean;
}

export interface BoardStroke {
  id: string;
  color: string;
  size: number;
  erase: boolean;
  /** Flat list of coordinates: x1, y1, x2, y2, ... */
  points: number[];
}

/** Peer-to-peer call signalling kinds, relayed to one person. */
export const CALL_KINDS = ["invite", "accept", "decline", "signal", "add", "end"] as const;
export type CallKind = (typeof CALL_KINDS)[number];

/** Media a member publishes at a meeting table. One track of each kind at most. */
export const MEDIA_KINDS = ["mic", "camera", "screen"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/**
 * Meeting cameras are sent in three qualities at once and each viewer is sent
 * only the one its tile needs: `high` for a speaker filling the stage,
 * `medium` for two or three side by side, `low` for small tiles, the floor and
 * phones. Shared screens have `high` and `low`. Peer-to-peer calls turn the
 * sender's one encoding down instead.
 */
export const VIDEO_QUALITIES = ["high", "medium", "low"] as const;
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];
export type VideoKind = Exclude<MediaKind, "mic">;

export interface MediaFlags {
  mic: boolean;
  camera: boolean;
  screen: boolean;
}

export type SfuClientMessage =
  | { op: "publish"; sdp: string; tracks: { mid: string; kind: MediaKind }[] }
  | { op: "unpublish"; kinds: MediaKind[] }
  | { op: "subscribe"; tracks: { userId: string; kind: MediaKind; quality?: VideoQuality }[] }
  | { op: "unsubscribe"; mids: string[] }
  | { op: "answer"; sdp: string }
  /** Watch someone's video in the other quality, without renegotiating. */
  | { op: "quality"; userId: string; kind: VideoKind; mid: string; quality: VideoQuality }
  /** Which of your mic, camera and screen are on, so the table can show it. */
  | ({ op: "media" } & MediaFlags);

export type SfuServerMessage =
  | { op: "published"; sdp: string }
  /** The SFU wants to send new tracks: set this offer, then reply with `answer`. */
  | { op: "offer"; sdp: string; tracks: { userId: string; kind: MediaKind; mid: string }[] }
  | { op: "tracks"; userId: string; kinds: MediaKind[] }
  | { op: "untracks"; userId: string; kinds: MediaKind[] }
  | { op: "gone"; userId: string }
  | ({ op: "media"; userId: string } & MediaFlags)
  | { op: "error"; code: string };

export type ClientMessage =
  /**
   * The tile you're on and, while walking, your heading (0 to 7, clockwise from
   * east in 45 degree steps). Others keep you walking that way until the next
   * move, so it's sent when the heading changes, when you drift a tile from
   * where they'd have you, and once when you stop (no heading).
   */
  | { t: "move"; x: number; y: number; d?: number }
  | { t: "walk_to"; x: number; y: number }
  | { t: "sit"; seat: number; x: number; y: number }
  | { t: "stand"; x: number; y: number }
  | { t: "status"; status: PresenceStatus }
  /** Your status note changed (the API keeps it; this tells the floor). */
  | { t: "note"; note: StatusNote | null }
  /** You started or stopped playing music (the API keeps what it is; this marks your name tag). */
  | { t: "listening"; on: boolean }
  /**
   * Your name changed while you're on the demo office's floor, signing up with
   * Google from it (the API keeps it; this tells the floor, without walking out and back in).
   */
  | { t: "rename"; name: string }
  | { t: "board_sync" }
  | ({ t: "board_draw" } & BoardStroke)
  | { t: "board_clear" }
  | { t: "call"; kind: CallKind; to: string; data?: unknown }
  /** Join a meeting: the main one, or one someone started. Leaves any other first. */
  | { t: "meeting_join"; meeting: string }
  /** Start a meeting of your own and join it, asking these people in. */
  | { t: "meeting_start"; name?: string; invite?: string[] }
  | { t: "meeting_leave" }
  /** Ask people into the meeting you are in. */
  | { t: "meeting_invite"; to: string[] }
  /** Whether you are talking, while in a meeting; sent when it changes. */
  | { t: "speaking"; on: boolean }
  /**
   * Whether you're in a call on the floor and whether any video is coming to
   * you in it, sent when either changes. It's only counted (docs/costs.md): calls on
   * the floor are never limited.
   */
  | { t: "call_usage"; call: boolean; video: boolean }
  /** Make this desk yours, in an office: any desk you had before is let go. */
  | { t: "desk_claim"; seat: number }
  /** A change to a piece of your own desk (office.ts, canChange): null puts it back as the floor has it. */
  | { t: "piece"; key: string; change: PieceChange | null }
  /** Your desk back as the floor has it: everything on it, and its chair. */
  | { t: "desk_reset" }
  /** A wave to someone on the floor, as they come in or back to one (docs/product.md). */
  | { t: "wave"; to: string }
  | ({ t: "sfu" } & SfuClientMessage);

export type ServerMessage =
  | {
      t: "welcome";
      self: PlayerState;
      players: PlayerState[];
      /**
       * Always silence: the floor's jukebox is gone (21 October 2026), but a tab
       * opened before then reads this on arrival and breaks without it.
       */
      music?: { track: 0; playing: false; startedAt: 0; offset: 0 };
      meetings: MeetingInfo[];
      usage: MeetingUsage;
      /** Whose desk is whose, in an office; empty in the lobby. */
      desks: Desk[];
      /** What people have made of their desks, by piece (office.ts); empty in the lobby. */
      pieces?: PieceChanges;
    }
  /** Someone changed a piece of their desk; null when it went back to how the floor has it. */
  | { t: "piece"; key: string; change: PieceChange | null; by: string }
  /** Many pieces changed at once (a desk let go goes back to the floor's): all of them, whole. */
  | { t: "pieces"; pieces: PieceChanges }
  /** The desks changed: someone made one theirs, moved, or left the office. */
  | { t: "desks"; desks: Desk[] }
  /** Someone came onto the floor; `arrived` when they walked into an office, not back after a dropped connection. */
  | { t: "player_joined"; player: PlayerState; arrived?: boolean }
  /** Someone waved at someone: everyone sees the hand go up, the one waved at is told. */
  | { t: "waved"; from: string; to: string }
  | { t: "player_left"; id: string }
  | { t: "moved"; id: string; x: number; y: number; d?: number }
  | { t: "walking"; id: string; x: number; y: number }
  | { t: "move_rejected"; x: number; y: number }
  | { t: "sat"; id: string; seat: number; x: number; y: number }
  | { t: "stood"; id: string }
  | { t: "sit_rejected"; seat: number }
  | { t: "meeting_joined"; meeting: string; members: MeetingMember[] }
  | ({ t: "meeting_member_joined" } & MeetingMember)
  | { t: "meeting_member_left"; id: string }
  /** The meetings in the room, whole, whenever anyone joins, leaves or starts one. */
  | { t: "meetings"; meetings: MeetingInfo[] }
  | { t: "meeting_usage"; usage: MeetingUsage }
  | { t: "speaking"; id: string; on: boolean }
  | { t: "meeting_invited"; from: string; fromName: string; meeting: string; name: string | null }
  | { t: "meeting_error"; code: MeetingErrorCode }
  | { t: "status"; id: string; status: PresenceStatus }
  | { t: "note"; id: string; note: StatusNote | null }
  | { t: "listening"; id: string; on: boolean }
  | { t: "renamed"; id: string; name: string }
  | { t: "board_state"; strokes: BoardStroke[] }
  | ({ t: "board_draw"; by: string } & BoardStroke)
  | { t: "board_clear"; by: string }
  | { t: "call"; kind: CallKind; from: string; fromName: string; data?: unknown }
  | ({ t: "sfu" } & SfuServerMessage)
  | { t: "error"; code: "slow_down" | "bad_message" };

/** WebSocket close codes the room uses, and what the client should do about each. */
export const CloseCode = {
  RoomFull: 4001,
  Replaced: 4002,
  RoomClosed: 4003,
  AccessRevoked: 4004,
  TooManyMessages: 4008,
} as const;
