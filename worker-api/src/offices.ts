import {
  cleanName,
  realtime,
  requireOffice,
  seatsUsed,
  type Office,
  type OfficeRole,
} from "./access";
import { endBillingForClosing, endTrials, startTrialIfFull, trialWaiting } from "./billing";
import { hashToken, randomToken } from "./crypto";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount, requireUser } from "./session";

/** An invite code: 16 random bytes, base64url, so the link stays short enough to paste anywhere. */
function inviteCode(): string {
  return randomToken().slice(0, 22);
}

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
      // The team hears about every new office; a Discord hiccup never fails the request.
      const cf = request.cf as { city?: string; region?: string; country?: string } | undefined;
      ctx.waitUntil(
        realtime(env)
          .officeCreated({ office: name, owner: user.displayName, where: { city: cf?.city, region: cf?.region, country: cf?.country } })
          .catch(() => undefined),
      );
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
      await closeOffice(env, params.id);
      return json({ ok: true });
    })

    // Everything the People view shows, in one request.
    .add("GET", "/v1/offices/:id/overview", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      const admin = office.role === "admin";
      const [members, people] = await Promise.all([membersOf(env, params.id), headcount(env, params.id)]);
      return json({ office: officeJson(office, members.length), members, people });
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

    // The office's one invite link, for anyone in it to share; made the first time it is asked for.
    .add("GET", "/v1/offices/:id/invite", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id);
      await env.DB.prepare("UPDATE offices SET invite_code = ? WHERE id = ? AND invite_code IS NULL")
        .bind(inviteCode(), params.id)
        .run();
      return json({ code: await inviteCodeOf(env, params.id) });
    })

    // A link that went somewhere it shouldn't: the old one stops working, and a new one takes its place.
    .add("POST", "/v1/offices/:id/invite/reset", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      const code = inviteCode();
      await env.DB.prepare("UPDATE offices SET invite_code = ? WHERE id = ?").bind(code, params.id).run();
      return json({ code });
    })

    .add("GET", "/v1/invites/:token", async ({ env, params }) => {
      const invite = await findInvite(env, params.token);
      const used = await seatsUsed(env, invite.office_id);
      // A full free office that still has its trial lets the next person in, and starts it.
      const full = used >= invite.seats && !(await trialWaiting(env, invite.office_id));
      return json({
        invite: {
          // The office's id seeds its mark, so the door shows the mark the office has inside.
          officeId: invite.office_id,
          officeName: invite.office_name,
          members: used,
          role: invite.role,
          full,
        },
      });
    })

    .add("POST", "/v1/invites/:token/accept", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      let invite = await findInvite(env, params.token);
      // The seats a just-ended trial leaves, not the trial's.
      if (await endTrials(env, invite.office_id)) invite = await findInvite(env, params.token);
      if (invite.email && invite.email !== user.email?.toLowerCase()) {
        throw new HttpError(403, "wrong_account", "This invitation is for a different email");
      }

      const existing = await env.DB.prepare("SELECT role FROM memberships WHERE office_id = ? AND user_id = ?")
        .bind(invite.office_id, user.id)
        .first();
      if (!existing) {
        if ((await seatsUsed(env, invite.office_id)) >= invite.seats) {
          // The team is moving in: a free office's trial makes room instead of turning them away
          // (or someone joining at the same moment just started it).
          await startTrialIfFull(env, invite.office_id);
          invite = await findInvite(env, params.token);
          if ((await seatsUsed(env, invite.office_id)) >= invite.seats) {
            throw new HttpError(409, "office_full", `This office is full at ${invite.seats} members`);
          }
        }
        const now = Date.now();
        if (!invite.id) {
          // The office's link: anyone with it can take a free seat, as often as there are seats.
          await env.DB.prepare("INSERT OR IGNORE INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
            .bind(invite.office_id, user.id, now)
            .run();
          return json({ officeId: invite.office_id });
        }
        // An older, single-use invitation (made before the link): the accepted_at check keeps it single-use.
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
  /** Null for the office's own link; an id for an older single-use invitation. */
  id: string | null;
  office_id: string;
  office_name: string;
  seats: number;
  email: string | null;
  role: OfficeRole;
}

/**
 * What a link opens: the office whose invite link it is, or, until they run
 * out (a week at most), an older single-use invitation made before the link.
 */
async function findInvite(env: Env, token: string): Promise<InviteRow> {
  const office = await env.DB.prepare("SELECT id, name, seats FROM offices WHERE invite_code = ?")
    .bind(token)
    .first<{ id: string; name: string; seats: number }>();
  if (office) return { id: null, office_id: office.id, office_name: office.name, seats: office.seats, email: null, role: "member" };

  const invite = await env.DB.prepare(
    `SELECT i.id, i.office_id, o.name AS office_name, o.seats, i.email, i.role
     FROM invites i
     JOIN offices o ON o.id = i.office_id
     WHERE i.token_hash = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<InviteRow>();
  if (!invite) throw new HttpError(404, "invite_invalid", "This invite link has been reset or no longer works");
  return invite;
}

async function inviteCodeOf(env: Env, officeId: string): Promise<string> {
  const row = await env.DB.prepare("SELECT invite_code FROM offices WHERE id = ?").bind(officeId).first<{ invite_code: string }>();
  return row!.invite_code;
}

/**
 * An office goes, with its members, invites, floor and chat. A paid plan is
 * cancelled first, on purpose (docs/14); closing then stops it for good.
 */
export async function closeOffice(env: Env, officeId: string): Promise<void> {
  await endBillingForClosing(env, officeId);
  // Members and invites go with it (ON DELETE CASCADE).
  await env.DB.batch([
    env.DB.prepare("DELETE FROM usage_monthly WHERE office_id = ?").bind(officeId),
    env.DB.prepare("DELETE FROM offices WHERE id = ?").bind(officeId),
  ]);
  await realtime(env).forgetOffice(officeId);
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
    role: office.role,
    owner: office.ownerId,
    trialEndsAt: office.trialEndsAt,
    trialOpen: office.trialOpen,
  };
}
