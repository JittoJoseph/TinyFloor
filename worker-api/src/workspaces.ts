import { cleanName, memberCount, realtime, requireMember, type WorkspaceRole } from "./access";
import { hashToken, randomToken } from "./crypto";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount, requireUser } from "./session";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function workspaceRoutes(router: Router): void {
  router
    .add("POST", "/v1/workspaces", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const name = cleanName((await readJson(request)).name);
      if (!name) throw new HttpError(400, "name_required", "Name the workspace");

      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").bind(
          id,
          name,
          user.id,
          now,
        ),
        env.DB.prepare(
          "INSERT INTO memberships (workspace_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)",
        ).bind(id, user.id, now),
      ]);
      const membership = await requireMember(env, id, user.id);
      return json({ workspace: workspaceJson(membership, 1) }, { status: 201 });
    })

    .add("GET", "/v1/workspaces/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const membership = await requireMember(env, params.id, user.id);
      return json({ workspace: workspaceJson(membership, await memberCount(env, params.id)) });
    })

    .add("PATCH", "/v1/workspaces/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner", "admin"]);
      const name = cleanName((await readJson(request)).name);
      if (!name) throw new HttpError(400, "name_required", "Name the workspace");
      await env.DB.prepare("UPDATE workspaces SET name = ? WHERE id = ?").bind(name, params.id).run();
      const membership = await requireMember(env, params.id, user.id);
      return json({ workspace: workspaceJson(membership, await memberCount(env, params.id)) });
    })

    .add("DELETE", "/v1/workspaces/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner"]);
      const { results: rooms } = await env.DB.prepare(
        "SELECT id FROM rooms WHERE workspace_id = ? AND archived_at IS NULL",
      )
        .bind(params.id)
        .all<{ id: string }>();
      // Rooms, members, invites and links go with it (ON DELETE CASCADE).
      await env.DB.prepare("DELETE FROM workspaces WHERE id = ?").bind(params.id).run();
      await Promise.all(rooms.map((room) => realtime(env).closeRoom(room.id)));
      return json({ ok: true });
    })

    .add("GET", "/v1/workspaces/:id/members", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id);
      const { results } = await env.DB.prepare(
        `SELECT u.id, u.display_name, u.character, m.role, m.joined_at
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.workspace_id = ? ORDER BY m.joined_at`,
      )
        .bind(params.id)
        .all<{ id: string; display_name: string; character: string; role: WorkspaceRole; joined_at: number }>();
      return json({
        members: results.map((row) => ({
          id: row.id,
          displayName: row.display_name,
          character: row.character,
          role: row.role,
          joinedAt: row.joined_at,
        })),
      });
    })

    .add("PATCH", "/v1/workspaces/:id/members/:userId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner"]);
      const { role } = await readJson(request);
      if (role !== "admin" && role !== "member") throw new HttpError(400, "bad_role", "Role must be admin or member");
      const target = await requireMember(env, params.id, params.userId);
      if (target.role === "owner") throw new HttpError(400, "owner_role", "Transfer ownership instead");
      await env.DB.prepare("UPDATE memberships SET role = ? WHERE workspace_id = ? AND user_id = ?")
        .bind(role, params.id, params.userId)
        .run();
      return json({ ok: true });
    })

    .add("DELETE", "/v1/workspaces/:id/members/:userId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const me = await requireMember(env, params.id, user.id);
      const target = await requireMember(env, params.id, params.userId);
      const leaving = params.userId === user.id;

      if (target.role === "owner") {
        throw new HttpError(400, "owner_cannot_leave", "Transfer ownership or delete the workspace first");
      }
      // Owners remove anyone; admins remove members; everyone can leave.
      const allowed = leaving || me.role === "owner" || (me.role === "admin" && target.role === "member");
      if (!allowed) throw new HttpError(403, "not_allowed", "Your role can't do that");

      await env.DB.prepare("DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?")
        .bind(params.id, params.userId)
        .run();
      return json({ ok: true });
    })

    .add("POST", "/v1/workspaces/:id/transfer", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner"]);
      const { userId } = await readJson(request);
      if (typeof userId !== "string" || userId === user.id) throw new HttpError(400, "bad_user", "Pick another member");
      await requireMember(env, params.id, userId);

      await env.DB.batch([
        env.DB.prepare("UPDATE memberships SET role = 'admin' WHERE workspace_id = ? AND user_id = ?").bind(
          params.id,
          user.id,
        ),
        env.DB.prepare("UPDATE memberships SET role = 'owner' WHERE workspace_id = ? AND user_id = ?").bind(
          params.id,
          userId,
        ),
        env.DB.prepare("UPDATE workspaces SET owner_id = ? WHERE id = ?").bind(userId, params.id),
      ]);
      return json({ ok: true });
    })

    .add("POST", "/v1/workspaces/:id/invites", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const membership = await requireMember(env, params.id, user.id, ["owner", "admin"]);
      const body = await readJson(request);
      const role = body.role ?? "member";
      if (role !== "admin" && role !== "member") throw new HttpError(400, "bad_role", "Role must be admin or member");
      if (role === "admin" && membership.role !== "owner") {
        throw new HttpError(403, "not_allowed", "Only the owner can invite admins");
      }
      const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "bad_email", "Check the email");
      if ((await memberCount(env, params.id)) >= membership.memberLimit) {
        throw new HttpError(409, "member_limit", "The workspace is full on its current plan");
      }

      const token = randomToken();
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO invites (id, workspace_id, token_hash, email, role, created_by, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, params.id, await hashToken(token), email, role, user.id, now, now + INVITE_LIFETIME_MS)
        .run();
      return json({ invite: { id, token, role, email, expiresAt: now + INVITE_LIFETIME_MS } }, { status: 201 });
    })

    .add("GET", "/v1/workspaces/:id/invites", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner", "admin"]);
      const { results } = await env.DB.prepare(
        `SELECT id, email, role, created_at, expires_at FROM invites
         WHERE workspace_id = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?
         ORDER BY created_at DESC`,
      )
        .bind(params.id, Date.now())
        .all<{ id: string; email: string | null; role: string; created_at: number; expires_at: number }>();
      return json({
        invites: results.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        })),
      });
    })

    .add("DELETE", "/v1/workspaces/:id/invites/:inviteId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner", "admin"]);
      await env.DB.prepare("UPDATE invites SET revoked_at = ? WHERE id = ? AND workspace_id = ? AND revoked_at IS NULL")
        .bind(Date.now(), params.inviteId, params.id)
        .run();
      return json({ ok: true });
    })

    .add("GET", "/v1/invites/:token", async ({ env, params }) => {
      const invite = await findInvite(env, params.token);
      return json({
        invite: {
          workspaceName: invite.workspace_name,
          invitedBy: invite.inviter_name,
          role: invite.role,
          expiresAt: invite.expires_at,
        },
      });
    })

    .add("POST", "/v1/invites/:token/accept", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      const invite = await findInvite(env, params.token);
      if (invite.email && invite.email !== user.email?.toLowerCase()) {
        throw new HttpError(403, "wrong_account", "This invite is for a different email");
      }

      const existing = await env.DB.prepare("SELECT role FROM memberships WHERE workspace_id = ? AND user_id = ?")
        .bind(invite.workspace_id, user.id)
        .first();
      if (!existing) {
        if ((await memberCount(env, invite.workspace_id)) >= invite.member_limit) {
          throw new HttpError(409, "member_limit", "The workspace is full on its current plan");
        }
        const now = Date.now();
        // The accepted_at check makes the invite single-use even if two people accept at once.
        const [claimed] = await env.DB.batch([
          env.DB.prepare("UPDATE invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL").bind(now, invite.id),
          env.DB.prepare(
            `INSERT INTO memberships (workspace_id, user_id, role, joined_at)
             SELECT ?, ?, ?, ? WHERE changes() = 1`,
          ).bind(invite.workspace_id, user.id, invite.role, now),
        ]);
        if (claimed.meta.changes !== 1) throw new HttpError(410, "invite_used", "This invite has already been used");
      }
      return json({ workspaceId: invite.workspace_id });
    });
}

interface InviteRow {
  id: string;
  workspace_id: string;
  workspace_name: string;
  member_limit: number;
  inviter_name: string;
  email: string | null;
  role: "admin" | "member";
  expires_at: number;
}

async function findInvite(env: Env, token: string): Promise<InviteRow> {
  const invite = await env.DB.prepare(
    `SELECT i.id, i.workspace_id, w.name AS workspace_name, w.member_limit, u.display_name AS inviter_name,
            i.email, i.role, i.expires_at
     FROM invites i
     JOIN workspaces w ON w.id = i.workspace_id
     JOIN users u ON u.id = i.created_by
     WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<InviteRow>();
  if (!invite) throw new HttpError(404, "invite_invalid", "This invite has expired or been used");
  return invite;
}

function workspaceJson(membership: Awaited<ReturnType<typeof requireMember>>, members: number) {
  return {
    id: membership.workspaceId,
    name: membership.workspaceName,
    plan: membership.plan,
    memberLimit: membership.memberLimit,
    members,
    role: membership.role,
  };
}
