import type { RealtimeAdminApi } from "../../shared-protocol/src";
import { HttpError } from "./http";

export type OfficeRole = "admin" | "member";

export interface Office {
  id: string;
  name: string;
  plan: string;
  /** How many people can be members of this office. */
  seats: number;
  /** The caller's role here. */
  role: OfficeRole;
  ownerId: string;
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
    `SELECT o.id, o.name, o.plan, o.seats, o.owner_id, m.role
     FROM memberships m JOIN offices o ON o.id = m.office_id
     WHERE m.office_id = ? AND m.user_id = ?`,
  )
    .bind(officeId, userId)
    .first<{ id: string; name: string; plan: string; seats: number; owner_id: string; role: OfficeRole }>();
  if (!row) throw new HttpError(404, "not_found", "No such office");
  if (roles && !roles.includes(row.role)) throw new HttpError(403, "not_allowed", "Only an admin can do that");
  return { id: row.id, name: row.name, plan: row.plan, seats: row.seats, role: row.role, ownerId: row.owner_id };
}

/** The office behind a floor, without requiring membership. */
export async function findOffice(env: Env, officeId: string): Promise<Omit<Office, "role"> | null> {
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
