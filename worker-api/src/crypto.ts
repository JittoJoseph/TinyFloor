/** A random 32-byte token, base64url, for session cookies, invite links and guest links. */
export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Tokens are stored only as this hash, so a database leak exposes nothing usable. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64url(new Uint8Array(digest));
}

/**
 * Seals a secret we must be able to read back (a Google refresh token) with
 * AES-GCM under `keyBase64`, 32 random bytes: a fresh IV, then the ciphertext,
 * as `iv.ciphertext` in base64url. A database leak alone opens nothing.
 */
export async function seal(plaintext: string, keyBase64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(keyBase64), new TextEncoder().encode(plaintext));
  return `${base64url(iv)}.${base64url(new Uint8Array(sealed))}`;
}

/** Opens what `seal` made. Throws if it was tampered with or sealed under another key. */
export async function unseal(value: string, keyBase64: string): Promise<string> {
  const [iv, sealed] = value.split(".").map(fromBase64url);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(keyBase64), sealed);
  return new TextDecoder().decode(plain);
}

function aesKey(keyBase64: string): Promise<CryptoKey> {
  const raw = fromBase64url(keyBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
  if (raw.length !== 32) throw new Error("GOOGLE_TOKEN_KEY must be 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function fromBase64url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
