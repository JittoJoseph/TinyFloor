/** What tinyfloor-api can ask tinyfloor-realtime to do, over a service binding. */
export interface RealtimeAdminApi {
  presenceCounts(roomIds: string[]): Promise<Record<string, number>>;
  closeRoom(roomId: string): Promise<void>;
  revokeGuestLink(roomId: string, linkId: string): Promise<void>;
}
