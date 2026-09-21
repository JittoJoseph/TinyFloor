import {
  LOBBY_CHAT,
  LOBBY_COPY_CAPACITY,
  LOBBY_ROOM,
  signTicket,
  TICKET_LIFETIME_MS,
  type RoomRole,
  type RoomTicket,
} from "../../shared-protocol/src";
import { floorCapacity, realtime, requireOffice } from "./access";
import { hashToken, randomToken } from "./crypto";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireUser, type User } from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How stale the lobby door's head count may be. */
const LOBBY_CACHE_SECONDS = 15;
const GUEST_LINK_LIFETIMES: Record<string, number> = { "1d": DAY_MS, "7d": 7 * DAY_MS, "30d": 30 * DAY_MS };

/** The floor is the office, so a room id is an office id. */
export function floorRoutes(router: Router): void {
  router
    .add("POST", "/v1/offices/:id/guest-links", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      const { expiresIn = "7d" } = await readJson(request);
      const lifetime = GUEST_LINK_LIFETIMES[String(expiresIn)];
      if (!lifetime) throw new HttpError(400, "bad_expiry", "Links last 1d, 7d or 30d");

      const token = randomToken();
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        "INSERT INTO guest_links (id, office_id, token_hash, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(id, params.id, await hashToken(token), user.id, now, now + lifetime)
        .run();
      return json({ guestLink: { id, token, createdAt: now, expiresAt: now + lifetime } }, { status: 201 });
    })

    .add("DELETE", "/v1/offices/:id/guest-links/:linkId", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      await requireOffice(env, params.id, user.id, ["admin"]);
      await env.DB.prepare("UPDATE guest_links SET revoked_at = ? WHERE id = ? AND office_id = ? AND revoked_at IS NULL")
        .bind(Date.now(), params.linkId, params.id)
        .run();
      await realtime(env).revokeGuestLink(params.id, params.linkId);
      return json({ ok: true });
    })

    .add("GET", "/v1/guest-links/:token", async ({ env, params }) => {
      const link = await findGuestLink(env, params.token);
      return json({ guestLink: { officeName: link.office_name } });
    })

    // Walking into your own office.
    .add("POST", "/v1/offices/:id/ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      return json(await ticketFor(env, user, office.id, office.role, floorCapacity(office.seats)));
    })

    // The office's chat is its own object, so it gets its own ticket.
    .add("POST", "/v1/offices/:id/chat-ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      const claims: RoomTicket = {
        v: 1,
        room: `chat:${office.id}`,
        sub: user.id,
        name: user.displayName,
        character: user.character,
        role: office.role,
        cap: office.seats,
        exp: Date.now() + TICKET_LIFETIME_MS,
      };
      return json({
        ticket: await signTicket(claims, env.TICKET_SECRET),
        url: `${env.REALTIME_URL}/offices/${office.id}/chat`,
      });
    })

    .add("POST", "/v1/guest-links/:token/ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const link = await findGuestLink(env, params.token);
      const cap = floorCapacity(link.seats);
      // A member who follows a guest link is still a member, and isn't tied to the link.
      const membership = await env.DB.prepare("SELECT role FROM memberships WHERE office_id = ? AND user_id = ?")
        .bind(link.office_id, user.id)
        .first<{ role: RoomRole }>();
      if (membership) return json(await ticketFor(env, user, link.office_id, membership.role, cap));
      return json(await ticketFor(env, user, link.office_id, "guest", cap, link.id));
    })

    .add("POST", "/v1/lobby/ticket", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      return json(await ticketFor(env, user, LOBBY_ROOM, user.isGuest ? "guest" : "member", LOBBY_COPY_CAPACITY));
    })

    // The lobby's one chat, shared by every copy of its floor. Guests post too,
    // under the name they walked in with.
    .add("POST", "/v1/lobby/chat-ticket", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const claims: RoomTicket = {
        v: 1,
        room: `chat:${LOBBY_CHAT}`,
        sub: user.id,
        name: user.displayName,
        character: user.character,
        role: user.isGuest ? "guest" : "member",
        cap: LOBBY_COPY_CAPACITY,
        exp: Date.now() + TICKET_LIFETIME_MS,
      };
      return json({ ticket: await signTicket(claims, env.TICKET_SECRET), url: `${env.REALTIME_URL}/lobby/chat` });
    })

    // Who is in the lobby, for its door, before you have walked in (or signed
    // up). Cached at the edge for a few seconds, so a busy door never wakes the
    // rooms once per visitor.
    .add("GET", "/v1/lobby", async ({ env, ctx }) => {
      const key = new Request("https://lobby-people.internal/");
      const cached = await caches.default.match(key);
      if (cached) return json(await cached.json());
      const people = await realtime(env)
        .lobbyPeople()
        .catch(() => ({ here: 0, faces: [] }));
      ctx.waitUntil(
        caches.default.put(
          key,
          new Response(JSON.stringify(people), { headers: { "Cache-Control": `max-age=${LOBBY_CACHE_SECONDS}` } }),
        ),
      );
      return json(people);
    });
}

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
  office_id: string;
  office_name: string;
  seats: number;
}

async function findGuestLink(env: Env, token: string): Promise<GuestLinkRow> {
  const link = await env.DB.prepare(
    `SELECT g.id, g.office_id, o.name AS office_name, o.seats
     FROM guest_links g JOIN offices o ON o.id = g.office_id
     WHERE g.token_hash = ? AND g.revoked_at IS NULL AND g.expires_at > ?`,
  )
    .bind(await hashToken(token), Date.now())
    .first<GuestLinkRow>();
  if (!link) throw new HttpError(404, "guest_link_invalid", "This link has expired or been revoked");
  return link;
}
