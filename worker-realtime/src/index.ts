import { LOBBY_ROOM, verifyTicket } from "../../shared-protocol/src";
import { COUNTRY_HEADER, ROOM_HEADER, SPAWN_HEADER, TICKET_HEADER } from "./headers";
import { Room } from "./room";
import { LobbyRouter } from "./lobby-router";

export { Room, LobbyRouter };

/** `/lobby` for the public lobby, `/rooms/:room` for a workspace room. */
const ROOM_PATH = /^\/(?:rooms\/([a-z0-9-]{1,64})|lobby)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ service: "tinyfloor-realtime", ok: true });
    }

    const match = url.pathname.match(ROOM_PATH);
    if (!match) return new Response("Not found", { status: 404 });
    const room = match[1] ?? LOBBY_ROOM;

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }

    const origin = request.headers.get("Origin");
    if (!origin || !env.SITE_ORIGINS.split(",").includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    const ticket = await verifyTicket(url.searchParams.get("ticket"), env.TICKET_SECRET);
    if (!ticket || ticket.room !== room) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Lobby tickets name the lobby; the router picks which copy to join.
    const target = room === LOBBY_ROOM ? await env.LOBBY.getByName("global").place() : room;

    // The room trusts these headers, so anything a client sent under the same
    // names is overwritten here, where the ticket has just been checked.
    const headers = new Headers(request.headers);
    headers.set(ROOM_HEADER, target);
    headers.set(TICKET_HEADER, JSON.stringify(ticket));
    headers.set(SPAWN_HEADER, `${url.searchParams.get("x") ?? ""},${url.searchParams.get("y") ?? ""}`);
    headers.set(COUNTRY_HEADER, String((request.cf?.country as string | undefined) ?? ""));

    return env.ROOM.getByName(target).fetch(new Request(request.url, { headers }));
  },
} satisfies ExportedHandler<Env>;
