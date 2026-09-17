import { cleanDisplayName, DEFAULT_CHARACTER, isCharacter } from "../../shared-protocol/src";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { createGuest, currentUser, endSession, requireUser, type User } from "./session";
import { verifyTurnstile } from "./turnstile";

export function authRoutes(router: Router): void {
  router
    .add("GET", "/v1/session", async ({ request, env, ctx }) => {
      const user = await currentUser(env, request, ctx);
      return json({ user: user && publicUser(user) });
    })

    .add("POST", "/v1/auth/guest", async ({ request, env }) => {
      const body = await readJson(request);
      const name = cleanDisplayName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Pick a name");
      const character = isCharacter(body.character) ? body.character : DEFAULT_CHARACTER;
      await verifyTurnstile(env, request, body.turnstileToken);

      const { user, cookie } = await createGuest(env, request, name, character);
      return json({ user: publicUser(user) }, { status: 201, headers: { "Set-Cookie": cookie } });
    })

    .add("POST", "/v1/auth/logout", async ({ request, env }) => {
      const cookie = await endSession(env, request);
      return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
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
      if (!displayName) throw new HttpError(400, "name_required", "Pick a name");
      if (body.character !== undefined && !isCharacter(body.character)) {
        throw new HttpError(400, "bad_character", "Pick one of the characters");
      }
      const character = (body.character as string | undefined) ?? user.character;

      await env.DB.prepare("UPDATE users SET display_name = ?, character = ? WHERE id = ?")
        .bind(displayName, character, user.id)
        .run();
      return json({ user: publicUser({ ...user, displayName, character }) });
    });
}

function publicUser(user: User) {
  return { id: user.id, displayName: user.displayName, character: user.character, guest: user.isGuest };
}
