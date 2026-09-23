import { cleanDisplayName, DEFAULT_CHARACTER } from "../../shared-protocol/src";
import { publicUser } from "./auth";
import { HttpError, json, readJson } from "./http";
import { limitAuth } from "./limits";
import type { Router } from "./router";
import { ACCOUNT_SESSION_MS, createSession, currentUser, endSession, requireAccount, type User } from "./session";

/**
 * Signing in with Google. The site opens Google's consent popup (Google
 * Identity Services' code flow) and sends us the one-time code; we trade it
 * for the person's ID token with our client secret, then sign them in, link
 * Google to the account that already has their email, or make them one.
 */

/** The redirect URI Google records for a popup code flow, whichever page opened it. */
const REDIRECT_URI = "postmessage";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

interface AccountRow {
  id: string;
  email: string | null;
  display_name: string;
  character: string;
  google_sub: string | null;
  has_password?: number;
  link?: string | null;
}

export function googleRoutes(router: Router): void {
  // Someone signed in some other way connects their Google account, to sign in with it from now on.
  router.add("POST", "/v1/me/google", async ({ request, env, ctx }) => {
    const user = await requireAccount(env, request, ctx);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new HttpError(503, "google_unavailable", "Google sign-in isn't set up here");
    }
    const body = await readJson(request);
    if (typeof body.code !== "string" || !body.code) throw new HttpError(400, "code_required", "Try connecting Google again");

    const google = await identify(env, body.code);
    const taken = await env.DB.prepare("SELECT id FROM users WHERE google_sub = ?").bind(google.sub).first<{ id: string }>();
    if (taken && taken.id !== user.id) {
      throw new HttpError(409, "google_taken", "That Google account is already connected to another TinyFloor account");
    }
    // Google has checked this address, so if it is the account's own, the account's is verified too.
    await env.DB.prepare(
      "UPDATE users SET google_sub = ?, email_verified = CASE WHEN email = ? THEN 1 ELSE email_verified END WHERE id = ?",
    )
      .bind(google.sub, google.email, user.id)
      .run();
    return json({ user: publicUser({ ...user, hasGoogle: true }) });
  });

  router.add("POST", "/v1/auth/google", async ({ request, env, ctx }) => {
    await limitAuth(env, request);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new HttpError(503, "google_unavailable", "Google sign-in isn't set up here");
    }
    const body = await readJson(request);
    if (typeof body.code !== "string" || !body.code) throw new HttpError(400, "code_required", "Sign in with Google again");

    const google = await identify(env, body.code);
    const current = await currentUser(env, request, ctx);
    const columns = "id, email, display_name, character, google_sub, password_hash IS NOT NULL AS has_password, link";

    let account =
      (await env.DB.prepare(`SELECT ${columns} FROM users WHERE google_sub = ?`).bind(google.sub).first<AccountRow>()) ??
      (await env.DB.prepare(`SELECT ${columns} FROM users WHERE email = ? AND is_guest = 0`).bind(google.email).first<AccountRow>());
    let created = false;
    const now = Date.now();

    if (account) {
      // The account with this email, signing in with Google for the first time: Google has checked the address, so it's linked.
      if (!account.google_sub) {
        await env.DB.prepare("UPDATE users SET google_sub = ?, email_verified = 1, last_active_at = ? WHERE id = ?")
          .bind(google.sub, now, account.id)
          .run();
      } else if (account.google_sub !== google.sub) {
        throw new HttpError(409, "google_mismatch", "This email is linked to a different Google account");
      }
      // Signing in from a guest session ends it; the guest stays behind as a guest.
      if (current?.isGuest) ctx.waitUntil(endSession(env, request));
    } else if (current?.isGuest) {
      // A guest who signs up with Google keeps their name and character.
      account = { id: current.id, email: google.email, display_name: current.displayName, character: current.character, google_sub: google.sub };
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE users SET email = ?, email_verified = 1, google_sub = ?, is_guest = 0, last_active_at = ? WHERE id = ?",
        ).bind(google.email, google.sub, now, current.id),
        // The guest session is replaced by an account session below.
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(current.id),
      ]);
      created = true;
    } else {
      const displayName = cleanDisplayName(google.name) || cleanDisplayName(google.email.split("@")[0]) || "Guest";
      account = { id: crypto.randomUUID(), email: google.email, display_name: displayName, character: DEFAULT_CHARACTER, google_sub: google.sub };
      await env.DB.prepare(
        `INSERT INTO users (id, email, email_verified, google_sub, display_name, character, is_guest, created_at, last_active_at)
         VALUES (?, ?, 1, ?, ?, ?, 0, ?, ?)`,
      )
        .bind(account.id, google.email, google.sub, displayName, DEFAULT_CHARACTER, now, now)
        .run();
      created = true;
    }

    const { sessionId, cookie } = await createSession(env, request, account.id, ACCOUNT_SESSION_MS);
    const user: User = {
      id: account.id,
      email: account.email,
      displayName: account.display_name,
      character: account.character,
      isGuest: false,
      hasPassword: account.has_password === 1,
      hasGoogle: true,
      link: account.link ?? null,
      sessionId,
    };
    return json({ user: publicUser(user), created }, { status: created ? 201 : 200, headers: { "Set-Cookie": cookie } });
  });
}

/**
 * Trades the popup's code for the person's ID token. The token comes straight
 * from Google over TLS in answer to our secret, so its claims can be read
 * without checking its signature (Google's own guidance for this case); who it
 * was issued to, by whom and until when are still checked.
 */
async function identify(env: Env, code: string): Promise<GoogleIdentity> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await response.json().catch(() => null)) as { id_token?: string } | null;
  if (!response.ok || !tokens?.id_token) throw new HttpError(401, "google_failed", "Google sign-in didn't go through. Try again");

  const claims = readClaims(tokens.id_token);
  const valid =
    claims.aud === env.GOOGLE_CLIENT_ID &&
    ISSUERS.includes(String(claims.iss)) &&
    typeof claims.exp === "number" &&
    claims.exp * 1000 > Date.now() &&
    typeof claims.sub === "string" &&
    typeof claims.email === "string";
  if (!valid) throw new HttpError(401, "google_failed", "Google sign-in didn't go through. Try again");
  if (claims.email_verified !== true) {
    throw new HttpError(403, "google_unverified", "Verify your email with Google first, then try again");
  }
  return { sub: claims.sub as string, email: (claims.email as string).toLowerCase(), name: typeof claims.name === "string" ? claims.name : "" };
}

function readClaims(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  try {
    const binary = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
  } catch {
    throw new HttpError(401, "google_failed", "Google sign-in didn't go through. Try again");
  }
}
