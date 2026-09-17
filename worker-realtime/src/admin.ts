import { WorkerEntrypoint } from "cloudflare:workers";

/**
 * What tinyfloor-api may do to rooms. Reachable only through the API's service
 * binding, never from the internet.
 */
export class RealtimeAdmin extends WorkerEntrypoint<Env> {
  /** People in each room right now. Wakes hibernating rooms only briefly. */
  async presenceCounts(roomIds: string[]): Promise<Record<string, number>> {
    const counts = await Promise.all(roomIds.map((id) => this.env.ROOM.getByName(id).presenceCount()));
    return Object.fromEntries(roomIds.map((id, index) => [id, counts[index]]));
  }

  async closeRoom(roomId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).disconnectAll();
  }

  async revokeGuestLink(roomId: string, linkId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).disconnectLink(linkId);
  }
}
