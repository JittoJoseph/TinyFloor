import { cleanDisplayName, DEFAULT_CHARACTER, isCharacter } from "../../shared-protocol/src";
import { HttpError, json, readJson } from "./http";
import { limitAuth } from "./limits";
import type { Router } from "./router";
import {
  ACCOUNT_SESSION_MS,
  createGuest,
  createSession,
  currentUser,
  endSession,
  requireAccount,
  requireUser,
  type User,
} from "./session";
import { verifyTurnstile } from "./turnstile";

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only reads the first 72 bytes, so longer passwords are refused rather than silently cut. */
const PASSWORD_MAX_BYTES = 72;
/** Sign-in attempts allowed from one IP address per 15 minutes, across all emails. */
const ATTEMPTS_PER_IP = 30;

export function authRoutes(router: Router): void {
  router
    .add("GET", "/v1/session", async ({ request, env, ctx }) => {
      const user = await currentUser(env, request, ctx);
      return json({ user: user && publicUser(user) });
    })

    .add("POST", "/v1/auth/guest", async ({ request, env }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const name = cleanDisplayName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Pick a name");
      const character = isCharacter(body.character) ? body.character : DEFAULT_CHARACTER;
      await verifyTurnstile(env, request, body.turnstileToken);

      const { user, cookie } = await createGuest(env, request, name, character);
      return json({ user: publicUser(user) }, { status: 201, headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/auth/signup", async ({ request, env, ctx }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const email = cleanEmail(body.email);
      const password = checkPassword(body.password);
      const current = await currentUser(env, request, ctx);
      // A guest who signs up keeps their name and character unless they chose new ones.
      const upgrading = current?.isGuest ? current : null;
      const displayName = cleanDisplayName(body.displayName) || upgrading?.displayName || "";
      if (!displayName) throw new HttpError(400, "name_required", "Pick a name", "displayName");
      const character = isCharacter(body.character) ? body.character : (upgrading?.character ?? DEFAULT_CHARACTER);
      await verifyTurnstile(env, request, body.turnstileToken);

      const taken = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
      if (taken) throw new HttpError(409, "email_taken", "An account with this email already exists", "email");

      const passwordHash = await guard(env, `email:${email}`).hash(password);
      const now = Date.now();
      let userId: string;
      if (upgrading) {
        userId = upgrading.id;
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE users SET email = ?, password_hash = ?, display_name = ?, character = ?, is_guest = 0, last_active_at = ? WHERE id = ?",
          ).bind(email, passwordHash, displayName, character, now, userId),
          // The guest session is replaced by an account session below.
          env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
        ]);
      } else {
        userId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, display_name, character, is_guest, created_at, last_active_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        )
          .bind(userId, email, passwordHash, displayName, character, now, now)
          .run();
      }

      const { sessionId, cookie } = await createSession(env, request, userId, ACCOUNT_SESSION_MS);
      const user: User = { id: userId, email, displayName, character, isGuest: false, sessionId };
      return json({ user: publicUser(user) }, { status: 201, headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/auth/login", async ({ request, env, ctx }) => {
      await limitAuth(env, request);
      const body = await readJson(request);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) throw new HttpError(400, "credentials_required", "Enter your email and password");

      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (!(await guard(env, `ip:${ip}`).attempt(ATTEMPTS_PER_IP))) {
        throw new HttpError(429, "too_many_attempts", "Too many sign-in attempts. Try again in a few minutes");
      }

      const account = await env.DB.prepare(
        "SELECT id, email, password_hash, display_name, character FROM users WHERE email = ? AND is_guest = 0",
      )
        .bind(email)
        .first<{ id: string; email: string; password_hash: string | null; display_name: string; character: string }>();

      const emailGuard = guard(env, `email:${email}`);
      const verdict = await emailGuard.verify(password.slice(0, 256), account?.password_hash ?? null);
      if (!verdict.ok) {
        if (verdict.reason === "locked") {
          const minutes = Math.max(1, Math.ceil((verdict.retryAfterSeconds ?? 60) / 60));
          throw new HttpError(
            429,
            "too_many_attempts",
            `Too many wrong passwords. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}`,
          );
        }
        // One message whether the email or the password was wrong, so accounts can't be discovered.
        throw new HttpError(401, "wrong_credentials", "That email and password don't match");
      }
      const found = account!;

      // Carried-over Java hashes use a lower cost; upgrade them quietly.
      if (found.password_hash && (await emailGuard.needsRehash(found.password_hash))) {
        ctx.waitUntil(
          emailGuard
            .hash(password)
            .then((hash) => env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, found.id).run()),
        );
      }

      // Signing in from a guest session ends it; the guest stays behind as a guest.
      const previous = await currentUser(env, request, ctx);
      if (previous?.isGuest) ctx.waitUntil(endSession(env, request));

      const { sessionId, cookie } = await createSession(env, request, found.id, ACCOUNT_SESSION_MS);
      const user: User = {
        id: found.id,
        email: found.email,
        displayName: found.display_name,
        character: found.character,
        isGuest: false,
        sessionId,
      };
      return json({ user: publicUser(user) }, { headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/auth/logout", async ({ request, env }) => {
      const cookie = await endSession(env, request);
      return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/me/password", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const body = await readJson(request);
      const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const next = checkPassword(body.newPassword, "newPassword");

      const row = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?")
        .bind(user.id)
        .first<{ password_hash: string | null }>();
      const emailGuard = guard(env, `email:${user.email}`);
      const verdict = await emailGuard.verify(current.slice(0, 256), row?.password_hash ?? null);
      if (!verdict.ok) {
        throw verdict.reason === "locked"
          ? new HttpError(429, "too_many_attempts", "Too many wrong passwords. Try again later")
          : new HttpError(403, "wrong_password", "Your current password is incorrect", "currentPassword");
      }

      const hash = await emailGuard.hash(next);
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, user.id),
        // Everywhere else is signed out; this browser stays signed in.
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").bind(user.id, user.sessionId),
      ]);
      return json({ ok: true });
    })

    .add("GET", "/v1/me", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const { results } = await env.DB.prepare(
        `SELECT w.id, w.name, w.plan, m.role
         FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
         WHERE m.user_id = ? ORDER BY m.joined_at`,
      )
        .bind(user.id)
        .all<{ id: string; name: string; plan: string; role: string }>();
      return json({ user: publicUser(user), workspaces: results });
    })

    .add("PATCH", "/v1/me", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const body = await readJson(request);
      const displayName = body.displayName === undefined ? user.displayName : cleanDisplayName(body.displayName);
      if (!displayName) throw new HttpError(400, "name_required", "Pick a name", "displayName");
      if (body.character !== undefined && !isCharacter(body.character)) {
        throw new HttpError(400, "bad_character", "Pick one of the characters", "character");
      }
      const character = (body.character as string | undefined) ?? user.character;

      await env.DB.prepare("UPDATE users SET display_name = ?, character = ? WHERE id = ?")
        .bind(displayName, character, user.id)
        .run();
      return json({ user: publicUser({ ...user, displayName, character }) });
    });
}

function guard(env: Env, key: string) {
  return env.PASSWORD_GUARD.getByName(key);
}

function cleanEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email) throw new HttpError(400, "email_required", "Enter your email", "email");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "bad_email", "That email doesn't look right", "email");
  }
  return email;
}

function checkPassword(value: unknown, field = "password"): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(400, "password_too_short", `Use at least ${PASSWORD_MIN_LENGTH} characters`, field);
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    throw new HttpError(400, "password_too_long", "Use a password under 72 characters", field);
  }
  if (!password.trim()) throw new HttpError(400, "password_blank", "A password can't be only spaces", field);
  return password;
}

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    character: user.character,
    guest: user.isGuest,
  };
}
