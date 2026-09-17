import { devTicket } from "./dev-ticket";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/v1/health") {
      const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return Response.json({ service: "tinyfloor-api", ok: true, database: database?.ok === 1 });
    }

    if (url.pathname === "/v1/dev/ticket") {
      const response = await devTicket(request, env);
      if (response) return response;
    }

    return Response.json(
      { error: { code: "not_found", message: "No such endpoint" } },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<Env>;
