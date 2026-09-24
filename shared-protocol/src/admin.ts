import type { ChatMessage } from "./chat";
import type { PresenceStatus } from "./messages";

/** What tinyfloor-api can ask tinyfloor-realtime to do, over a service binding. */
export interface RealtimeAdminApi {
  presenceCounts(roomIds: string[]): Promise<Record<string, number>>;
  /** Who is in each office right now, once each, with how they look and their status: for the dashboard. */
  officePresence(officeIds: string[]): Promise<Record<string, PresentPerson[]>>;
  closeRoom(roomId: string): Promise<void>;
  /** The office was deleted: everyone leaves, and its floor (whiteboard, music) and its chat are deleted. */
  forgetOffice(officeId: string): Promise<void>;
  revokeGuestLink(roomId: string, linkId: string): Promise<void>;
  /** Someone's membership ended: they leave the floor and the office's chat. */
  removeMember(officeId: string, userId: string): Promise<void>;
  /** Who is in the public lobby, across its copies: a few faces and the total. */
  lobbyPeople(): Promise<LobbyPeople>;
  /** The lobby's chat, for the admin page: its channels, and a page of one of them, newest last. */
  lobbyChat(channel: string, before?: number): Promise<LobbyChatPage>;
  /** Changes or takes down a message in the lobby's chat. False when it is already gone. */
  moderateLobbyChat(seq: number, change: { body: string } | { remove: true }): Promise<boolean>;
  /** A new office: the team hears about it on Discord. */
  officeCreated(event: { office: string; owner: string; where: Whereabouts }): Promise<void>;
}

/** Where a request came from, as far as Cloudflare can tell. */
export interface Whereabouts {
  city?: string;
  region?: string;
  /** ISO 3166 code, e.g. "DE". */
  country?: string;
}

export interface LobbyPeople {
  here: number;
  faces: Array<{ id: string; name: string }>;
}

/** Someone on a floor right now. */
export interface PresentPerson {
  id: string;
  name: string;
  character: string;
  status: PresenceStatus;
}

export interface LobbyChatPage {
  channels: Array<{ id: string; messages: number; lastAt: number | null }>;
  channel: string;
  messages: ChatMessage[];
  /** Older messages remain before the first one. */
  more: boolean;
}
