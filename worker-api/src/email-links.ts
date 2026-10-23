import { hashToken, randomToken } from "./crypto";
import { letter, sendEmail } from "./email";
import { HttpError, json, readJson } from "./http";
import { limitAuth } from "./limits";
import type { Router } from "./router";
import { ACCOUNT_SESSION_MS, createSession, requireAccount } from "./session";
import { verifyTurnstile } from "./turnstile";
import { checkPassword, cleanEmail, guard } from "./auth";

/** A confirmation link lasts a day: long enough to find it in an inbox. */
const VERIFY_MS = 24 * 60 * 60 * 1000;
/** A reset link lasts an hour: whoever asked is waiting for it. */
const RESET_MS = 60 * 60 * 1000;
/** Asking again within this long sends nothing new: the first email is likely on its way. */
const RESEND_AFTER_MS = 60 * 1000;
/** Reset emails to one address per 15 minutes, whoever asks, so nobody can flood an inbox. */
const RESETS_PER_ADDRESS = 3;

type Kind = "verify" | "reset";
interface Account {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Email that proves an address (docs/product.md): a link to confirm it, sent
 * when an account is made with a password (Google has already confirmed its
 * own), and a link to choose a new password. A confirmed address is what lets
 * a colleague find their team's office by it (team.ts), and an owner's go to
 * billing. Each link works once; asking for a new one retires the old.
 */
export function emailLinkRoutes(router: Router): void {
  router
    // Confirming from the link, signed in or not: it may open in another browser.
    .add("POST", "/v1/auth/verify", async ({ request, env }) => {
      const { token } = await readJson(request);
      const found = await redeem(env, token, "verify");
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ? AND email = ?").bind(found.userId, found.email),
        env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ? AND kind = 'verify'").bind(found.userId),
      ]);
      return json({ ok: true });
    })

    // Another confirmation link, from settings.
    .add("POST", "/v1/me/verify-email", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      if (!user.email) throw new HttpError(400, "no_email", "This account has no email");
      if (user.emailVerified) return json({ sent: false, verified: true });
      if (await sentRecently(env, user.id, "verify")) throw new HttpError(429, "slow_down", "An email is on its way. Wait a minute and try again");
      const sent = await sendVerification(env, { id: user.id, email: user.email, displayName: user.displayName });
      return json({ sent, verified: false });
    })

    // Asking for a reset link. The answer is the same whether or not the address has an account.
    .add("POST", "/v1/auth/reset/request", async ({ request, env }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const email = cleanEmail(body.email);
      await verifyTurnstile(env, request, body.turnstileToken);
      const account = await env.DB.prepare("SELECT id, email, display_name FROM users WHERE email = ? AND is_guest = 0")
        .bind(email)
        .first<{ id: string; email: string; display_name: string }>();
      if (account && !(await sentRecently(env, account.id, "reset")) && (await guard(env, `reset:${email}`).attempt(RESETS_PER_ADDRESS))) {
        await sendReset(env, { id: account.id, email: account.email, displayName: account.display_name });
      }
      return json({ ok: true });
    })

    // Choosing the new password from the link: every other session ends, and this one begins.
    .add("POST", "/v1/auth/reset", async ({ request, env }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const password = checkPassword(body.password);
      const found = await redeem(env, body.token, "reset");
      const passwordHash = await guard(env, `email:${found.email}`).hash(password);
      await env.DB.batch([
        // Getting the email proved the address too.
        env.DB.prepare("UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ? AND email = ?").bind(passwordHash, found.userId, found.email),
        env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ?").bind(found.userId),
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(found.userId),
      ]);
      // Any lock from wrong guesses lifts: the new password works at once.
      await guard(env, `email:${found.email}`).unlock();
      const { cookie } = await createSession(env, request, found.userId, ACCOUNT_SESSION_MS);
      return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
    });
}

/** The confirmation email, for a new account or from settings. */
export async function sendVerification(env: Env, account: Account): Promise<boolean> {
  const url = `${appUrl(env)}/auth/verify?token=${await issue(env, account, "verify", VERIFY_MS)}`;
  const { html, text } = letter({
    preview: "One click to confirm this is your email.",
    heading: "Confirm your email",
    paragraphs: [
      `Hi ${account.displayName},`,
      `Please confirm that ${account.email} is your email address. It helps your team find you on TinyFloor, and it lets you reset your password if you ever forget it.`,
    ],
    button: { label: "Confirm email", url },
    footnote: "This link works for 24 hours. If you didn't make a TinyFloor account, you can ignore this email.",
  });
  return sendEmail(env, { to: account.email, subject: "Confirm your email for TinyFloor", html, text, kind: "verify" });
}

async function sendReset(env: Env, account: Account): Promise<boolean> {
  const url = `${appUrl(env)}/auth/reset?token=${await issue(env, account, "reset", RESET_MS)}`;
  const { html, text } = letter({
    preview: "Choose a new password for your account.",
    heading: "Reset your password",
    paragraphs: [`Hi ${account.displayName},`, `We got a request to reset the password for ${account.email}. Click the button to choose a new one.`],
    button: { label: "Choose a new password", url },
    footnote: "This link works for 1 hour. If you didn't ask for this, you can ignore this email. Your password stays the same.",
  });
  return sendEmail(env, { to: account.email, subject: "Reset your TinyFloor password", html, text, kind: "reset" });
}

/** A new link of this kind, retiring any earlier one: only the latest email works. */
async function issue(env: Env, account: Account, kind: Kind, lifetimeMs: number): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM email_tokens WHERE user_id = ? AND kind = ?").bind(account.id, kind),
    env.DB.prepare("INSERT INTO email_tokens (id, user_id, kind, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
      await hashToken(token),
      account.id,
      kind,
      account.email,
      now,
      now + lifetimeMs,
    ),
  ]);
  return token;
}

/** The link's account and address, if it's a live link of this kind for the address the account still has. */
async function redeem(env: Env, token: unknown, kind: Kind): Promise<{ userId: string; email: string }> {
  if (typeof token !== "string" || !token || token.length > 200) throw new HttpError(400, "link_invalid", "This link doesn't work. Ask for a new one");
  const row = await env.DB.prepare(
    `SELECT t.user_id, t.email FROM email_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.id = ? AND t.kind = ? AND t.expires_at > ? AND u.email = t.email`,
  )
    .bind(await hashToken(token), kind, Date.now())
    .first<{ user_id: string; email: string }>();
  if (!row) throw new HttpError(400, "link_invalid", "This link has expired or was already used. Ask for a new one");
  return { userId: row.user_id, email: row.email };
}

async function sentRecently(env: Env, userId: string, kind: Kind): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 FROM email_tokens WHERE user_id = ? AND kind = ? AND created_at > ?")
    .bind(userId, kind, Date.now() - RESEND_AFTER_MS)
    .first();
  return !!row;
}

/** Where the app is, for links in email: this deployment's own (APP_URL), or the first site it serves. */
function appUrl(env: Env): string {
  return (env.APP_URL || env.SITE_ORIGINS.split(",")[0]).replace(/\/$/, "");
}
