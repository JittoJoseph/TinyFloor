import { Room } from "./room";
import { LobbyRouter } from "./lobby-router";

export { Room, LobbyRouter };

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ service: "tinyfloor-realtime", ok: true });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
