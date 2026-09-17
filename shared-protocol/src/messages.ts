export type PresenceStatus = "available" | "busy" | "away" | "in_call";

export const PRESENCE_STATUSES: readonly PresenceStatus[] = ["available", "busy", "away", "in_call"];

export const CHAT_MAX_LENGTH = 500;

/** The plain-text heartbeat. The room answers it without waking up. */
export const HEARTBEAT_PING = "ping";
export const HEARTBEAT_PONG = "pong";

export interface PlayerState {
  id: string;
  name: string;
  character: string;
  x: number;
  y: number;
  status: PresenceStatus;
  guest: boolean;
}

export type ClientMessage =
  | { t: "move"; x: number; y: number }
  | { t: "walk_to"; x: number; y: number }
  | { t: "status"; status: PresenceStatus }
  | { t: "chat"; text: string };

export type ServerMessage =
  | { t: "welcome"; self: PlayerState; players: PlayerState[] }
  | { t: "player_joined"; player: PlayerState }
  | { t: "player_left"; id: string }
  | { t: "moved"; id: string; x: number; y: number }
  | { t: "walking"; id: string; x: number; y: number }
  | { t: "move_rejected"; x: number; y: number }
  | { t: "status"; id: string; status: PresenceStatus }
  | { t: "chat"; id: string; name: string; text: string; at: number }
  | { t: "error"; code: "slow_down" | "bad_message" };

/** WebSocket close codes the room uses, and what the client should do about each. */
export const CloseCode = {
  RoomFull: 4001,
  Replaced: 4002,
  RoomClosed: 4003,
  AccessRevoked: 4004,
  TooManyMessages: 4008,
} as const;
