import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GENERAL_CHANNEL, dmChannelId, type PushPayload } from "../../shared-protocol/src";
import { encrypt, fromBase64Url, toBase64Url, vapid } from "../src/push";
import { ChatClient, officeId } from "./chat-client";

const encoder = new TextEncoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: string | Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bytes = typeof info === "string" ? encoder.encode(info) : info;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: bytes }, key, length * 8));
}

/** A browser's side of a subscription: its keys, and how it reads what arrives (RFC 8291). */
async function browser() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const publicKey = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    p256dh: toBase64Url(publicKey),
    auth: toBase64Url(auth),
    async read(body: Uint8Array<ArrayBuffer>): Promise<string> {
      const salt = body.slice(0, 16);
      expect(new DataView(body.buffer, body.byteOffset).getUint32(16)).toBe(4096);
      const keyLength = body[20];
      const senderKey = body.slice(21, 21 + keyLength);
      const sender = await crypto.subtle.importKey("raw", senderKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
      const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: sender }, pair.privateKey, 256));
      const info = new Uint8Array([...encoder.encode("WebPush: info\0"), ...publicKey, ...senderKey]);
      const ikm = await hkdf(auth, shared, info, 32);
      const key = await crypto.subtle.importKey("raw", await hkdf(salt, ikm, "Content-Encoding: aes128gcm\0", 16), "AES-GCM", false, ["decrypt"]);
      const iv = await hkdf(salt, ikm, "Content-Encoding: nonce\0", 12);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, body.slice(21 + keyLength)));
      expect(plain.at(-1)).toBe(2);
      return new TextDecoder().decode(plain.slice(0, -1));
    },
  };
}

describe("web push", () => {
  it("encrypts a payload so only that browser can read it", async () => {
    const one = await browser();
    const sealed = await encrypt(encoder.encode('{"title":"Ada"}'), one);
    expect(await one.read(sealed)).toBe('{"title":"Ada"}');
    // A fresh key and salt every time.
    expect(toBase64Url(await encrypt(encoder.encode("x"), one))).not.toBe(toBase64Url(await encrypt(encoder.encode("x"), one)));
    const other = await browser();
    await expect(other.read(sealed)).rejects.toThrow();
  });

  it("signs as us for the push service it's going to", async () => {
    const header = await vapid("https://fcm.googleapis.com/fcm/send/abc", env.VAPID_KEY, Date.UTC(2026, 9, 20));
    const [, token, key] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    const [head, claims, signature] = token.split(".");
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: Date.UTC(2026, 9, 20) / 1000 + 12 * 60 * 60,
      sub: "mailto:support@tinyfloor.com",
    });
    const verifier = await crypto.subtle.importKey("raw", fromBase64Url(key), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    expect(
      await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, verifier, fromBase64Url(signature), encoder.encode(`${head}.${claims}`)),
    ).toBe(true);
  });
});

let made = 0;
/** People in an office, with signed-in sessions, as the API would have them. */
async function team(...names: string[]) {
  const office = officeId();
  const now = Date.now();
  const people = names.map((name) => ({ id: `${name.toLowerCase()}-push-${made++}`, name }));
  await env.DB.batch([
    ...people.map((one) =>
      env.DB.prepare("INSERT INTO users (id, display_name, created_at, last_active_at) VALUES (?, ?, ?, ?)").bind(one.id, one.name, now, now),
    ),
    env.DB.prepare("INSERT INTO offices (id, name, owner_id, created_at) VALUES (?, 'Studio', ?, ?)").bind(office, people[0].id, now),
    ...people.map((one) =>
      env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)").bind(office, one.id, now),
    ),
    ...people.map((one) =>
      env.DB.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").bind(
        `session-${one.id}`,
        one.id,
        now,
        now + 60_000,
        now,
      ),
    ),
  ]);
  return { office, people };
}

/** That person's browser subscribes, and its pushes are kept for the test to read. */
async function subscribe(person: { id: string }) {
  const one = await browser();
  const endpoint = `https://fcm.googleapis.com/fcm/send/${person.id}`;
  await env.DB.prepare(
    "INSERT INTO push_subscriptions (endpoint, user_id, session_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(endpoint, person.id, `session-${person.id}`, one.p256dh, one.auth, Date.now())
    .run();
  return { endpoint, ...one };
}

describe("pushes from chat", () => {
  let pushed: Array<{ url: string; headers: Headers; body: Uint8Array<ArrayBuffer> }>;
  let answer: number;

  beforeEach(() => {
    pushed = [];
    answer = 201;
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      if (!request.url.startsWith("https://fcm.googleapis.com/")) return realFetch(input, init);
      pushed.push({ url: request.url, headers: request.headers, body: new Uint8Array(await request.arrayBuffer()) });
      return new Response(null, { status: answer });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const settle = async (count: number) => {
    const deadline = Date.now() + 2000;
    while (pushed.length < count && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    // And a moment more, so a push that shouldn't happen has had its chance.
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  it("sends a direct message to someone with no tab open, and not to someone with one", async () => {
    const { office, people } = await team("Ada", "Bo");
    const [ada, bo] = people;
    const bosBrowser = await subscribe(bo);
    const adaSocket = await ChatClient.open(office, ada);
    await adaSocket.next("chat_ready");

    const channel = dmChannelId(ada.id, bo.id);
    adaSocket.send({ t: "chat_send", channel, body: "Can you look at the deck?" });
    await adaSocket.next("chat_new");
    await settle(1);
    expect(pushed).toHaveLength(1);
    expect(pushed[0].url).toBe(bosBrowser.endpoint);
    expect(pushed[0].headers.get("Content-Encoding")).toBe("aes128gcm");
    expect(pushed[0].headers.get("Authorization")).toMatch(/^vapid t=.+, k=.+$/);
    expect(pushed[0].headers.get("Topic")).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const payload = JSON.parse(await bosBrowser.read(pushed[0].body)) as PushPayload;
    expect(payload).toEqual({
      title: "Ada",
      body: "Can you look at the deck?",
      tag: `chat:${channel}`,
      url: `/office/${office}/chat/${encodeURIComponent(channel)}`,
    });

    // Bo opens a tab: the tab says it from now on.
    const boSocket = await ChatClient.open(office, bo);
    await boSocket.next("chat_ready");
    adaSocket.send({ t: "chat_send", channel, body: "Never mind" });
    await adaSocket.next("chat_new");
    await settle(2);
    expect(pushed).toHaveLength(1);
  });

  it("sends a channel message only to the people it mentions", async () => {
    const { office, people } = await team("Ada", "Bo", "Cy");
    const [ada, bo, cy] = people;
    await subscribe(bo);
    const cysBrowser = await subscribe(cy);
    const adaSocket = await ChatClient.open(office, ada);
    await adaSocket.next("chat_ready");

    adaSocket.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "Standup moved to 10" });
    await adaSocket.next("chat_new");
    adaSocket.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "@Cy can you run it?", mentions: [cy.id] });
    await adaSocket.next("chat_new");
    await settle(1);
    expect(pushed.map((one) => one.url)).toEqual([cysBrowser.endpoint]);
    expect(JSON.parse(await cysBrowser.read(pushed[0].body))).toMatchObject({ title: "Ada · #general", tag: "chat:general" });
  });

  it("forgets a browser its push service says is gone, and skips anyone who left or signed out", async () => {
    const { office, people } = await team("Ada", "Bo", "Cy");
    const [ada, bo, cy] = people;
    const bosBrowser = await subscribe(bo);
    await subscribe(cy);
    // Cy signed out (the session goes, and its subscription with it); Bo's browser unsubscribed.
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(cy.id).run();
    answer = 410;

    const adaSocket = await ChatClient.open(office, ada);
    await adaSocket.next("chat_ready");
    adaSocket.send({ t: "chat_send", channel: dmChannelId(ada.id, cy.id), body: "hi" });
    adaSocket.send({ t: "chat_send", channel: dmChannelId(ada.id, bo.id), body: "hi" });
    await adaSocket.next("chat_new");
    await adaSocket.next("chat_new");
    await settle(1);
    expect(pushed.map((one) => one.url)).toEqual([bosBrowser.endpoint]);

    const deadline = Date.now() + 2000;
    let left = 1;
    while (left && Date.now() < deadline) {
      left = (await env.DB.prepare("SELECT count(*) AS n FROM push_subscriptions WHERE user_id IN (?, ?)").bind(bo.id, cy.id).first<{ n: number }>())!.n;
      if (left) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(left).toBe(0);
  });
});
