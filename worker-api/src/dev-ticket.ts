import { signTicket, TICKET_LIFETIME_MS, type RoomRole } from "../../shared-protocol/src";

const ROLES: RoomRole[] = ["owner", "admin", "member", "guest"];

/**
 * Hands out room tickets without accounts, for trying rooms out locally before
 * sign-in exists (M3). Only answers when DEV_TICKETS=true is set in .dev.vars
 * and the request is for localhost, so it never works on the live API.
 */
export async function devTicket(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (env.DEV_TICKETS !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
  if (request.method !== "POST") return null;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const room = typeof body.room === "string" && /^[a-z0-9-]{1,64}$/.test(body.room) ? body.room : "dev-room";
  const role = ROLES.includes(body.role as RoomRole) ? (body.role as RoomRole) : "member";
  const sub = typeof body.sub === "string" && body.sub ? body.sub : crypto.randomUUID();

  const ticket = await signTicket(
    {
      v: 1,
      room,
      sub,
      name: typeof body.name === "string" && body.name ? body.name.slice(0, 32) : "Dev",
      character: typeof body.character === "string" && body.character ? body.character : "Adam",
      role,
      cap: typeof body.cap === "number" ? Math.min(Math.max(Math.floor(body.cap), 1), 20) : 20,
      exp: Date.now() + TICKET_LIFETIME_MS,
    },
    env.TICKET_SECRET,
  );
  return Response.json({ ticket, room, sub });
}
