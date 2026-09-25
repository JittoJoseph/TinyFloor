import {
  LOBBY_CHAT,
  LOBBY_COPY_CAPACITY,
  LOBBY_ROOM,
  signTicket,
  TICKET_LIFETIME_MS,
  type RoomRole,
  type RoomTicket,
} from "../../shared-protocol/src";
import { realtime, requireOffice } from "./access";
import { json } from "./http";
import type { Router } from "./router";
import { noteCountry, requireUser, type User } from "./session";

/** How stale the lobby door's head count may be. */
const LOBBY_CACHE_SECONDS = 15;

/** The floor is the office, so a room id is an office id. */
export function floorRoutes(router: Router): void {
  router
    // Walking into your own office.
    .add("POST", "/v1/offices/:id/ticket", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const office = await requireOffice(env, params.id, user.id);
      noteCountry(env, request, ctx, user);
      return json(await ticketFor(env, user, office.id, office.role, office.seats));
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

    .add("POST", "/v1/lobby/ticket", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      noteCountry(env, request, ctx, user);
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
  };
  const path = room === LOBBY_ROOM ? LOBBY_ROOM : `rooms/${room}`;
  return { ticket: await signTicket(claims, env.TICKET_SECRET), url: `${env.REALTIME_URL}/${path}` };
}
