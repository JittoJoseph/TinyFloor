import { seatsUsed } from "./access";
import { endTrials, startTrialIfFull, trialWaiting } from "./billing";
import { HttpError, json } from "./http";
import type { Router } from "./router";
import { domainOpen, workDomain } from "./domains";
import { requireAccount, type User } from "./session";

/**
 * Finding your team by your work email (docs/product.md). Colleagues often
 * sign up on their own, without the link, and used to land on "make your
 * office": a second office for the same company, or none at all. Anyone
 * signed in with a verified address at the domain of an office's owner can
 * see that office and walk in, the way Slack and Linear let you join your
 * company's workspace.
 */

/** The caller's company domain, if their address is verified and isn't a personal one. */
async function verifiedDomain(env: Env, user: User): Promise<string | null> {
  const row = await env.DB.prepare("SELECT email, email_verified FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ email: string | null; email_verified: number }>();
  return row?.email_verified === 1 ? workDomain(row.email) : null;
}

interface TeamOfficeRow {
  id: string;
  name: string;
  seats: number;
  domain_join: number | null;
  owner_name: string;
  owner_email: string;
  members: number;
  faces: string | null;
}

/** Offices at the caller's domain that they aren't in, open to it: the busiest with room first, full ones last. */
async function teamOffices(env: Env, userId: string, domain: string) {
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.name, o.seats, o.domain_join, u.display_name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM memberships m WHERE m.office_id = o.id) AS members,
            (SELECT group_concat(user_id) FROM (SELECT m.user_id FROM memberships m WHERE m.office_id = o.id ORDER BY m.joined_at LIMIT 5)) AS faces
     FROM offices o JOIN users u ON u.id = o.owner_id
     WHERE u.email_verified = 1 AND lower(substr(u.email, instr(u.email, '@') + 1)) = ?
       AND NOT EXISTS (SELECT 1 FROM memberships me WHERE me.office_id = o.id AND me.user_id = ?)
     ORDER BY members DESC, o.created_at
     LIMIT 10`,
  )
    .bind(domain, userId)
    .all<TeamOfficeRow>();
  const open = results.filter((row) => domainOpen(row.domain_join, domain));
  const offices = await Promise.all(
    open.map(async (row) => ({
      id: row.id,
      name: row.name,
      members: row.members,
      owner: row.owner_name,
      faces: row.faces ? row.faces.split(",") : [],
      // Full, and no trial left to make room: they'd be turned away.
      full: row.members >= row.seats && !(await trialWaiting(env, row.id)),
    })),
  );
  return offices.sort((a, b) => Number(a.full) - Number(b.full)).slice(0, 5);
}

/**
 * Puts someone in an office, making room the way a team moving in does: a
 * full free office's trial starts rather than turn them away (docs/pricing.md).
 * Being a member already is fine.
 */
export async function admit(env: Env, officeId: string, userId: string): Promise<void> {
  await endTrials(env, officeId);
  const member = await env.DB.prepare("SELECT 1 FROM memberships WHERE office_id = ? AND user_id = ?").bind(officeId, userId).first();
  if (member) return;
  const seats = async () =>
    (await env.DB.prepare("SELECT seats FROM offices WHERE id = ?").bind(officeId).first<{ seats: number }>())?.seats ?? 0;
  if ((await seatsUsed(env, officeId)) >= (await seats())) {
    await startTrialIfFull(env, officeId);
    if ((await seatsUsed(env, officeId)) >= (await seats())) {
      throw new HttpError(409, "office_full", "This office is full");
    }
  }
  await env.DB.prepare("INSERT OR IGNORE INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
    .bind(officeId, userId, Date.now())
    .run();
}

export function teamRoutes(router: Router): void {
  router
    // Your colleagues' offices, by your work email: what the door shows before "make your own".
    .add("GET", "/v1/me/team", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const domain = await verifiedDomain(env, user);
      return json({ domain, offices: domain ? await teamOffices(env, user.id, domain) : [] });
    })

    .add("POST", "/v1/offices/:id/join", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      const domain = await verifiedDomain(env, user);
      const office = domain ? (await teamOffices(env, user.id, domain)).find((one) => one.id === params.id) : undefined;
      if (!office) {
        // Already in it is a join that worked; anything else is an office they can't see.
        const member = await env.DB.prepare("SELECT 1 FROM memberships WHERE office_id = ? AND user_id = ?").bind(params.id, user.id).first();
        if (member) return json({ officeId: params.id });
        throw new HttpError(404, "not_found", "No such office");
      }
      await admit(env, params.id, user.id);
      return json({ officeId: params.id });
    });
}
