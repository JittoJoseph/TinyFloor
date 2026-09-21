import { WorkerEntrypoint } from "cloudflare:workers";
import type { RealtimeAdminApi } from "../../shared-protocol/src";

/**
 * What tinyfloor-api may do to rooms. Reachable only through the API's service
 * binding, never from the internet.
 */
export class RealtimeAdmin extends WorkerEntrypoint<Env> implements RealtimeAdminApi {
  /** People in each room right now. Each room counts its own; a person is in one to three offices. */
  async presenceCounts(roomIds: string[]): Promise<Record<string, number>> {
    const counts = await Promise.all(roomIds.map((id) => this.env.ROOM.getByName(id).presenceCount()));
    return Object.fromEntries(roomIds.map((id, index) => [id, counts[index]]));
  }

  async closeRoom(roomId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).disconnectAll();
  }

  async forgetRoom(roomId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).forget();
  }

  async revokeGuestLink(roomId: string, linkId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).disconnectLink(linkId);
  }

  /** A membership ended: the floor and the office's chat both let go of them. */
  async removeMember(officeId: string, userId: string): Promise<void> {
    await Promise.all([
      this.env.ROOM.getByName(officeId).disconnectMember(userId),
      this.env.CHAT.getByName(officeId).removeMember(userId),
    ]);
  }
}
