import {
  cleanDisplayName,
  DEFAULT_CHARACTER,
  isCharacter,
  LOBBY_COPY_CAPACITY,
  LOBBY_ROOM,
  signTicket,
  TICKET_LIFETIME_MS,
} from "../../shared-protocol/src";
import {
  allowedOrigin,
  assertSafeWrite,
  errorResponse,
  HttpError,
  json,
  preflight,
  readJson,
  withCors,
} from "./http";
import { createGuest, currentUser, endSession, requireUser, type User } from "./session";
import { verifyTurnstile } from "./turnstile";

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") return preflight(origin);

    let response: Response;
    try {
      response = await route(request, env, ctx, origin);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      response = errorResponse(error);
    }
    return withCors(response, origin);
  },
} satisfies ExportedHandler<Env>;

async function route(request: Request, env: Env, ctx: ExecutionContext, origin: string | null): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method !== "GET") assertSafeWrite(request, origin);

  switch (`${request.method} ${pathname}`) {
    case "GET /v1/health": {
      const database = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return json({ service: "tinyfloor-api", ok: true, database: database?.ok === 1 });
    }

    case "GET /v1/session": {
      const user = await currentUser(env, request, ctx);
      return json({ user: user && publicUser(user) });
    }

    case "POST /v1/auth/guest": {
      const body = await readJson(request);
      const name = cleanDisplayName(body.name);
      if (!name) throw new HttpError(400, "name_required", "Pick a name");
      const character = isCharacter(body.character) ? body.character : DEFAULT_CHARACTER;
      await verifyTurnstile(env, request, body.turnstileToken);

      const { user, cookie } = await createGuest(env, request, name, character);
      return json({ user: publicUser(user) }, { status: 201, headers: { "Set-Cookie": cookie } });
    }

    case "POST /v1/auth/logout": {
      const cookie = await endSession(env, request);
      return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
    }

    case "POST /v1/lobby/ticket": {
      const user = await requireUser(env, request, ctx);
      const ticket = await signTicket(
        {
          v: 1,
          room: LOBBY_ROOM,
          sub: user.id,
          name: user.displayName,
          character: user.character,
          role: user.isGuest ? "guest" : "member",
          cap: LOBBY_COPY_CAPACITY,
          exp: Date.now() + TICKET_LIFETIME_MS,
        },
        env.TICKET_SECRET,
      );
      return json({ ticket, url: `${env.REALTIME_URL}/${LOBBY_ROOM}` });
    }
  }

  throw new HttpError(404, "not_found", "No such endpoint");
}

function publicUser(user: User) {
  return { id: user.id, displayName: user.displayName, character: user.character, guest: user.isGuest };
}
