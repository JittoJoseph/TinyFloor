import { env, exports } from "cloudflare:workers";
import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  GENERAL_CHANNEL,
  LOBBY_CHANNELS,
  LOBBY_CHAT,
  dmChannelId,
  signTicket,
  type ChatClientMessage,
  type ChatServerMessage,
} from "../../shared-protocol/src";

const ORIGIN = "http://localhost:3000";
let sequence = 0;

const officeId = () => `office-${Date.now()}-${sequence++}`;

class ChatClient {
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

describe("office chat", () => {
  it("opens with #general before anything has been written", async () => {
    const client = await ChatClient.open(officeId(), { id: "u1", name: "Ada" });
    const ready = await client.next("chat_ready");
    expect(ready.me).toBe("u1");
    expect(ready.channels).toEqual([expect.objectContaining({ id: GENERAL_CHANNEL, kind: "channel", unread: 0 })]);
  });

  it("carries a message to everyone else in the office", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    const bo = await ChatClient.open(office, { id: "bo", name: "Bo" });
    await ada.next("chat_ready");
    await bo.next("chat_ready");

    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "  morning  " });

    const mine = await ada.next("chat_new");
    const theirs = await bo.next("chat_new");
    expect(mine.message).toMatchObject({ body: "morning", author: "ada", authorName: "Ada", channel: GENERAL_CHANNEL });
    expect(theirs.message.seq).toBe(mine.message.seq);
  });

  it("counts what you have not read, and stops counting once you have", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    await ada.next("chat_ready");
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "one" });
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "two" });
    await ada.next("chat_new");
    const second = await ada.next("chat_new");

    const bo = await ChatClient.open(office, { id: "bo", name: "Bo" });
    const ready = await bo.next("chat_ready");
    expect(ready.channels[0]).toMatchObject({ unread: 2, lastBody: "two", lastBy: "Ada" });

    bo.send({ t: "chat_read", channel: GENERAL_CHANNEL, seq: second.message.seq });
    const again = await ChatClient.open(office, { id: "bo", name: "Bo" });
    expect((await again.next("chat_ready")).channels[0].unread).toBe(0);
  });

  it("keeps a direct message to its two people", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    const bo = await ChatClient.open(office, { id: "bo", name: "Bo" });
    const cy = await ChatClient.open(office, { id: "cy", name: "Cy" });
    await Promise.all([ada.next("chat_ready"), bo.next("chat_ready"), cy.next("chat_ready")]);

    const channel = dmChannelId("ada", "bo");
    ada.send({ t: "chat_send", channel, body: "just you" });

    expect((await bo.next("chat_new")).message.body).toBe("just you");
    // Cy is in the same office but not in this conversation.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cy.messages.some((message) => message.t === "chat_new")).toBe(false);

    // And it shows up in Bo's sidebar next time, named after Ada.
    const later = await ChatClient.open(office, { id: "bo", name: "Bo" });
    const ready = await later.next("chat_ready");
    expect(ready.channels).toContainEqual(expect.objectContaining({ id: channel, kind: "dm", name: "Ada", unread: 1 }));
  });

  it("refuses a direct message between two other people", async () => {
    const office = officeId();
    const cy = await ChatClient.open(office, { id: "cy", name: "Cy" });
    await cy.next("chat_ready");
    cy.send({ t: "chat_send", channel: dmChannelId("ada", "bo"), body: "nosey" });
    expect((await cy.next("chat_error")).code).toBe("no_such_channel");
  });

  it("makes a channel when someone names it, and tells everyone", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    const bo = await ChatClient.open(office, { id: "bo", name: "Bo" });
    await Promise.all([ada.next("chat_ready"), bo.next("chat_ready")]);

    ada.send({ t: "chat_channel", name: "  Design Review!  " });
    expect((await bo.next("chat_channel")).channel).toMatchObject({ id: "design-review", kind: "channel" });

    ada.send({ t: "chat_channel", name: "design review" });
    expect((await ada.next("chat_error")).code).toBe("exists");
  });

  it("pages back through history, newest page first", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    await ada.next("chat_ready");
    for (let index = 0; index < 60; index++) ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: `m${index}` });
    for (let index = 0; index < 60; index++) await ada.next("chat_new");

    ada.send({ t: "chat_history", channel: GENERAL_CHANNEL });
    const page = await ada.next("chat_page");
    expect(page.messages).toHaveLength(50);
    expect(page.more).toBe(true);
    expect(page.messages.at(-1)!.body).toBe("m59");

    ada.send({ t: "chat_history", channel: GENERAL_CHANNEL, before: page.messages[0].seq });
    const older = await ada.next("chat_page");
    expect(older.messages).toHaveLength(10);
    expect(older.more).toBe(false);
    expect(older.messages[0].body).toBe("m0");
  });

  it("adds and removes a reaction", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    const bo = await ChatClient.open(office, { id: "bo", name: "Bo" });
    await Promise.all([ada.next("chat_ready"), bo.next("chat_ready")]);
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "ship it" });
    const posted = await ada.next("chat_new");

    bo.send({ t: "chat_react", seq: posted.message.seq, emoji: "👍", on: true });
    expect(await ada.next("chat_reacted")).toMatchObject({ emoji: "👍", by: "bo", on: true });

    bo.send({ t: "chat_react", seq: posted.message.seq, emoji: "👍", on: false });
    expect(await ada.next("chat_reacted")).toMatchObject({ on: false });

    ada.send({ t: "chat_history", channel: GENERAL_CHANNEL });
    expect((await ada.next("chat_page")).messages.at(-1)!.reactions).toBeUndefined();
  });

  it("drops an empty message and one that is only spaces", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, { id: "ada", name: "Ada" });
    await ada.next("chat_ready");
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "   " });
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "real" });
    expect((await ada.next("chat_new")).message.body).toBe("real");
  });
});

describe("lobby chat", () => {
  it("has the same fixed channels for everyone, and guests post under their name", async () => {
    const guest = await ChatClient.open(LOBBY_CHAT, { id: `guest-${sequence++}`, name: "Mara" }, "guest");
    const ready = await guest.next("chat_ready");
    expect(ready.channels.map((one) => one.id)).toEqual([...LOBBY_CHANNELS]);

    const other = await ChatClient.open(LOBBY_CHAT, { id: `guest-${sequence++}`, name: "Tomas" }, "guest");
    await other.next("chat_ready");
    const text = `hello lobby ${sequence++}`;
    guest.send({ t: "chat_send", channel: "introductions", body: text });
    const seen = await other.next("chat_new");
    expect(seen.message).toMatchObject({ channel: "introductions", authorName: "Mara", body: text });
  });

  it("keeps what an office adds for offices: no channels, no images, no other channel names", async () => {
    const ada = await ChatClient.open(LOBBY_CHAT, { id: `lobby-ada-${sequence++}`, name: "Ada" });
    await ada.next("chat_ready");

    ada.send({ t: "chat_channel", name: "random" });
    expect((await ada.next("chat_error")).code).toBe("offices_only");
    ada.messages.length = 0;

    ada.send({ t: "chat_send", channel: "general", body: "", image: { key: "att/x.webp", width: 1, height: 1 } });
    expect((await ada.next("chat_error")).code).toBe("offices_only");
    ada.messages.length = 0;

    ada.send({ t: "chat_send", channel: "random", body: "nope" });
    expect((await ada.next("chat_error")).code).toBe("no_such_channel");
  });

  it("passes direct messages between two people without storing them, and says when the other isn't there", async () => {
    const ada = await ChatClient.open(LOBBY_CHAT, { id: `lobby-dm-ada-${sequence++}`, name: "Ada" });
    const bo = await ChatClient.open(LOBBY_CHAT, { id: `lobby-dm-bo-${sequence++}`, name: "Bo" }, "guest");
    await ada.next("chat_ready");
    await bo.next("chat_ready");

    const channel = dmChannelId(ada.userId, bo.userId);
    ada.send({ t: "chat_dm", userId: bo.userId });
    expect((await ada.next("chat_channel")).channel).toMatchObject({ id: channel, kind: "dm", name: "Bo" });

    ada.send({ t: "chat_send", channel, body: "just between us" });
    const got = await bo.next("chat_new");
    expect(got.message).toMatchObject({ channel, body: "just between us", passing: true });
    expect(got.message.seq).toBeLessThan(0);

    await runInDurableObject(env.CHAT.getByName(LOBBY_CHAT), async (_chat, state) => {
      const stored = state.storage.sql.exec("SELECT 1 FROM messages WHERE channel = ?", channel).toArray();
      expect(stored).toHaveLength(0);
    });

    // Someone outside the conversation can't post into it.
    const cy = await ChatClient.open(LOBBY_CHAT, { id: `lobby-dm-cy-${sequence++}`, name: "Cy" });
    await cy.next("chat_ready");
    cy.send({ t: "chat_send", channel, body: "hi" });
    expect((await cy.next("chat_error")).code).toBe("no_such_channel");

    // Bo leaves: everyone hears, and Ada's next message has nowhere to go.
    bo.socket.close(1000, "left");
    expect((await ada.next("chat_gone")).userId).toBe(bo.userId);
    ada.send({ t: "chat_send", channel, body: "still there?" });
    expect((await ada.next("chat_error")).code).toBe("not_here");
  });

  it("lets people edit and delete what they said in the lobby, and only that", async () => {
    const ada = await ChatClient.open(LOBBY_CHAT, { id: `lobby-edit-ada-${sequence++}`, name: "Ada" });
    const bo = await ChatClient.open(LOBBY_CHAT, { id: `lobby-edit-bo-${sequence++}`, name: "Bo" });
    await ada.next("chat_ready");
    await bo.next("chat_ready");

    ada.send({ t: "chat_send", channel: "general", body: "helo" });
    const { seq } = (await ada.next("chat_new")).message;
    await bo.next("chat_new");

    // Not Bo's to change.
    bo.send({ t: "chat_edit", seq, body: "hijacked" });
    bo.send({ t: "chat_delete", seq });

    ada.send({ t: "chat_edit", seq, body: "hello" });
    const edited = await bo.next("chat_edited");
    expect(edited).toMatchObject({ seq, channel: "general", body: "hello" });

    ada.send({ t: "chat_history", channel: "general" });
    const page = await ada.next("chat_page");
    expect(page.messages.find((one) => one.seq === seq)).toMatchObject({ body: "hello", edited: edited.edited });

    ada.send({ t: "chat_delete", seq });
    expect(await bo.next("chat_deleted")).toMatchObject({ seq, channel: "general" });
    await runInDurableObject(env.CHAT.getByName(LOBBY_CHAT), async (_chat, state) => {
      expect(state.storage.sql.exec("SELECT 1 FROM messages WHERE seq = ?", seq).toArray()).toHaveLength(0);
    });
  });

  it("keeps editing to the lobby", async () => {
    const office = `office-edit-${sequence++}`;
    const ada = await ChatClient.open(office, { id: `edit-ada-${sequence++}`, name: "Ada" });
    await ada.next("chat_ready");
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "first" });
    const { seq } = (await ada.next("chat_new")).message;
    ada.send({ t: "chat_edit", seq, body: "second" });
    ada.send({ t: "chat_history", channel: GENERAL_CHANNEL });
    const page = await ada.next("chat_page");
    expect(page.messages.find((one) => one.seq === seq)?.body).toBe("first");
  });

  it("forgets messages older than a week, once a day", async () => {
    const ada = await ChatClient.open(LOBBY_CHAT, { id: `lobby-old-${sequence++}`, name: "Ada" });
    await ada.next("chat_ready");
    ada.send({ t: "chat_send", channel: "feedback", body: "fresh one" });
    await ada.next("chat_new");

    const stub = env.CHAT.getByName(LOBBY_CHAT);
    await runInDurableObject(stub, async (_chat, state) => {
      const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
      state.storage.sql.exec(
        "INSERT INTO messages (channel, author, author_name, body, image, at) VALUES ('feedback', 'x', 'X', 'stale', NULL, ?)",
        old,
      );
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (_chat, state) => {
      const bodies = state.storage.sql.exec<{ body: string }>("SELECT body FROM messages WHERE channel = 'feedback'").toArray();
      expect(bodies.map((row) => row.body)).toContain("fresh one");
      expect(bodies.map((row) => row.body)).not.toContain("stale");
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
  });
});
