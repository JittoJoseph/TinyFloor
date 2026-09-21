import { LOBBY_CHAT, LOBBY_ROOM, verifyTicket } from "../../shared-protocol/src";
import { COUNTRY_HEADER, ROOM_HEADER, SPAWN_HEADER, TICKET_HEADER } from "./headers";
import { Room } from "./room";
import { Chat } from "./chat";
import { placeInLobby } from "./lobby";
import { RealtimeAdmin } from "./admin";

export { Room, Chat, RealtimeAdmin };

/** `/lobby` for the public lobby, `/rooms/:room` for an office floor. */
const ROOM_PATH = /^\/(?:rooms\/([a-z0-9-]{1,64})|lobby)$/;
/** `/offices/:id/chat` for an office's own chat, `/lobby/chat` for the lobby's one chat. */
const CHAT_PATH = /^\/(?:offices\/([a-z0-9-]{1,64})|lobby)\/chat$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ service: "tinyfloor-realtime", ok: true });
    }

    const chat = url.pathname.match(CHAT_PATH);
    const match = chat ? null : url.pathname.match(ROOM_PATH);
    if (!chat && !match) return new Response("Not found", { status: 404 });
    // Every copy of the lobby shares one chat, so its name is fixed.
    const chatName = chat ? (chat[1] ?? LOBBY_CHAT) : null;
    const room = chatName ? `chat:${chatName}` : (match![1] ?? LOBBY_ROOM);

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

    if (chatName) {
      const headers = new Headers(request.headers);
      headers.set(TICKET_HEADER, JSON.stringify(ticket));
      return env.CHAT.getByName(chatName).fetch(new Request(request.url, { headers }));
    }

    // Lobby tickets name the lobby; the first copy with space takes them.
    const target = room === LOBBY_ROOM ? await placeInLobby(env) : room;

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
