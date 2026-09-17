export type PresenceStatus = "available" | "busy" | "away" | "in_call";

export const PRESENCE_STATUSES: readonly PresenceStatus[] = ["available", "busy", "away", "in_call"];

export const CHAT_MAX_LENGTH = 500;

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

/** Camera simulcast layers: full, half and quarter resolution. */
export const CAMERA_LAYERS = ["f", "h", "q"] as const;
export type CameraLayer = (typeof CAMERA_LAYERS)[number];

export interface MediaFlags {
  mic: boolean;
  camera: boolean;
  screen: boolean;
}

export type SfuClientMessage =
  | { op: "publish"; sdp: string; tracks: { mid: string; kind: MediaKind }[] }
  | { op: "unpublish"; kinds: MediaKind[] }
  | { op: "subscribe"; tracks: { userId: string; kind: MediaKind; layer?: CameraLayer }[] }
  | { op: "unsubscribe"; mids: string[] }
  | { op: "answer"; sdp: string }
  | { op: "layer"; userId: string; mid: string; layer: CameraLayer }
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
  | { t: "move"; x: number; y: number }
  | { t: "walk_to"; x: number; y: number }
  | { t: "sit"; seat: number; x: number; y: number; meeting?: string }
  | { t: "stand"; x: number; y: number }
  | { t: "status"; status: PresenceStatus }
  | { t: "chat"; text: string }
  | { t: "board_sync" }
  | ({ t: "board_draw" } & BoardStroke)
  | { t: "board_clear" }
  | { t: "music_set"; track: number; playing: boolean; offset: number }
  | { t: "call"; kind: CallKind; to: string; data?: unknown }
  | ({ t: "sfu" } & SfuClientMessage);

export type ServerMessage =
  | { t: "welcome"; self: PlayerState; players: PlayerState[]; music: MusicState }
  | { t: "player_joined"; player: PlayerState }
  | { t: "player_left"; id: string }
  | { t: "moved"; id: string; x: number; y: number }
  | { t: "walking"; id: string; x: number; y: number }
  | { t: "move_rejected"; x: number; y: number }
  | { t: "sat"; id: string; seat: number; x: number; y: number }
  | { t: "stood"; id: string }
  | { t: "sit_rejected"; seat: number }
  | { t: "meeting_joined"; meeting: string; members: MeetingMember[] }
  | ({ t: "meeting_member_joined" } & MeetingMember)
  | { t: "meeting_member_left"; id: string }
  | { t: "status"; id: string; status: PresenceStatus }
  | { t: "chat"; id: string; name: string; text: string; at: number }
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
