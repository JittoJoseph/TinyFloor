import { requireOffice, seatsUsed } from "./access";
import { endTrials } from "./billing";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { domainAccess, workDomain, type DomainAccess } from "./domains";
import { requireAccount, type User } from "./session";

/**
 * Finding your team by your work email (docs/product.md). Colleagues often
 * sign up on their own, without the link, and used to land on "make your
 * office": a second office for the same company, or none at all. Anyone
 * signed in with a verified address at the domain of an office's owner can
 * see that office and walk straight in. An admin can have them ask first
 * instead (a company with several teams might), or keep the office out of sight.
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
  domain_join: string | null;
  owner_name: string;
  members: number;
  faces: string | null;
  asked: number;
}

export interface TeamOffice {
  id: string;
  name: string;
  members: number;
  owner: string;
  faces: string[];
  /** Walk straight in, or ask an admin first. */
  access: Exclude<DomainAccess, "off">;
  /** They've asked, and nobody has answered yet. */
  asked: boolean;
  /** No room. */
  full: boolean;
}

/** Offices at the caller's domain that they aren't in and can find: the busiest with room first, full ones last. */
async function teamOffices(env: Env, userId: string, domain: string): Promise<TeamOffice[]> {
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.name, o.seats, o.domain_join, u.display_name AS owner_name,
            (SELECT COUNT(*) FROM memberships m WHERE m.office_id = o.id) AS members,
            (SELECT group_concat(user_id) FROM (SELECT m.user_id FROM memberships m WHERE m.office_id = o.id ORDER BY m.role = 'admin' DESC, m.joined_at LIMIT 5)) AS faces,
            EXISTS (SELECT 1 FROM join_requests r WHERE r.office_id = o.id AND r.user_id = ?) AS asked
     FROM offices o JOIN users u ON u.id = o.owner_id
     WHERE u.email_verified = 1 AND lower(substr(u.email, instr(u.email, '@') + 1)) = ?
       AND NOT EXISTS (SELECT 1 FROM memberships me WHERE me.office_id = o.id AND me.user_id = ?)
     ORDER BY members DESC, o.created_at
     LIMIT 20`,
  )
    .bind(userId, domain, userId)
    .all<TeamOfficeRow>();
  const offices: TeamOffice[] = [];
  for (const row of results) {
    const access = domainAccess(row.domain_join, domain);
    if (access === "off") continue;
    offices.push({
      id: row.id,
      name: row.name,
      members: row.members,
      owner: row.owner_name,
      faces: row.faces ? row.faces.split(",") : [],
      access,
      asked: !!row.asked,
      full: row.members >= row.seats,
    });
  }
  return offices.sort((a, b) => Number(a.full) - Number(b.full)).slice(0, 5);
}

/**
 * Puts someone in an office, if it has room. Being a member already is fine.
 * A request they had waiting is answered by it.
 */
export async function admit(env: Env, officeId: string, userId: string): Promise<void> {
  await endTrials(env, officeId);
  const member = await env.DB.prepare("SELECT 1 FROM memberships WHERE office_id = ? AND user_id = ?").bind(officeId, userId).first();
  if (!member) {
    const seats = (await env.DB.prepare("SELECT seats FROM offices WHERE id = ?").bind(officeId).first<{ seats: number }>())?.seats ?? 0;
    if ((await seatsUsed(env, officeId)) >= seats) throw new HttpError(409, "office_full", "This office is full");
    await env.DB.prepare("INSERT OR IGNORE INTO memberships (office_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(officeId, userId, Date.now())
      .run();
  }
  await env.DB.prepare("DELETE FROM join_requests WHERE office_id = ? AND user_id = ?").bind(officeId, userId).run();
}

/** Who's asking to join an office, longest waiting first: for its admins. */
export async function joinRequests(env: Env, officeId: string) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.display_name, u.email, r.created_at
     FROM join_requests r JOIN users u ON u.id = r.user_id
     WHERE r.office_id = ? AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.office_id = r.office_id AND m.user_id = r.user_id)
     ORDER BY r.created_at`,
  )
    .bind(officeId)
    .all<{ id: string; display_name: string; email: string | null; created_at: number }>();
  return results.map((row) => ({ id: row.id, displayName: row.display_name, email: row.email, askedAt: row.created_at }));
}

export function teamRoutes(router: Router): void {
  router
    // Your colleagues' offices, by your work email: what the door shows before "make your own".
    .add("GET", "/v1/me/team", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const domain = await verifiedDomain(env, user);
      return json({ domain, offices: domain ? await teamOffices(env, user.id, domain) : [] });
    })

    // Joining a colleague's office: straight in where it's open, otherwise asking its admins.
    .add("POST", "/v1/offices/:id/join", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      const domain = await verifiedDomain(env, user);
      const office = domain ? (await teamOffices(env, user.id, domain)).find((one) => one.id === params.id) : undefined;
      if (!office) {
        // Already in it is a join that worked; anything else is an office they can't see.
        const member = await env.DB.prepare("SELECT 1 FROM memberships WHERE office_id = ? AND user_id = ?").bind(params.id, user.id).first();
        if (member) return json({ officeId: params.id, joined: true });
        throw new HttpError(404, "not_found", "No such office");
      }
      if (office.access === "open") {
        await admit(env, params.id, user.id);
        return json({ officeId: params.id, joined: true });
      }
      await env.DB.prepare("INSERT OR IGNORE INTO join_requests (office_id, user_id, created_at) VALUES (?, ?, ?)")
        .bind(params.id, user.id, Date.now())
        .run();
      return json({ officeId: params.id, joined: false });
    })

    // Changing your mind before anyone answered.
    .add("DELETE", "/v1/offices/:id/join", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      await env.DB.prepare("DELETE FROM join_requests WHERE office_id = ? AND user_id = ?").bind(params.id, user.id).run();
      return json({ ok: true });
    })

    // An admin answering: let them in, or not. Either way the request is done.
    .add("POST", "/v1/offices/:id/requests/:userId", async ({ request, env, ctx, params }) => {
      const user = await requireAccount(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      const { approve } = await readJson(request);
      if (typeof approve !== "boolean") throw new HttpError(400, "bad_answer", "Approve or not");
      const waiting = await env.DB.prepare("SELECT 1 FROM join_requests WHERE office_id = ? AND user_id = ?")
        .bind(params.id, params.userId)
        .first();
      if (!waiting) throw new HttpError(404, "not_found", "Nobody is asking");
      if (approve) await admit(env, params.id, params.userId);
      else await env.DB.prepare("DELETE FROM join_requests WHERE office_id = ? AND user_id = ?").bind(params.id, params.userId).run();
      return json({ requests: await joinRequests(env, params.id) });
    });
}
