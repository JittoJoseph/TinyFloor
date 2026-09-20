import {
  cleanName,
  floorCapacity,
  realtime,
  requireOffice,
  seatsUsed,
  type Office,
  type OfficeRole,
} from "./access";
import { hashToken, randomToken } from "./crypto";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount, requireUser } from "./session";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function officeRoutes(router: Router): void {
  router
    .add("POST", "/v1/offices", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const name = cleanName((await readJson(request)).name);
      if (!name) throw new HttpError(400, "name_required", "Name the office");

      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO offices (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").bind(
          id,
          name,
          user.id,
          now,
        ),
        env.DB.prepare("INSERT INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)").bind(
          id,
          user.id,
          now,
        ),
      ]);
      return json({ office: officeJson(await requireOffice(env, id, user.id), 1) }, { status: 201 });
    })

    .add("GET", "/v1/offices/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      return json({ office: officeJson(office, await seatsUsed(env, params.id)) });
    })

    .add("PATCH", "/v1/offices/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      const name = cleanName((await readJson(request)).name);
      if (!name) throw new HttpError(400, "name_required", "Name the office");
      await env.DB.prepare("UPDATE offices SET name = ? WHERE id = ?").bind(name, params.id).run();
      const office = await requireOffice(env, params.id, user.id);
      return json({ office: officeJson(office, await seatsUsed(env, params.id)) });
    })

    .add("DELETE", "/v1/offices/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      if (office.ownerId !== user.id) {
        throw new HttpError(403, "not_owner", "Only the person who owns this office can close it");
      }
      // Members, invites and guest links go with it (ON DELETE CASCADE).
      await env.DB.prepare("DELETE FROM offices WHERE id = ?").bind(params.id).run();
      await realtime(env).closeRoom(params.id);
      return json({ ok: true });
    })

    // Everything the People view shows, in one request.
    .add("GET", "/v1/offices/:id/overview", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      const admin = office.role === "admin";
      const [members, invites, guestLinks, people] = await Promise.all([
        membersOf(env, params.id),
        admin ? invitesOf(env, params.id) : [],
        admin ? guestLinksOf(env, params.id) : [],
        headcount(env, params.id),
      ]);
      return json({ office: officeJson(office, members.length), members, invites, guestLinks, people });
    })

    .add("PATCH", "/v1/offices/:id/members/:userId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const { role } = await readJson(request);
      if (role !== "admin" && role !== "member") throw new HttpError(400, "bad_role", "Role is admin or member");
      if (params.userId === office.ownerId && role !== "admin") {
        throw new HttpError(400, "owner_role", "Hand the office over before stepping down");
      }
      await requireOffice(env, params.id, params.userId);
      await env.DB.prepare("UPDATE memberships SET role = ? WHERE office_id = ? AND user_id = ?")
        .bind(role, params.id, params.userId)
        .run();
      return json({ ok: true });
    })

    .add("DELETE", "/v1/offices/:id/members/:userId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const me = await requireOffice(env, params.id, user.id);
      const leaving = params.userId === user.id;
      if (!leaving && me.role !== "admin") throw new HttpError(403, "not_allowed", "Only an admin can do that");
      if (params.userId === me.ownerId) {
        throw new HttpError(400, "owner_stays", "Hand the office over or close it first");
      }
      await requireOffice(env, params.id, params.userId);

      // Leaving frees the seat straight away; someone else can take it now.
      await env.DB.prepare("DELETE FROM memberships WHERE office_id = ? AND user_id = ?")
        .bind(params.id, params.userId)
        .run();
      await realtime(env).removeMember(params.id, params.userId);
      return json({ ok: true });
    })

    .add("POST", "/v1/offices/:id/transfer", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      if (office.ownerId !== user.id) throw new HttpError(403, "not_owner", "Only the owner can hand it over");
      const { userId } = await readJson(request);
      if (typeof userId !== "string" || userId === user.id) throw new HttpError(400, "bad_user", "Pick another member");
      await requireOffice(env, params.id, userId);

      await env.DB.batch([
        env.DB.prepare("UPDATE memberships SET role = 'admin' WHERE office_id = ? AND user_id = ?").bind(
          params.id,
          userId,
        ),
        env.DB.prepare("UPDATE offices SET owner_id = ? WHERE id = ?").bind(userId, params.id),
      ]);
      return json({ ok: true });
    })

    .add("POST", "/v1/offices/:id/invites", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id, ["admin"]);
      const body = await readJson(request);
      const role = body.role ?? "member";
      if (role !== "admin" && role !== "member") throw new HttpError(400, "bad_role", "Role is admin or member");
      const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "bad_email", "Check the email");

      // An invitation holds no seat, so it can be sent to a full office; it is
      // accepting that is refused, and only while the office is still full.
      const token = randomToken();
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO invites (id, office_id, token_hash, email, role, created_by, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, params.id, await hashToken(token), email, role, user.id, now, now + INVITE_LIFETIME_MS)
        .run();
      return json(
        { invite: { id, token, role, email, createdAt: now, expiresAt: now + INVITE_LIFETIME_MS }, office: office.id },
        { status: 201 },
      );
    })

    .add("DELETE", "/v1/offices/:id/invites/:inviteId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      await env.DB.prepare("UPDATE invites SET revoked_at = ? WHERE id = ? AND office_id = ? AND revoked_at IS NULL")
        .bind(Date.now(), params.inviteId, params.id)
        .run();
      return json({ ok: true });
    })

    .add("GET", "/v1/invites/:token", async ({ env, params }) => {
      const invite = await findInvite(env, params.token);
      const used = await seatsUsed(env, invite.office_id);
      return json({
        invite: {
          officeName: invite.office_name,
          invitedBy: invite.inviter_name,
          role: invite.role,
          expiresAt: invite.expires_at,
          full: used >= invite.seats,
        },
      });
    })

    .add("POST", "/v1/invites/:token/accept", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      const invite = await findInvite(env, params.token);
      if (invite.email && invite.email !== user.email?.toLowerCase()) {
        throw new HttpError(403, "wrong_account", "This invitation is for a different email");
      }

      const existing = await env.DB.prepare("SELECT role FROM memberships WHERE office_id = ? AND user_id = ?")
        .bind(invite.office_id, user.id)
        .first();
      if (!existing) {
        if ((await seatsUsed(env, invite.office_id)) >= invite.seats) {
          throw new HttpError(409, "office_full", `This office is full at ${invite.seats} members`);
        }
        const now = Date.now();
        // The accepted_at check makes the invitation single-use even if two people accept at once.
        const [claimed] = await env.DB.batch([
          env.DB.prepare("UPDATE invites SET accepted_at = ? WHERE id = ? AND accepted_at IS NULL").bind(now, invite.id),
          env.DB.prepare(
            `INSERT INTO memberships (office_id, user_id, role, joined_at)
             SELECT ?, ?, ?, ? WHERE changes() = 1`,
          ).bind(invite.office_id, user.id, invite.role, now),
        ]);
        if (claimed.meta.changes !== 1) throw new HttpError(410, "invite_used", "This invitation has been used");
      }
      return json({ officeId: invite.office_id });
    });
}

interface InviteRow {
  id: string;
  office_id: string;
  office_name: string;
  seats: number;
  inviter_name: string;
  email: string | null;
  role: OfficeRole;
  expires_at: number;
}

async function findInvite(env: Env, token: string): Promise<InviteRow> {
  const invite = await env.DB.prepare(
    `SELECT i.id, i.office_id, o.name AS office_name, o.seats, u.display_name AS inviter_name,
            i.email, i.role, i.expires_at
     FROM invites i
     JOIN offices o ON o.id = i.office_id
     JOIN users u ON u.id = i.created_by
     WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<InviteRow>();
  if (!invite) throw new HttpError(404, "invite_invalid", "This invitation has expired or been used");
  return invite;
}

/** Invitations that can still be used. */
export async function invitesOf(env: Env, officeId: string) {
  const { results } = await env.DB.prepare(
    `SELECT id, email, role, created_at, expires_at FROM invites
     WHERE office_id = ? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > ?
     ORDER BY created_at DESC`,
  )
    .bind(officeId, Date.now())
    .all<{ id: string; email: string | null; role: string; created_at: number; expires_at: number }>();
  return results.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/** Guest links that have not expired or been revoked. */
export async function guestLinksOf(env: Env, officeId: string) {
  const { results } = await env.DB.prepare(
    `SELECT id, created_at, expires_at FROM guest_links
     WHERE office_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC`,
  )
    .bind(officeId, Date.now())
    .all<{ id: string; created_at: number; expires_at: number }>();
  return results.map((row) => ({ id: row.id, createdAt: row.created_at, expiresAt: row.expires_at }));
}

/** Everyone in an office, oldest member first. */
export async function membersOf(env: Env, officeId: string) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.display_name, u.character, u.email, m.role, m.joined_at
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.office_id = ? ORDER BY m.joined_at`,
  )
    .bind(officeId)
    .all<{
      id: string;
      display_name: string;
      character: string;
      email: string | null;
      role: OfficeRole;
      joined_at: number;
    }>();
  return results.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    character: row.character,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

/** How many people are on the floor right now. Nice to have, never fatal. */
async function headcount(env: Env, officeId: string): Promise<number> {
  const counts = await realtime(env)
    .presenceCounts([officeId])
    .catch(() => ({}) as Record<string, number>);
  return counts[officeId] ?? 0;
}

export function officeJson(office: Office, members: number) {
  return {
    id: office.id,
    name: office.name,
    plan: office.plan,
    seats: office.seats,
    members,
    capacity: floorCapacity(office.seats),
    role: office.role,
    owner: office.ownerId,
  };
}
