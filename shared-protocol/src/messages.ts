export type PresenceStatus = "available" | "busy" | "away" | "in_call";

export const PRESENCE_STATUSES: readonly PresenceStatus[] = ["available", "busy", "away", "in_call"];


/** The plain-text heartbeat. The room answers it without waking up. */
export const HEARTBEAT_PING = "ping";
export const HEARTBEAT_PONG = "pong";

/** Whiteboard limits, carried over from the Java server. */
export const BOARD_MAX_STROKES = 400;
export const BOARD_MAX_POINTS_PER_STROKE = 4000;

export interface PlayerState {
  id: string;
  name: string;
  character: string;
  x: number;
  y: number;
  status: PresenceStatus;
  guest: boolean;
  seat: number | null;
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

export interface BoardStroke {
  id: string;
  color: string;
  size: number;
  erase: boolean;
  /** Flat list of coordinates: x1, y1, x2, y2, ... */
  points: number[];
}

export interface MusicState {
  track: number;
  playing: boolean;
  /** When playback of `offset` started, in server milliseconds. */
  startedAt: number;
  /** Seconds into the track at `startedAt`. */
  offset: number;
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
  | { t: "board_sync" }
  | ({ t: "board_draw" } & BoardStroke)
  | { t: "board_clear" }
  | { t: "music_set"; track: number; playing: boolean; offset: number }
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
  | ({ t: "sfu" } & SfuClientMessage);

export type ServerMessage =
  | { t: "welcome"; self: PlayerState; players: PlayerState[]; music: MusicState; meetings: MeetingInfo[] }
  | { t: "player_joined"; player: PlayerState }
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
  | { t: "speaking"; id: string; on: boolean }
  | { t: "meeting_invited"; from: string; fromName: string; meeting: string; name: string | null }
  | { t: "meeting_error"; code: MeetingErrorCode }
  | { t: "status"; id: string; status: PresenceStatus }
  | { t: "board_state"; strokes: BoardStroke[] }
  | ({ t: "board_draw"; by: string } & BoardStroke)
  | { t: "board_clear"; by: string }
  | ({ t: "music" } & MusicState)
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
