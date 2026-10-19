import type { RealtimeAdminApi } from "../../shared-protocol/src";
import { endTrials } from "./billing";
import { domainOpen, workDomain } from "./domains";
import { HttpError } from "./http";

export type OfficeRole = "admin" | "member";

/** Who can share the office's invite link. */
export type InvitePolicy = "everyone" | "admins";
export const INVITE_POLICIES: readonly InvitePolicy[] = ["everyone", "admins"];

export interface Office {
  id: string;
  name: string;
  plan: string;
  /** How many people can be members of this office. */
  seats: number;
  /** The caller's role here. */
  role: OfficeRole;
  ownerId: string;
  /** When the team trial on its plan ends, while one runs (docs/pricing.md). */
  trialEndsAt: number | null;
  /** Free, never trialled and never paid: the trial is still there to start (where plans are sold). */
  trialOpen: boolean;
  invitePolicy: InvitePolicy;
  /** The owner's company email domain, when it has one: colleagues there can find the office. */
  joinDomain: string | null;
  /** Whether they can, and walk in without the link. */
  domainJoin: boolean;
}

/**
 * The caller's office, or a 404 when they are not a member, so outsiders cannot
 * tell which offices exist. With `roles`, also a 403 unless the role is one of
 * them.
 */
export async function requireOffice(
  env: Env,
  officeId: string,
  userId: string,
  roles?: OfficeRole[],
): Promise<Office> {
  const row = await env.DB.prepare(
    `SELECT o.id, o.name, o.plan, o.seats, o.owner_id, o.trial_ends_at, m.role,
            (o.plan = 'free' AND o.trial_ends_at IS NULL AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.office_id = o.id)) AS trial_open, o.invite_policy, o.domain_join,
            CASE WHEN ow.email_verified = 1 THEN ow.email END AS owner_email
     FROM memberships m JOIN offices o ON o.id = m.office_id
     LEFT JOIN users ow ON ow.id = o.owner_id
     WHERE m.office_id = ? AND m.user_id = ?`,
  )
    .bind(officeId, userId)
    .first<{
      id: string;
      name: string;
      plan: string;
      seats: number;
      owner_id: string;
      trial_ends_at: number | null;
      role: OfficeRole;
      trial_open: number;
      invite_policy: string | null;
      domain_join: number | null;
      owner_email: string | null;
    }>();
  if (!row) throw new HttpError(404, "not_found", "No such office");
  if (roles && !roles.includes(row.role)) throw new HttpError(403, "not_allowed", "Only an admin can do that");
  // A trial that has just ended goes back to free before anything reads the plan.
  if (row.trial_ends_at && row.trial_ends_at > 0 && row.trial_ends_at <= Date.now() && (await endTrials(env, row.id))) {
    return requireOffice(env, officeId, userId, roles);
  }
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    seats: row.seats,
    role: row.role,
    ownerId: row.owner_id,
    trialEndsAt: row.trial_ends_at && row.trial_ends_at > Date.now() ? row.trial_ends_at : null,
    trialOpen: !!row.trial_open,
    invitePolicy: row.invite_policy === "admins" ? "admins" : "everyone",
    joinDomain: workDomain(row.owner_email),
    domainJoin: domainOpen(row.domain_join, workDomain(row.owner_email)),
  };
}

/** The office behind a floor, without requiring membership. */
export async function findOffice(env: Env, officeId: string): Promise<Omit<Office, "role" | "trialEndsAt" | "trialOpen" | "invitePolicy" | "joinDomain" | "domainJoin"> | null> {
  const row = await env.DB.prepare("SELECT id, name, plan, seats, owner_id FROM offices WHERE id = ?")
    .bind(officeId)
    .first<{ id: string; name: string; plan: string; seats: number; owner_id: string }>();
  if (!row) return null;
  return { id: row.id, name: row.name, plan: row.plan, seats: row.seats, ownerId: row.owner_id };
}

/** Seats taken. Membership is the seat: an invitation is not, and neither is being online. */
export async function seatsUsed(env: Env, officeId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE office_id = ?")
    .bind(officeId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export function realtime(env: Env): RealtimeAdminApi {
  return env.REALTIME as unknown as RealtimeAdminApi;
}

/** Names for offices: single spaces, no control characters, trimmed to length. */
export function cleanName(value: unknown, maxLength = 48): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}
