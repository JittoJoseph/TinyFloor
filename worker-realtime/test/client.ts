import { env, exports } from "cloudflare:workers";
import { expect } from "vitest";
import { signTicket, type ClientMessage, type RoomTicket, type ServerMessage } from "../../shared-protocol/src";

export const ORIGIN = "http://localhost:3000";
let sequence = 0;

export const uniqueRoom = () => `test-${Date.now()}-${sequence++}`;

export class Client {
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

export const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

