import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  CloseCode,
  signTicket,
  type ClientMessage,
  type RoomTicket,
  type ServerMessage,
} from "../../shared-protocol/src";

const ORIGIN = "http://localhost:3000";
let sequence = 0;

const uniqueRoom = () => `test-${Date.now()}-${sequence++}`;

class Client {
  readonly messages: ServerMessage[] = [];
  closeCode: number | null = null;
  private listeners: Array<() => void> = [];

  constructor(readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      if (event.data === "pong") return;
      this.messages.push(JSON.parse(event.data as string));
      this.notify();
    });
    socket.addEventListener("close", (event) => {
      this.closeCode = event.code;
      this.notify();
    });
  }

  static async open(
    room: string,
    claims: Partial<RoomTicket> = {},
    query = "",
  ): Promise<Client> {
    const ticket = await signTicket(
      {
        v: 1,
        room,
        sub: `user-${sequence++}`,
        name: "Ava",
        character: "Adam",
        role: "member",
        cap: 20,
        exp: Date.now() + 60_000,
        ...claims,
      },
      env.TICKET_SECRET,
    );
    const response = await exports.default.fetch(
      `https://realtime.tinyfloor.com/rooms/${room}?ticket=${encodeURIComponent(ticket)}${query}`,
      { headers: { Upgrade: "websocket", Origin: ORIGIN } },
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    socket.accept();
    return new Client(socket);
  }

  send(message: ClientMessage | string): void {
    this.socket.send(typeof message === "string" ? message : JSON.stringify(message));
  }

  async next<T extends ServerMessage["t"]>(type: T, timeout = 2000): Promise<Extract<ServerMessage, { t: T }>> {
    const found = await this.until(() => this.messages.find((message) => message.t === type), timeout);
    if (!found) throw new Error(`No ${type} message within ${timeout}ms`);
    return found as Extract<ServerMessage, { t: T }>;
  }

  async closed(timeout = 2000): Promise<number | null> {
    return this.until(() => this.closeCode ?? undefined, timeout).then((code) => code ?? null);
  }

  private until<T>(check: () => T | undefined, timeout: number): Promise<T | undefined> {
    return new Promise((resolve) => {
      const attempt = () => {
        const value = check();
        if (value !== undefined) {
          this.listeners = this.listeners.filter((listener) => listener !== attempt);
          clearTimeout(timer);
          resolve(value);
        }
      };
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((listener) => listener !== attempt);
        resolve(undefined);
      }, timeout);
      this.listeners.push(attempt);
      attempt();
    });
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

describe("room entry", () => {
  it("refuses requests that aren't WebSocket upgrades", async () => {
    const response = await exports.default.fetch("https://realtime.tinyfloor.com/rooms/design", {
      headers: { Origin: ORIGIN },
    });
    expect(response.status).toBe(426);
  });

  it("refuses other origins", async () => {
    const response = await exports.default.fetch("https://realtime.tinyfloor.com/rooms/design?ticket=x", {
      headers: { Upgrade: "websocket", Origin: "https://evil.example" },
    });
    expect(response.status).toBe(403);
  });

  it("refuses a missing or mismatched ticket", async () => {
    const missing = await exports.default.fetch("https://realtime.tinyfloor.com/rooms/design", {
      headers: { Upgrade: "websocket", Origin: ORIGIN },
    });
    expect(missing.status).toBe(401);

    const ticket = await signTicket(
      { v: 1, room: "other", sub: "u", name: "A", character: "Adam", role: "member", cap: 20, exp: Date.now() + 60_000 },
      env.TICKET_SECRET,
    );
    const mismatched = await exports.default.fetch(
      `https://realtime.tinyfloor.com/rooms/design?ticket=${encodeURIComponent(ticket)}`,
      { headers: { Upgrade: "websocket", Origin: ORIGIN } },
    );
    expect(mismatched.status).toBe(401);
  });
});

describe("room presence", () => {
  it("welcomes people and tells everyone who arrived", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { name: "Ava" }, "&x=10&y=12");
    const avaWelcome = await ava.next("welcome");
    expect(avaWelcome.self).toMatchObject({ name: "Ava", x: 10, y: 12, status: "available" });
    expect(avaWelcome.players).toEqual([]);

    const ben = await Client.open(room, { name: "Ben", role: "guest" });
    const benWelcome = await ben.next("welcome");
    expect(benWelcome.self).toMatchObject({ name: "Ben", x: 5, y: 5, guest: true });
    expect(benWelcome.players.map((player) => player.name)).toEqual(["Ava"]);

    const joined = await ava.next("player_joined");
    expect(joined.player.name).toBe("Ben");
  });

  it("tells everyone when someone leaves", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const ben = await Client.open(room);
    const benId = (await ben.next("welcome")).self.id;

    ben.socket.close(1000, "bye");
    const left = await ava.next("player_left");
    expect(left.id).toBe(benId);
  });

  it("closes a full room with room_full", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { cap: 1 });
    await ava.next("welcome");
    const ben = await Client.open(room, { cap: 1 });
    expect(await ben.closed()).toBe(CloseCode.RoomFull);
  });

  it("replaces an older connection from the same person without announcing a departure", async () => {
    const room = uniqueRoom();
    const watcher = await Client.open(room);
    await watcher.next("welcome");

    const first = await Client.open(room, { sub: "same-person" });
    await first.next("welcome");
    const second = await Client.open(room, { sub: "same-person" });
    await second.next("welcome");

    expect(await first.closed()).toBe(CloseCode.Replaced);
    await settle();
    expect(watcher.messages.some((message) => message.t === "player_left")).toBe(false);
  });
});

describe("room messages", () => {
  it("broadcasts a valid move to others, not back to the mover", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, {}, "&x=10&y=10");
    const avaId = (await ava.next("welcome")).self.id;
    const ben = await Client.open(room);
    await ben.next("welcome");

    ava.send({ t: "move", x: 11, y: 10 });
    expect(await ben.next("moved")).toEqual({ t: "moved", id: avaId, x: 11, y: 10 });
    await settle();
    expect(ava.messages.some((message) => message.t === "moved")).toBe(false);
  });

  it("rejects a move that jumps too far or leaves the map", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, {}, "&x=10&y=10");
    await ava.next("welcome");
    const ben = await Client.open(room);
    await ben.next("welcome");

    ava.send({ t: "move", x: 20, y: 10 });
    expect(await ava.next("move_rejected")).toEqual({ t: "move_rejected", x: 10, y: 10 });

    ava.messages.length = 0;
    ava.send({ t: "move", x: 0, y: 10 });
    expect(await ava.next("move_rejected")).toEqual({ t: "move_rejected", x: 10, y: 10 });

    await settle();
    expect(ben.messages.some((message) => message.t === "moved")).toBe(false);
  });

  it("broadcasts walking, status and chat", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { name: "Ava" });
    const avaId = (await ava.next("welcome")).self.id;
    const ben = await Client.open(room);
    await ben.next("welcome");

    ava.send({ t: "walk_to", x: 30, y: 20 });
    expect(await ben.next("walking")).toEqual({ t: "walking", id: avaId, x: 30, y: 20 });

    ava.send({ t: "status", status: "busy" });
    expect(await ben.next("status")).toEqual({ t: "status", id: avaId, status: "busy" });

    ava.send({ t: "chat", text: "  hello  " });
    const chat = await ben.next("chat");
    expect(chat).toMatchObject({ id: avaId, name: "Ava", text: "hello" });
    expect((await ava.next("chat")).text).toBe("hello");
  });

  it("ignores an unknown status and slows down chat floods", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const ben = await Client.open(room);
    await ben.next("welcome");

    ava.send({ t: "status", status: "asleep" as never });
    for (let i = 0; i < 6; i++) ava.send({ t: "chat", text: `message ${i}` });

    expect(await ava.next("error")).toEqual({ t: "error", code: "slow_down" });
    await settle();
    expect(ben.messages.filter((message) => message.t === "chat")).toHaveLength(5);
    expect(ben.messages.some((message) => message.t === "status")).toBe(false);
  });

  it("answers malformed messages with bad_message", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    ava.send("{not json");
    expect(await ava.next("error")).toEqual({ t: "error", code: "bad_message" });
  });

  it("closes a socket that floods the room", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const ben = await Client.open(room);
    await ben.next("welcome");

    for (let i = 0; i < 150; i++) ava.send({ t: "status", status: "away" });

    expect(await ava.closed()).toBe(CloseCode.TooManyMessages);
    expect((await ben.next("player_left")).id).toBeDefined();
  });

  it("answers the plain-text heartbeat without a JSON reply", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room);
    await ava.next("welcome");
    const pong = new Promise<string>((resolve) => {
      ava.socket.addEventListener("message", (event) => {
        if (event.data === "pong") resolve(event.data);
      });
    });
    ava.send("ping");
    await expect(pong).resolves.toBe("pong");
  });
});
