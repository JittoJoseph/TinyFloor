import type { RealtimeAdminApi } from "../../shared-protocol/src";
import { HttpError } from "./http";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface Membership {
  workspaceId: string;
  workspaceName: string;
  plan: string;
  memberLimit: number;
  role: WorkspaceRole;
}

export interface RoomAccess {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  capacity: number;
  /** The caller's role in the room's workspace, or null when they aren't a member. */
  role: WorkspaceRole | null;
}

/**
 * The caller's membership, or a 404 when there is none, so outsiders can't tell
 * which workspaces exist. With `roles`, also a 403 unless the role is one of them.
 */
export async function requireMember(
  env: Env,
  workspaceId: string,
  userId: string,
  roles?: WorkspaceRole[],
): Promise<Membership> {
  const row = await env.DB.prepare(
    `SELECT w.id, w.name, w.plan, w.member_limit, m.role
     FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
     WHERE m.workspace_id = ? AND m.user_id = ?`,
  )
    .bind(workspaceId, userId)
    .first<{ id: string; name: string; plan: string; member_limit: number; role: WorkspaceRole }>();
  if (!row) throw new HttpError(404, "not_found", "No such workspace");
  if (roles && !roles.includes(row.role)) throw new HttpError(403, "not_allowed", "Your role can't do that");
  return { workspaceId: row.id, workspaceName: row.name, plan: row.plan, memberLimit: row.member_limit, role: row.role };
}

/** A room that isn't archived, with the caller's role in its workspace. */
export async function findRoom(env: Env, roomId: string, userId: string): Promise<RoomAccess | null> {
  const row = await env.DB.prepare(
    `SELECT r.id, r.workspace_id, r.name, r.capacity, w.name AS workspace_name, m.role
     FROM rooms r
     JOIN workspaces w ON w.id = r.workspace_id
     LEFT JOIN memberships m ON m.workspace_id = r.workspace_id AND m.user_id = ?
     WHERE r.id = ? AND r.archived_at IS NULL`,
  )
    .bind(userId, roomId)
    .first<{
      id: string;
      workspace_id: string;
      name: string;
      capacity: number;
      workspace_name: string;
      role: WorkspaceRole | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    name: row.name,
    capacity: row.capacity,
    role: row.role,
  };
}

/** A room the caller is a member of, 404 otherwise. With `roles`, also a 403 unless the role is one of them. */
export async function requireRoom(
  env: Env,
  roomId: string,
  userId: string,
  roles?: WorkspaceRole[],
): Promise<RoomAccess & { role: WorkspaceRole }> {
  const room = await findRoom(env, roomId, userId);
  if (!room || !room.role) throw new HttpError(404, "not_found", "No such room");
  if (roles && !roles.includes(room.role)) throw new HttpError(403, "not_allowed", "Your role can't do that");
  return room as RoomAccess & { role: WorkspaceRole };
}

export async function memberCount(env: Env, workspaceId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE workspace_id = ?")
    .bind(workspaceId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export function realtime(env: Env): RealtimeAdminApi {
  return env.REALTIME as unknown as RealtimeAdminApi;
}

/** Names for workspaces and rooms: single spaces, no control characters, trimmed to length. */
export function cleanName(value: unknown, maxLength = 48): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}
