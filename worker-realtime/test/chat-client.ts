import { env, exports } from "cloudflare:workers";
import { expect } from "vitest";
import { LOBBY_CHAT, signTicket, type ChatClientMessage, type ChatServerMessage } from "../../shared-protocol/src";

const ORIGIN = "http://localhost:3000";
let made = 0;

/** An office id no other test uses. */
export const officeId = () => `office-${Date.now()}-${made++}`;

/** A chat socket as a test sees it: what arrived, and a way to wait for the next of a kind. */
export class ChatClient {
  readonly messages: ChatServerMessage[] = [];
  private listeners: Array<() => void> = [];

  constructor(
    readonly socket: WebSocket,
    readonly userId: string,
  ) {
    socket.addEventListener("message", (event) => {
      if (event.data === "pong") return;
      this.messages.push(JSON.parse(event.data as string));
      for (const listener of this.listeners.splice(0)) listener();
    });
  }

  static async open(office: string, who: { id: string; name: string }, role = "member"): Promise<ChatClient> {
    const ticket = await signTicket(
      {
        v: 1,
        room: `chat:${office}`,
        sub: who.id,
        name: who.name,
        character: "Adam",
        role: role as "member",
        cap: 10,
        exp: Date.now() + 60_000,
      },
      env.TICKET_SECRET,
    );
    const response = await exports.default.fetch(
      `https://realtime.tinyfloor.com/${office === LOBBY_CHAT ? "lobby" : `offices/${office}`}/chat?ticket=${encodeURIComponent(ticket)}`,
      { headers: { Upgrade: "websocket", Origin: ORIGIN } },
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    socket.accept();
    return new ChatClient(socket, who.id);
  }

  send(message: ChatClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  async next<T extends ChatServerMessage["t"]>(type: T, timeout = 2000): Promise<Extract<ChatServerMessage, { t: T }>> {
    const at = () => this.messages.findIndex((message) => message.t === type);
    const deadline = Date.now() + timeout;
    while (at() < 0) {
      if (Date.now() > deadline) throw new Error(`no ${type} after ${timeout}ms`);
      await new Promise<void>((resolve) => {
        this.listeners.push(resolve);
        setTimeout(resolve, 20);
      });
    }
    const index = at();
    const message = this.messages[index];
    this.messages.splice(0, index + 1);
    return message as Extract<ChatServerMessage, { t: T }>;
  }
}
