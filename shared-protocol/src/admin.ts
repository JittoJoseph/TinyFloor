/** What tinyfloor-api can ask tinyfloor-realtime to do, over a service binding. */
export interface RealtimeAdminApi {
  presenceCounts(roomIds: string[]): Promise<Record<string, number>>;
  closeRoom(roomId: string): Promise<void>;
  /** Everyone leaves and the room's storage (whiteboard, music) is deleted. */
  forgetRoom(roomId: string): Promise<void>;
  revokeGuestLink(roomId: string, linkId: string): Promise<void>;
  /** Someone's membership ended: they leave the floor and the office's chat. */
  removeMember(officeId: string, userId: string): Promise<void>;
  /** Who is in the public lobby, across its copies: a few faces and the total. */
  lobbyPeople(): Promise<LobbyPeople>;
}

export interface LobbyPeople {
  here: number;
  faces: Array<{ id: string; name: string }>;
}
