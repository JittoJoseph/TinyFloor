// Stands in for tinyfloor-realtime in tests: answers the admin RPC and records calls.
import { WorkerEntrypoint } from "cloudflare:workers";

const calls = [];
const people = {};

export class RealtimeAdmin extends WorkerEntrypoint {
  async presenceCounts(roomIds) {
    return Object.fromEntries(roomIds.map((id) => [id, people[id] ?? 0]));
  }
  async closeRoom(roomId) {
    calls.push(["closeRoom", roomId]);
  }
  async forgetRoom(roomId) {
    calls.push(["forgetRoom", roomId]);
  }
  async revokeGuestLink(roomId, linkId) {
    calls.push(["revokeGuestLink", roomId, linkId]);
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
