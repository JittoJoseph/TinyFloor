import { WorkerEntrypoint } from "cloudflare:workers";
import {
  LOBBY_CHAT,
  LOBBY_COPY_CAPACITY,
  type LobbyChatPage,
  type LobbyPeople,
  type PresentPerson,
  type RealtimeAdminApi,
  type Whereabouts,
} from "../../shared-protocol/src";
import { Reporter } from "./discord";
import { lobbyCopy } from "./lobby";

/** Faces the lobby door shows. */
const FACES = 5;

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

  /** Who is in each office, a dozen at most each: enough for faces and names on the dashboard. */
  async officePresence(officeIds: string[]): Promise<Record<string, PresentPerson[]>> {
    const people = await Promise.all(officeIds.map((id) => this.env.ROOM.getByName(id).presentPeople(12)));
    return Object.fromEntries(officeIds.map((id, index) => [id, people[index]]));
  }

  async closeRoom(roomId: string): Promise<void> {
    await this.env.ROOM.getByName(roomId).disconnectAll();
  }

  async forgetOffice(officeId: string): Promise<void> {
    await Promise.all([this.env.ROOM.getByName(officeId).forget(), this.env.CHAT.getByName(officeId).forget()]);
  }

  /**
   * The lobby's door: the copies in order, until two in a row are empty (a
   * copy can empty out while the next still has people). Normally two calls.
   */
  async lobbyPeople(): Promise<LobbyPeople> {
    let here = 0;
    let empty = 0;
    const faces: LobbyPeople["faces"] = [];
    for (let number = 1; number <= 50 && empty < 2; number++) {
      const people = await this.env.ROOM.getByName(lobbyCopy(number)).presentPeople(LOBBY_COPY_CAPACITY);
      empty = people.length ? 0 : empty + 1;
      here += people.length;
      for (const one of people) if (faces.length < FACES) faces.push({ id: one.id, name: one.name });
    }
    return { here, faces };
  }

  async lobbyChat(channel: string, before?: number): Promise<LobbyChatPage> {
    return this.env.CHAT.getByName(LOBBY_CHAT).moderationPage(channel, before);
  }

  async moderateLobbyChat(seq: number, change: { body: string } | { remove: true }): Promise<boolean> {
    return this.env.CHAT.getByName(LOBBY_CHAT).moderate(seq, change);
  }

  /** A new office, for the team's Discord. The webhook lives here, with the lobby's. */
  async officeCreated(event: { office: string; owner: string; where: Whereabouts }): Promise<void> {
    await new Reporter(this.env.DISCORD_WEBHOOK_URL).report({ kind: "office_created", ...event });
  }

  /** A membership ended: the floor and the office's chat both let go of them. */
  async removeMember(officeId: string, userId: string): Promise<void> {
    await Promise.all([
      this.env.ROOM.getByName(officeId).disconnectMember(userId),
      this.env.CHAT.getByName(officeId).removeMember(userId),
    ]);
  }
}
