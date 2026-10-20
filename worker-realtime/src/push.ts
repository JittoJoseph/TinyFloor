import type { PushPayload } from "../../shared-protocol/src";

/**
 * Web Push, sent from here with nothing but WebCrypto: the message encrypted
 * for one browser (RFC 8291, aes128gcm) and signed as us (VAPID, RFC 8292),
 * then posted to the push service the browser chose. Subscriptions live in D1
 * (worker-api's push routes); one the push service says is gone is deleted.
 */

const SUBJECT = "mailto:support@tinyfloor.com";
/** A chat notification older than this is no use: the push service may drop it. */
const TTL_SECONDS = 12 * 60 * 60;
/** One record holds the whole payload; ours are a few hundred bytes. */
const RECORD_SIZE = 4096;

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const encoder = new TextEncoder();
/** Text as bytes WebCrypto takes. */
const utf8 = (text: string): Uint8Array<ArrayBuffer> => new Uint8Array(encoder.encode(text));

export const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** The payload as only that browser can read it: a fresh key and salt for every message. */
export async function encrypt(payload: Uint8Array, target: Pick<PushTarget, "p256dh" | "auth">): Promise<Uint8Array<ArrayBuffer>> {
  const theirPublic = fromBase64Url(target.p256dh);
  const authSecret = fromBase64Url(target.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ours = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const ourPublic = new Uint8Array((await crypto.subtle.exportKey("raw", ours.publicKey)) as ArrayBuffer);
  const theirs = await crypto.subtle.importKey("raw", theirPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  // The runtime reads `public`, as the standard says; its types spell it `$public`.
  const ecdh = { name: "ECDH", public: theirs } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, ours.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(utf8("WebPush: info\0"), theirPublic, ourPublic), 32);
  const cek = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // The last (and only) record ends with a 2.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(16 + 4 + 1);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = ourPublic.length;
  return concat(header, ourPublic, sealed);
}

/**
 * Our key: the VAPID_KEY secret, a private JWK (its public half is
 * VAPID_PUBLIC_KEY, which browsers subscribe with). Imported once.
 */
const keys = new Map<string, Promise<{ sign: CryptoKey; publicKey: string }>>();
function keyFrom(secret: string) {
  let key = keys.get(secret);
  if (!key) {
    key = (async () => {
      const jwk = JSON.parse(secret) as JsonWebKey;
      const sign = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
      return { sign, publicKey: toBase64Url(concat(new Uint8Array([4]), fromBase64Url(jwk.x!), fromBase64Url(jwk.y!))) };
    })();
    keys.set(secret, key);
  }
  return key;
}

/** "Authorization: vapid …" for one push service, good for 12 hours. */
export async function vapid(endpoint: string, secret: string, now = Date.now()): Promise<string> {
  const { sign, publicKey } = await keyFrom(secret);
  const part = (value: object) => toBase64Url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: SUBJECT })}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, sign, encoder.encode(unsigned));
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${publicKey}`;
}

/**
 * Sends one; says whether the subscription is gone for good (the browser
 * unsubscribed, or the push service forgot it), so it can be deleted.
 * `topic` lets the push service keep only the newest of a conversation's
 * pushes while the device is offline.
 */
export async function sendPush(target: PushTarget, payload: PushPayload, secret: string, topic: string): Promise<"sent" | "gone" | "failed"> {
  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapid(target.endpoint, secret),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(TTL_SECONDS),
      Urgency: "high",
      Topic: topic,
    },
    body: await encrypt(encoder.encode(JSON.stringify(payload)), target),
  });
  if (response.status === 404 || response.status === 410) return "gone";
  return response.ok ? "sent" : "failed";
}

/** A Topic header (up to 32 URL-safe characters) for a conversation. */
export async function topicFor(office: string, channel: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${office}:${channel}`)));
  return toBase64Url(digest).slice(0, 32);
}
