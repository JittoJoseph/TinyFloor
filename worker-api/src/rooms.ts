import {
  LOBBY_COPY_CAPACITY,
  LOBBY_ROOM,
  signTicket,
  TICKET_LIFETIME_MS,
  type RoomRole,
  type RoomTicket,
} from "../../shared-protocol/src";
import { cleanName, findRoom, realtime, requireMember, requireRoom } from "./access";
import { hashToken, randomToken } from "./crypto";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireUser, type User } from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;
const GUEST_LINK_LIFETIMES: Record<string, number> = { "1d": DAY_MS, "7d": 7 * DAY_MS, "30d": 30 * DAY_MS };
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 20;

export function roomRoutes(router: Router): void {
  router
    .add("GET", "/v1/workspaces/:id/rooms", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id);
      return json({ rooms: await roomsOf(env, params.id) });
    })

    .add("POST", "/v1/workspaces/:id/rooms", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireMember(env, params.id, user.id, ["owner", "admin"]);
      const body = await readJson(request);
      const name = cleanName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Name the room");
      const capacity = body.capacity === undefined ? MAX_CAPACITY : parseCapacity(body.capacity);

      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO rooms (id, workspace_id, name, capacity, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(id, params.id, name, capacity, user.id, Date.now())
        .run();
      return json({ room: { id, name, capacity, people: 0 } }, { status: 201 });
    })

    .add("GET", "/v1/rooms/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id);
      return json({ room: roomJson(room) });
    })

    .add("PATCH", "/v1/rooms/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id, ["owner", "admin"]);
      const body = await readJson(request);
      const name = body.name === undefined ? room.name : cleanName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Name the room");
      const capacity = body.capacity === undefined ? room.capacity : parseCapacity(body.capacity);
      await env.DB.prepare("UPDATE rooms SET name = ?, capacity = ? WHERE id = ?").bind(name, capacity, room.id).run();
      return json({ room: roomJson({ ...room, name, capacity }) });
    })

    .add("DELETE", "/v1/rooms/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id, ["owner", "admin"]);
      await env.DB.prepare("UPDATE rooms SET archived_at = ? WHERE id = ?").bind(Date.now(), room.id).run();
      await realtime(env).closeRoom(room.id);
      return json({ ok: true });
    })

    .add("POST", "/v1/rooms/:id/guest-links", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id, ["owner", "admin"]);
      const { expiresIn = "7d" } = await readJson(request);
      const lifetime = GUEST_LINK_LIFETIMES[String(expiresIn)];
      if (!lifetime) throw new HttpError(400, "bad_expiry", "Links last 1d, 7d or 30d");

      const token = randomToken();
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO guest_links (id, room_id, token_hash, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(id, room.id, await hashToken(token), user.id, now, now + lifetime)
        .run();
      return json({ guestLink: { id, token, expiresAt: now + lifetime } }, { status: 201 });
    })

    .add("GET", "/v1/rooms/:id/guest-links", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id, ["owner", "admin"]);
      const { results } = await env.DB.prepare(
        `SELECT id, created_at, expires_at FROM guest_links
         WHERE room_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC`,
      )
        .bind(room.id, Date.now())
        .all<{ id: string; created_at: number; expires_at: number }>();
      return json({
        guestLinks: results.map((row) => ({ id: row.id, createdAt: row.created_at, expiresAt: row.expires_at })),
      });
    })

    .add("DELETE", "/v1/rooms/:id/guest-links/:linkId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id, ["owner", "admin"]);
      await env.DB.prepare("UPDATE guest_links SET revoked_at = ? WHERE id = ? AND room_id = ? AND revoked_at IS NULL")
        .bind(Date.now(), params.linkId, room.id)
        .run();
      await realtime(env).revokeGuestLink(room.id, params.linkId);
      return json({ ok: true });
    })

    .add("GET", "/v1/guest-links/:token", async ({ env, params }) => {
      const link = await findGuestLink(env, params.token);
      return json({ guestLink: { roomName: link.room_name, workspaceName: link.workspace_name } });
    })

    .add("POST", "/v1/rooms/:id/ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const room = await requireRoom(env, params.id, user.id);
      return json(await ticketFor(env, user, room.id, room.role, room.capacity));
    })

    .add("POST", "/v1/guest-links/:token/ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const link = await findGuestLink(env, params.token);
      // Members arriving through a guest link keep their own role and aren't tied to the link.
      const room = await findRoom(env, link.room_id, user.id);
      if (!room) throw new HttpError(404, "guest_link_invalid", "This link has expired or been revoked");
      if (room.role) return json(await ticketFor(env, user, room.id, room.role, room.capacity));
      return json(await ticketFor(env, user, room.id, "guest", room.capacity, link.id));
    })

    .add("POST", "/v1/lobby/ticket", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      return json(await ticketFor(env, user, LOBBY_ROOM, user.isGuest ? "guest" : "member", LOBBY_COPY_CAPACITY));
    });
}

/** A workspace's rooms with how many people are in each, for the dashboard. */
export async function roomsOf(env: Env, workspaceId: string): Promise<RoomSummary[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, name, capacity FROM rooms WHERE workspace_id = ? AND archived_at IS NULL ORDER BY created_at",
  )
    .bind(workspaceId)
    .all<{ id: string; name: string; capacity: number }>();
  return withPeople(env, results);
}

async function withPeople(env: Env, rooms: RoomRow[]): Promise<RoomSummary[]> {
  if (!rooms.length) return [];
  const people = await realtime(env).presenceCounts(rooms.map((room) => room.id));
  return rooms.map((room) => ({ ...room, people: people[room.id] ?? 0 }));
}

interface RoomRow {
  id: string;
  name: string;
  capacity: number;
}

type RoomSummary = RoomRow & { people: number };

async function ticketFor(
  env: Env,
  user: User,
  room: string,
  role: RoomRole,
  cap: number,
  link?: string,
): Promise<{ ticket: string; url: string }> {
  const claims: RoomTicket = {
    v: 1,
    room,
    sub: user.id,
    name: user.displayName,
    character: user.character,
    role,
    cap,
    exp: Date.now() + TICKET_LIFETIME_MS,
    ...(link ? { link } : {}),
  };
  const path = room === LOBBY_ROOM ? LOBBY_ROOM : `rooms/${room}`;
  return { ticket: await signTicket(claims, env.TICKET_SECRET), url: `${env.REALTIME_URL}/${path}` };
}

interface GuestLinkRow {
  id: string;
  room_id: string;
  room_name: string;
  workspace_name: string;
}

async function findGuestLink(env: Env, token: string): Promise<GuestLinkRow> {
  const link = await env.DB.prepare(
    `SELECT g.id, g.room_id, r.name AS room_name, w.name AS workspace_name
     FROM guest_links g
     JOIN rooms r ON r.id = g.room_id
     JOIN workspaces w ON w.id = r.workspace_id
     WHERE g.token_hash = ? AND g.revoked_at IS NULL AND g.expires_at > ? AND r.archived_at IS NULL`,
  )
    .bind(await hashToken(token), Date.now())
    .first<GuestLinkRow>();
  if (!link) throw new HttpError(404, "guest_link_invalid", "This link has expired or been revoked");
  return link;
}

function parseCapacity(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < MIN_CAPACITY || (value as number) > MAX_CAPACITY) {
    throw new HttpError(400, "bad_capacity", `Capacity is ${MIN_CAPACITY} to ${MAX_CAPACITY} people`);
  }
  return value as number;
}

function roomJson(room: { id: string; name: string; capacity: number; workspaceId: string; workspaceName: string }) {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    workspaceId: room.workspaceId,
    workspaceName: room.workspaceName,
  };
}
