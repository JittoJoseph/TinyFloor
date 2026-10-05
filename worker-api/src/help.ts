import { realtime, requireOffice } from "./access";
import { requireAdmin } from "./admin";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { countryOf, requireUser, type User } from "./session";

/**
 * Help and feedback (docs/19): tickets. Someone tells the team about an issue
 * from the rail; it becomes a conversation in their Chat, which everyone in
 * the office can follow and add to, until the team closes it. In the demo
 * office, where strangers mix, a ticket is its opener's alone. It all lives
 * in D1 and is read by asking, so it needs nothing live. What people say goes
 * to the team's Discord, and the admin view answers it, office by office.
 */

const LOBBY_PLACE = "Demo office";
const TEAM_NAME = "TinyFloor";
const MAX_BODY = 4000;
const MAX_TITLE = 80;
/** Plenty for a conversation; not enough to flood the team. */
const MESSAGES_PER_HOUR = 30;
/** What a ticket shows: its latest messages. */
const SHOWN = 200;

interface TicketRow {
  id: string;
  office_id: string | null;
  user_id: string | null;
  lobby: number;
  place: string;
  title: string;
  status: "open" | "closed";
  created_at: number;
  updated_at: number;
}

/** What someone typed: trimmed, without control characters other than line breaks and tabs. */
function cleanBody(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, MAX_BODY);
}

/** A ticket's name: the first line of what was said, cut at a word. */
function titleOf(body: string): string {
  const line = body.split("\n")[0]!.trim();
  if (line.length <= MAX_TITLE) return line;
  const cut = line.slice(0, MAX_TITLE - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

/** A short piece of context from the browser, or nothing. */
function note(value: unknown, max = 300): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

/** Only PostHog's own links are kept, so the admin view never links anywhere else. */
function replayLink(value: unknown): string | null {
  const link = note(value, 500);
  if (!link) return null;
  try {
    const url = new URL(link);
    return url.protocol === "https:" && /(^|\.)posthog\.com$/.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** A ticket this person can see: one opened in an office they're in, or their own in the demo office. */
async function ticketFor(env: Env, user: User, id: string): Promise<TicketRow> {
  const ticket = await env.DB.prepare("SELECT * FROM help_tickets WHERE id = ?").bind(id).first<TicketRow>();
  if (!ticket) throw new HttpError(404, "no_ticket", "No such ticket");
  if (ticket.lobby ? ticket.user_id !== user.id : !ticket.office_id) throw new HttpError(404, "no_ticket", "No such ticket");
  if (!ticket.lobby) await requireOffice(env, ticket.office_id!, user.id);
  return ticket;
}

/**
 * The tickets someone sees in Chat: every open one where they are, and a
 * closed one until they have read the last of it. What came since they last
 * looked counts once they have opened a ticket; nobody else is told.
 */
async function ticketsFor(env: Env, user: User, officeId: string | null) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM (
       SELECT t.id, t.title, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
              (SELECT COUNT(*) FROM help_messages m WHERE m.ticket_id = t.id AND m.id > r.seen_id AND m.user_id IS NOT ?1) AS unread
         FROM help_tickets t LEFT JOIN help_reads r ON r.ticket_id = t.id AND r.user_id = ?1
        WHERE CASE WHEN ?2 IS NULL THEN t.lobby = 1 AND t.user_id = ?1 ELSE t.lobby = 0 AND t.office_id = ?2 END
     ) WHERE status = 'open' OR unread > 0
     ORDER BY updatedAt DESC LIMIT 50`,
  )
    .bind(user.id, officeId)
    .all<{ id: string; unread: number }>();
  return results;
}

/** One ticket, as someone in it sees it: its latest messages. */
async function ticketView(env: Env, ticket: TicketRow, userId: string) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT id, from_team, user_id, name, body, created_at FROM help_messages
       WHERE ticket_id = ? ORDER BY id DESC LIMIT ${SHOWN}) ORDER BY id`,
  )
    .bind(ticket.id)
    .all<{ id: number; from_team: number; user_id: string | null; name: string; body: string; created_at: number }>();
  return {
    ticket: { id: ticket.id, title: ticket.title, status: ticket.status, createdAt: ticket.created_at },
    messages: results.map((row) => ({
      id: row.id,
      author: row.from_team ? null : row.user_id,
      mine: row.user_id === userId,
      team: row.from_team === 1,
      name: row.name,
      body: row.body,
      at: row.created_at,
    })),
  };
}

/** Read to the latest message: this person has opened it, or written in it. */
const markRead = (env: Env, ticketId: string, userId: string) =>
  env.DB.prepare(
    `INSERT INTO help_reads (ticket_id, user_id, seen_id)
     SELECT ?1, ?2, COALESCE(MAX(id), 0) FROM help_messages WHERE ticket_id = ?1
     ON CONFLICT (ticket_id, user_id) DO UPDATE SET seen_id = excluded.seen_id`,
  ).bind(ticketId, userId);

/** Who wrote, from where: kept with each message for the admin view. */
function sayIn(env: Env, request: Request, user: User, ticketId: string, body: string, input: Record<string, unknown>, now: number) {
  return env.DB.prepare(
    `INSERT INTO help_messages (ticket_id, user_id, name, email, body, page, locale, user_agent, screen, country, replay, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  ).bind(
    ticketId,
    user.id,
    user.displayName,
    user.email,
    body,
    note(input.page),
    note(input.locale, 20),
    note(request.headers.get("User-Agent")),
    note(input.screen, 40),
    countryOf(request),
    replayLink(input.replay),
    now,
  );
}

async function slowDown(env: Env, user: User, now: number) {
  const lastHour = await env.DB.prepare("SELECT COUNT(*) AS sent FROM help_messages WHERE user_id = ? AND created_at > ?")
    .bind(user.id, now - 60 * 60 * 1000)
    .first<{ sent: number }>();
  if ((lastHour?.sent ?? 0) >= MESSAGES_PER_HOUR) throw new HttpError(429, "slow_down", "Slow down a little");
}

/** The team's Discord hears it, through the realtime worker's webhook, after the response. */
function tellTheTeam(env: Env, request: Request, ctx: ExecutionContext, user: User, place: string, body: string, first: boolean) {
  const cf = request.cf as { city?: string; region?: string; country?: string } | undefined;
  const site = (env.SITE_ORIGINS ?? "").split(",")[0]?.trim();
  ctx.waitUntil(
    realtime(env)
      .helpMessage({
        place,
        name: user.displayName,
        body,
        first,
        ...(site ? { link: `${site}/admin` } : {}),
        where: { city: cf?.city, region: cf?.region, country: cf?.country },
      })
      .catch(() => undefined),
  );
}

/**
 * The admin view's places: an office (all its tickets), a demo office
 * visitor (theirs), or a ticket whose office has since closed.
 */
const PLACE_KEY = `CASE WHEN t.lobby = 1 THEN 'visitor:' || COALESCE(t.user_id, t.id)
                        WHEN t.office_id IS NOT NULL THEN 'office:' || t.office_id
                        ELSE 'ticket:' || t.id END`;

function placeWhere(key: string): { sql: string; value: string } {
  const [kind, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  if (!id) throw new HttpError(400, "bad_place", "No such place");
  if (kind === "office") return { sql: "t.lobby = 0 AND t.office_id = ?1", value: id };
  if (kind === "visitor") return { sql: "t.lobby = 1 AND (t.user_id = ?1 OR (t.user_id IS NULL AND t.id = ?1))", value: id };
  if (kind === "ticket") return { sql: "t.id = ?1", value: id };
  throw new HttpError(400, "bad_place", "No such place");
}

/** Messages the team hasn't read, from the people writing in. */
const TEAM_UNREAD = `(SELECT COUNT(*) FROM help_messages m WHERE m.ticket_id = t.id AND m.from_team = 0 AND m.id > t.team_seen_id)`;

export function helpRoutes(router: Router): void {
  router
    // The tickets in Chat, where you are: an office (?office=) or the demo office.
    .add("GET", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const office = new URL(request.url).searchParams.get("office");
      const officeId = office ? (await requireOffice(env, office, user.id)).id : null;
      return json({ tickets: await ticketsFor(env, user, officeId) }, { headers: { "Cache-Control": "no-store" } });
    })

    // A new issue: a ticket, with what was said as its first message.
    .add("POST", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const input = await readJson(request);
      const body = cleanBody(input.body);
      if (!body) throw new HttpError(400, "empty_message", "Say what happened");
      const office = typeof input.office === "string" && input.office ? await requireOffice(env, input.office, user.id) : null;
      const now = Date.now();
      await slowDown(env, user, now);

      const id = crypto.randomUUID();
      const place = office?.name ?? LOBBY_PLACE;
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO help_tickets (id, office_id, user_id, lobby, place, title, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
        ).bind(id, office?.id ?? null, user.id, office ? 0 : 1, place, titleOf(body), now),
        sayIn(env, request, user, id, body, input, now),
        markRead(env, id, user.id),
      ]);
      tellTheTeam(env, request, ctx, user, place, body, true);
      return json({ id, tickets: await ticketsFor(env, user, office?.id ?? null) }, { status: 201 });
    })

    .add("GET", "/v1/help/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const ticket = await ticketFor(env, user, params.id);
      return json(await ticketView(env, ticket, user.id), { headers: { "Cache-Control": "no-store" } });
    })

    // More on an open ticket, from anyone who can see it.
    .add("POST", "/v1/help/:id/messages", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const input = await readJson(request);
      const body = cleanBody(input.body);
      if (!body) throw new HttpError(400, "empty_message", "Say what happened");
      const ticket = await ticketFor(env, user, params.id);
      if (ticket.status !== "open") throw new HttpError(409, "ticket_closed", "This one is closed");
      const now = Date.now();
      await slowDown(env, user, now);
      await env.DB.batch([
        sayIn(env, request, user, ticket.id, body, input, now),
        env.DB.prepare("UPDATE help_tickets SET updated_at = ? WHERE id = ?").bind(now, ticket.id),
        markRead(env, ticket.id, user.id),
      ]);
      tellTheTeam(env, request, ctx, user, ticket.place, body, false);
      return json(await ticketView(env, ticket, user.id), { status: 201 });
    })

    // The ticket was on screen: nothing in it is new any more.
    .add("POST", "/v1/help/:id/read", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const ticket = await ticketFor(env, user, params.id);
      await markRead(env, ticket.id, user.id).run();
      return json({ ok: true });
    })

    // The admin view: every place with tickets, those with something unread first.
    .add("GET", "/v1/admin/help", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const { results } = await env.DB.prepare(
        `SELECT ${PLACE_KEY} AS key, MAX(t.place) AS place, MAX(t.office_id) AS officeId, MAX(t.lobby) AS lobby,
                MAX(CASE WHEN t.lobby = 1 THEN
                  (SELECT m.name FROM help_messages m WHERE m.ticket_id = t.id AND m.from_team = 0 ORDER BY m.id LIMIT 1) END) AS visitor,
                SUM(t.status = 'open') AS open, COUNT(*) AS tickets, SUM(${TEAM_UNREAD}) AS unread, MAX(t.updated_at) AS lastAt
           FROM help_tickets t GROUP BY key
          ORDER BY unread > 0 DESC, lastAt DESC LIMIT 200`,
      ).all();
      return json({ places: results.map((row) => ({ ...row, lobby: row.lobby === 1 })) }, { headers: { "Cache-Control": "no-store" } });
    })

    // One place's tickets, open ones first, with every message and where it came from.
    .add("GET", "/v1/admin/help/place", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const where = placeWhere(new URL(request.url).searchParams.get("key") ?? "");
      const { results: tickets } = await env.DB.prepare(
        `SELECT t.id, t.title, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt, t.closed_at AS closedAt,
                t.team_seen_id AS seenId, ${TEAM_UNREAD} AS unread
           FROM help_tickets t WHERE ${where.sql}
          ORDER BY t.status = 'open' DESC, t.updated_at DESC LIMIT 50`,
      )
        .bind(where.value)
        .all<{ id: string } & Record<string, unknown>>();
      const messages = new Map<string, unknown[]>(tickets.map((one) => [one.id, []]));
      if (tickets.length) {
        const { results } = await env.DB.prepare(
          `SELECT id, ticket_id AS ticketId, from_team AS team, user_id AS userId, name, email, body, page, locale,
                  user_agent AS userAgent, screen, country, replay, created_at AS at
             FROM help_messages WHERE ticket_id IN (${tickets.map(() => "?").join(", ")}) ORDER BY id`,
        )
          .bind(...tickets.map((one) => one.id))
          .all<{ ticketId: string; team: number } & Record<string, unknown>>();
        for (const { ticketId, ...row } of results) messages.get(ticketId)?.push({ ...row, team: row.team === 1 });
      }
      return json({ tickets: tickets.map((one) => ({ ...one, messages: messages.get(one.id) })) }, { headers: { "Cache-Control": "no-store" } });
    })

    // The team has looked at a place: nothing in it is unread.
    .add("POST", "/v1/admin/help/read", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const where = placeWhere(String((await readJson(request)).key ?? ""));
      await env.DB.prepare(
        `UPDATE help_tickets AS t SET team_seen_id = (SELECT COALESCE(MAX(m.id), 0) FROM help_messages m WHERE m.ticket_id = t.id)
          WHERE ${where.sql}`,
      )
        .bind(where.value)
        .run();
      return json({ ok: true });
    })

    // The team's answer, which everyone following the ticket is told about.
    .add("POST", "/v1/admin/help/:id/messages", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const body = cleanBody((await readJson(request)).body);
      if (!body) throw new HttpError(400, "empty_message", "Write a reply");
      const now = Date.now();
      const [, updated] = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO help_messages (ticket_id, from_team, name, body, created_at) SELECT id, 1, ?2, ?3, ?4 FROM help_tickets WHERE id = ?1",
        ).bind(params.id, TEAM_NAME, body, now),
        env.DB.prepare(
          "UPDATE help_tickets SET updated_at = ?1, team_seen_id = (SELECT MAX(id) FROM help_messages WHERE ticket_id = ?2) WHERE id = ?2",
        ).bind(now, params.id),
      ]);
      if (!updated.meta.changes) throw new HttpError(404, "no_ticket", "No such ticket");
      return json({ ok: true });
    })

    // Closed (it leaves their Chat once they've read the last of it), or opened again.
    .add("PATCH", "/v1/admin/help/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const { status } = await readJson(request);
      if (status !== "open" && status !== "closed") throw new HttpError(400, "bad_status", "Open or closed");
      const now = Date.now();
      const done = await env.DB.prepare("UPDATE help_tickets SET status = ?1, closed_at = ?2, updated_at = ?3 WHERE id = ?4")
        .bind(status, status === "closed" ? now : null, now, params.id)
        .run();
      if (!done.meta.changes) throw new HttpError(404, "no_ticket", "No such ticket");
      return json({ ok: true });
    });
}
