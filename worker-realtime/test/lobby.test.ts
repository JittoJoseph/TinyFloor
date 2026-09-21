import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { signTicket, type ServerMessage } from "../../shared-protocol/src";

const ORIGIN = "http://localhost:3000";
let sequence = 0;

async function lobbyTicket(name = "Guest") {
  return signTicket(
    {
      v: 1,
      room: "lobby",
      sub: `guest-${sequence++}`,
      name,
      character: "Adam",
      role: "guest",
      cap: 20,
      exp: Date.now() + 60_000,
    },
    env.TICKET_SECRET,
  );
}

/** Joins through /lobby and resolves with the welcome message. */
async function joinLobby(name?: string) {
  const response = await exports.default.fetch(
    `https://realtime.tinyfloor.com/lobby?ticket=${encodeURIComponent(await lobbyTicket(name))}`,
    { headers: { Upgrade: "websocket", Origin: ORIGIN } },
  );
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  const welcome = new Promise<Extract<ServerMessage, { t: "welcome" }>>((resolve) => {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      if (message.t === "welcome") resolve(message);
    });
  });
  socket.accept();
  return { socket, welcome: await welcome };
}

describe("lobby", () => {
  it("fills lobby-1 with 20 people, then opens lobby-2", async () => {
    const first = [];
    for (let i = 0; i < 20; i++) first.push(await joinLobby(`First ${i}`));
    expect(first[19].welcome.players).toHaveLength(19);

    const overflow = await joinLobby("Overflow");
    expect(overflow.welcome.players).toEqual([]);

    // Once someone leaves lobby-1, the next visitor goes back there.
    first[0].socket.close(1000, "bye");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const next = await joinLobby("Next");
    expect(next.welcome.players).toHaveLength(19);
  });

  it("won't accept a lobby ticket for a specific copy", async () => {
    const response = await exports.default.fetch(
      `https://realtime.tinyfloor.com/rooms/lobby-1?ticket=${encodeURIComponent(await lobbyTicket())}`,
      { headers: { Upgrade: "websocket", Origin: ORIGIN } },
    );
    expect(response.status).toBe(401);
  });
});
