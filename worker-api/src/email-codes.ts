import { DEFAULT_CHARACTER } from "../../shared-protocol/src";
import { hashToken } from "./crypto";
import { letter, sendEmail } from "./email";
import { HttpError, json, readJson } from "./http";
import { limitAuth } from "./limits";
import type { Router } from "./router";
import { ACCOUNT_SESSION_MS, createSession, currentUser, endSession, requireAccount, type User } from "./session";
import { verifyTurnstile } from "./turnstile";
import { cleanEmail, nameFromEmail, publicUser } from "./auth";

/** A code lasts ten minutes: whoever asked is waiting for it. */
const CODE_MS = 10 * 60 * 1000;
/** Asking again within this long sends nothing new: the code already sent still works. */
const RESEND_AFTER_MS = 60 * 1000;
/** Codes to one address per hour, whoever asks, so nobody can flood an inbox. */
const SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
/** Wrong guesses one code takes before it stops working: 5 in a million, and 5 codes an hour. */
const ATTEMPTS = 5;

/**
 * Signing in by email: a six-digit code goes to the address, and typing it in
 * signs in, or makes the account the first time (docs/product.md). There are
 * no passwords; Google is the other way in. Every code sign-in shows the
 * address is theirs, so it confirms it too.
 */
export function emailCodeRoutes(router: Router): void {
  router
    // A code for an address. The answer is the same whether or not it has an account.
    .add("POST", "/v1/auth/code", async ({ request, env }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const email = cleanEmail(body.email);
      await verifyTurnstile(env, request, body.turnstileToken);
      await sendCode(env, email);
      return json({ ok: true });
    })

    // A code for a signed-in account's own address, to confirm one that never was.
    .add("POST", "/v1/me/email-code", async ({ request, env, ctx }) => {
      await limitAuth(env, request);
      const user = await requireAccount(env, request, ctx);
      if (!user.email) throw new HttpError(400, "no_email", "This account has no email");
      await sendCode(env, user.email);
      return json({ ok: true });
    })

    // The code typed in: signed in, as the account with that address or a new one.
    .add("POST", "/v1/auth/code/verify", async ({ request, env, ctx }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const email = cleanEmail(body.email);
      const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
      if (!/^\d{6}$/.test(code)) throw new HttpError(400, "wrong_code", "Enter the 6-digit code from the email", "code");
      await redeem(env, email, code);

      const now = Date.now();
      const current = await currentUser(env, request, ctx);
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND is_guest = 0").bind(email).first<{ id: string }>();
      let userId: string;
      let created = false;

      if (existing) {
        userId = existing.id;
        await env.DB.prepare("UPDATE users SET email_verified = 1, last_active_at = ? WHERE id = ?").bind(now, userId).run();
        // Already signed in as this account (confirming from settings): the session stays as it is.
        if (current?.id === userId) return json({ user: publicUser({ ...current, emailVerified: true }), created });
        // Signing in from a guest session ends it; the guest stays behind as a guest.
        if (current?.isGuest) ctx.waitUntil(endSession(env, request));
      } else if (current?.isGuest) {
        // A guest who makes an account keeps the name and character chosen at the door: the same
        // id, made permanent, so they stay where they are on the floor.
        userId = current.id;
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET email = ?, email_verified = 1, is_guest = 0, last_active_at = ? WHERE id = ?").bind(email, now, userId),
          // The guest session is replaced by an account session below.
          env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
        ]);
        created = true;
      } else {
        // The name people see and the character are asked at the first door; until then the name comes from the address.
        userId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO users (id, email, email_verified, display_name, character, is_guest, created_at, last_active_at)
           VALUES (?, ?, 1, ?, ?, 0, ?, ?)`,
        )
          .bind(userId, email, nameFromEmail(email), DEFAULT_CHARACTER, now, now)
          .run();
        created = true;
      }

      const { sessionId, cookie } = await createSession(env, request, userId, ACCOUNT_SESSION_MS);
      const user = await account(env, userId, sessionId);
      return json({ user: publicUser(user), created }, { status: created ? 201 : 200, headers: { "Set-Cookie": cookie } });
    });
}

/** Sends a new code, unless one went in the last minute: that one still works, and the email may be on its way. */
async function sendCode(env: Env, email: string): Promise<void> {
  const now = Date.now();
  const row = await env.DB.prepare("SELECT created_at, sends, window_start FROM email_codes WHERE email = ?")
    .bind(email)
    .first<{ created_at: number; sends: number; window_start: number }>();
  if (row && now - row.created_at < RESEND_AFTER_MS) return;

  const sameHour = !!row && now - row.window_start < HOUR_MS;
  if (sameHour && row.sends >= SENDS_PER_HOUR) {
    throw new HttpError(429, "too_many_codes", "Too many codes for this address. Try again in an hour, or continue with Google");
  }

  const code = sixDigits();
  await env.DB.prepare(
    `INSERT INTO email_codes (email, code_hash, created_at, expires_at, attempts, sends, window_start) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)
     ON CONFLICT (email) DO UPDATE SET code_hash = ?2, created_at = ?3, expires_at = ?4, attempts = 0, sends = ?5, window_start = ?6`,
  )
    .bind(email, await hashCode(email, code), now, now + CODE_MS, sameHour ? row.sends + 1 : 1, sameHour ? row.window_start : now)
    .run();

  const { html, text } = letter({
    preview: "Enter it in the TinyFloor window you have open. It works for 10 minutes.",
    heading: "Your sign-in code",
    paragraphs: ["Enter this code in the TinyFloor window you have open to continue."],
    code,
    footnote: "It works for 10 minutes. If you didn't ask for it, you can ignore this email: nobody can sign in without the code.",
  });
  const sent = await sendEmail(env, { to: email, subject: `${code} is your TinyFloor code`, html, text, kind: "code" });
  // Without a key (locally) the code is in the log instead; with one, a failed send leaves nothing waiting for it.
  if (!sent && env.RESEND_API_KEY) {
    await env.DB.prepare("DELETE FROM email_codes WHERE email = ? AND created_at = ?").bind(email, now).run();
    throw new HttpError(503, "email_failed", "We couldn't send the email. Try again, or continue with Google");
  }
}

/** Uses up the code if it's the live one for the address; otherwise counts the try against it. */
async function redeem(env: Env, email: string, code: string): Promise<void> {
  const now = Date.now();
  const used = await env.DB.prepare("DELETE FROM email_codes WHERE email = ? AND code_hash = ? AND expires_at > ? AND attempts < ? RETURNING email")
    .bind(email, await hashCode(email, code), now, ATTEMPTS)
    .first();
  if (used) return;
  const row = await env.DB.prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ? RETURNING attempts, expires_at")
    .bind(email)
    .first<{ attempts: number; expires_at: number }>();
  if (!row || row.expires_at <= now || row.attempts >= ATTEMPTS) {
    throw new HttpError(400, "code_expired", "This code has expired. Ask for a new one", "code");
  }
  throw new HttpError(400, "wrong_code", "That code isn't right. Check the email and try again", "code");
}

/** Codes are kept as a hash with their address, like session tokens. */
function hashCode(email: string, code: string): Promise<string> {
  return hashToken(`${email}:${code}`);
}

/** Six digits, every one as likely: values past the last whole million are drawn again. */
function sixDigits(): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  for (;;) {
    const [value] = crypto.getRandomValues(new Uint32Array(1));
    if (value < limit) return String(value % 1_000_000).padStart(6, "0");
  }
}

/** The account as a session reads it, for the answer to signing in. */
async function account(env: Env, id: string, sessionId: string): Promise<User> {
  const row = await env.DB.prepare(
    `SELECT email, display_name, character, google_sub IS NOT NULL AS has_google, link, introduced_at IS NOT NULL AS introduced,
            time_zone, time_zone_auto
       FROM users WHERE id = ?`,
  )
    .bind(id)
    .first<{
      email: string;
      display_name: string;
      character: string;
      has_google: number;
      link: string | null;
      introduced: number;
      time_zone: string | null;
      time_zone_auto: number;
    }>();
  if (!row) throw new HttpError(500, "internal_error", "Something went wrong. Try again");
  return {
    id,
    email: row.email,
    displayName: row.display_name,
    character: row.character,
    isGuest: false,
    hasGoogle: row.has_google === 1,
    emailVerified: true,
    link: row.link,
    introduced: row.introduced === 1,
    timeZone: row.time_zone,
    timeZoneAuto: row.time_zone_auto !== 0,
    sessionId,
  };
}
