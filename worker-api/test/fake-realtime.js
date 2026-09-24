// Stands in for tinyfloor-realtime in tests: answers the admin RPC and records calls.
import { WorkerEntrypoint } from "cloudflare:workers";

const calls = [];
const people = {};

export class RealtimeAdmin extends WorkerEntrypoint {
  async presenceCounts(roomIds) {
    return Object.fromEntries(roomIds.map((id) => [id, people[id] ?? 0]));
  }
  async lobbyPeople() {
    return { here: people.lobby ?? 0, faces: [] };
  }
  async closeRoom(roomId) {
    calls.push(["closeRoom", roomId]);
  }
  async forgetOffice(officeId) {
    calls.push(["forgetOffice", officeId]);
  }
  async revokeGuestLink(roomId, linkId) {
    calls.push(["revokeGuestLink", roomId, linkId]);
  }
  async removeMember(officeId, userId) {
    calls.push(["removeMember", officeId, userId]);
  }
  async lobbyChat(channel, before) {
    calls.push(["lobbyChat", channel, before]);
    return { channels: [{ id: "general", messages: 1, lastAt: 1 }], channel: "general", messages: [], more: false };
  }
  async moderateLobbyChat(seq, change) {
    calls.push(["moderateLobbyChat", seq, change]);
    return seq !== 404;
  }
  async officeCreated(event) {
    calls.push(["officeCreated", event.office, event.owner]);
  }
  // Test helpers.
  async setPeople(roomId, count) {
    people[roomId] = count;
  }
  async calls() {
    return calls;
  }
}

export default {
  fetch() {
    return new Response("fake realtime");
  },
};
