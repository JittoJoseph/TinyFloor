/** What tinyfloor-api can ask tinyfloor-realtime to do, over a service binding. */
export interface RealtimeAdminApi {
  presenceCounts(roomIds: string[]): Promise<Record<string, number>>;
  closeRoom(roomId: string): Promise<void>;
  /** The office was deleted: everyone leaves, and its floor (whiteboard, music) and its chat are deleted. */
  forgetOffice(officeId: string): Promise<void>;
  revokeGuestLink(roomId: string, linkId: string): Promise<void>;
  /** Someone's membership ended: they leave the floor and the office's chat. */
  removeMember(officeId: string, userId: string): Promise<void>;
  /** Who is in the public lobby, across its copies: a few faces and the total. */
  lobbyPeople(): Promise<LobbyPeople>;
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
