export type RoomRole = "owner" | "admin" | "member" | "guest";

/**
 * What the API vouches for when it lets someone into a room. Signed with
 * TICKET_SECRET, valid for a minute, and checked by the realtime Worker without
 * touching the database.
 */
export interface RoomTicket {
  v: 1;
  room: string;
  sub: string;
  name: string;
  character: string;
  role: RoomRole;
  cap: number;
  exp: number;
  /** The guest link this ticket came from, so revoking the link removes its guests. */
  link?: string;
}

export const TICKET_LIFETIME_MS = 60_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function key(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signTicket(ticket: RoomTicket, secret: string): Promise<string> {
  const body = encoder.encode(JSON.stringify(ticket));
  const signature = await crypto.subtle.sign("HMAC", await key(secret, "sign"), body);
  return `${toBase64Url(body)}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The ticket's claims when the signature is genuine and it hasn't expired, otherwise null. */
export async function verifyTicket(
  token: string | null,
  secret: string,
  now = Date.now(),
): Promise<RoomTicket | null> {
  if (!token) return null;
  const [bodyPart, signaturePart, extra] = token.split(".");
  if (!bodyPart || !signaturePart || extra !== undefined) return null;

  const body = fromBase64Url(bodyPart);
  const signature = fromBase64Url(signaturePart);
  if (!body || !signature) return null;

  // subtle.verify compares in constant time.
  const genuine = await crypto.subtle.verify("HMAC", await key(secret, "verify"), signature, body);
  if (!genuine) return null;

  let ticket: RoomTicket;
  try {
    ticket = JSON.parse(decoder.decode(body));
  } catch {
    return null;
  }

  if (ticket.v !== 1 || typeof ticket.exp !== "number" || ticket.exp < now) return null;
  return ticket;
}
