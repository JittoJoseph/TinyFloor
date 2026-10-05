import { realtime, requireOffice } from "./access";
import { requireAdmin } from "./admin";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { countryOf, requireUser, type User } from "./session";

/**
 * Help and feedback (docs/19): a ticket with the TinyFloor team. An office has
 * at most one open, which everyone in it can follow and add to in Chat; a
 * demo office visitor has their own. Writing while none is open opens one.
 * Once the team closes it, it's gone from Chat and the next message starts
 * a new one. It all lives in D1 and is read by asking. What people write goes
 * to the team's Discord; the admin view answers and closes tickets.
 */

const LOBBY_PLACE = "Demo office";
const TEAM_NAME = "TinyFloor";
const MAX_BODY = 4000;
/** Plenty for a conversation; not enough to flood the team. */
const MESSAGES_PER_HOUR = 30;
/** What a ticket shows: its latest messages. */
const SHOWN = 200;
const PAGE = 30;
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

interface TicketRow {
  id: string;
  office_id: string | null;
  lobby: number;
  user_id: string | null;
  status: "open" | "closed";
}

/** What someone typed: trimmed, without control characters other than line breaks and tabs. */
function cleanBody(value: unknown): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, MAX_BODY);
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

/** The open ticket where someone is (?1 the person, ?2 the office or null): their office's, or their own in the demo office. */
const openHere = (t = "") =>
  `${t}status = 'open' AND CASE WHEN ?2 IS NULL THEN ${t}lobby = 1 AND ${t}user_id = ?1 ELSE ${t}lobby = 0 AND ${t}office_id = ?2 END`;

/** A ticket this person can see: one from an office they're in, or their own from the demo office. */
async function ticketFor(env: Env, user: User, id: string): Promise<TicketRow> {
  const ticket = await env.DB.prepare("SELECT id, office_id, lobby, user_id, status FROM help_tickets WHERE id = ?").bind(id).first<TicketRow>();
  if (!ticket || (ticket.lobby ? ticket.user_id !== user.id : !ticket.office_id)) throw new HttpError(404, "no_ticket", "No such ticket");
  if (!ticket.lobby) await requireOffice(env, ticket.office_id!, user.id);
  return ticket;
}

/** An open ticket, for the team to answer or close. */
async function openTicket(env: Env, id: string) {
  const ticket = await env.DB.prepare("SELECT office_id, lobby, user_id FROM help_tickets WHERE id = ? AND status = 'open'")
    .bind(id)
    .first<{ office_id: string | null; lobby: number; user_id: string | null }>();
  if (!ticket) throw new HttpError(404, "no_ticket", "No such open ticket");
  return ticket;
}

/** Read to the latest message: this person has the ticket on screen, or just wrote in it. */
const markRead = (env: Env, ticketId: string, userId: string) =>
  env.DB.prepare(
    `INSERT INTO help_reads (ticket_id, user_id, seen_id)
     SELECT ?1, ?2, COALESCE(MAX(id), 0) FROM help_messages WHERE ticket_id = ?1
     ON CONFLICT (ticket_id, user_id) DO UPDATE SET seen_id = excluded.seen_id`,
  ).bind(ticketId, userId);

/** Where a ticket is followed is told it changed, so counts there turn up at once (after the response). */
function changed(env: Env, ctx: ExecutionContext, ticket: { office_id: string | null; lobby: number; user_id: string | null }) {
  const place = ticket.lobby ? (ticket.user_id ? { visitor: ticket.user_id } : null) : ticket.office_id ? { officeId: ticket.office_id } : null;
  if (place) ctx.waitUntil(realtime(env).helpChanged(place).catch(() => undefined));
}

/** A ticket's messages, oldest first, the way both sides show them. */
async function messagesOf(env: Env, ticketId: string, userId?: string) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM (SELECT id, from_team, user_id, name, body, created_at FROM help_messages
       WHERE ticket_id = ? ORDER BY id DESC LIMIT ${SHOWN}) ORDER BY id`,
  )
    .bind(ticketId)
    .all<{ id: number; from_team: number; user_id: string | null; name: string; body: string; created_at: number }>();
  return results.map((row) => ({
    id: row.id,
    author: row.user_id,
    mine: !!userId && row.user_id === userId,
    team: row.from_team === 1,
    name: row.name,
    body: row.body,
    at: row.created_at,
  }));
}

export function helpRoutes(router: Router): void {
  router
    // The open ticket where you are (?office= for an office), with what's new in it since you last looked.
    .add("GET", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const office = new URL(request.url).searchParams.get("office");
      const officeId = office ? (await requireOffice(env, office, user.id)).id : null;
      const ticket = await env.DB.prepare(
        `SELECT t.id, (SELECT COUNT(*) FROM help_messages m WHERE m.ticket_id = t.id AND m.id > r.seen_id AND m.user_id IS NOT ?1) AS unread
           FROM help_tickets t LEFT JOIN help_reads r ON r.ticket_id = t.id AND r.user_id = ?1
          WHERE ${openHere("t.")}`,
      )
        .bind(user.id, officeId)
        .first<{ id: string; unread: number }>();
      return json({ ticket: ticket ?? null }, NO_STORE);
    })

    // Said to the team: added to the open ticket where you are, or the first message of a new one.
    .add("POST", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const input = await readJson(request);
      const body = cleanBody(input.body);
      if (!body) throw new HttpError(400, "empty_message", "Say what happened");
      const office = typeof input.office === "string" && input.office ? await requireOffice(env, input.office, user.id) : null;

      const now = Date.now();
      const lastHour = await env.DB.prepare("SELECT COUNT(*) AS sent FROM help_messages WHERE user_id = ? AND created_at > ?")
        .bind(user.id, now - 60 * 60 * 1000)
        .first<{ sent: number }>();
      if ((lastHour?.sent ?? 0) >= MESSAGES_PER_HOUR) throw new HttpError(429, "slow_down", "Slow down a little");

      // Only one can be open (the indexes make sure), so two people writing at once land in the same one.
      const place = office?.name ?? LOBBY_PLACE;
      const opened = await env.DB.prepare(
        `INSERT INTO help_tickets (id, office_id, lobby, user_id, name, email, place, page, user_agent, screen, locale, country, replay, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14) ON CONFLICT DO NOTHING`,
      )
        .bind(
          crypto.randomUUID(),
          office?.id ?? null,
          office ? 0 : 1,
          user.id,
          user.displayName,
          user.email,
          place,
          note(input.page),
          note(request.headers.get("User-Agent")),
          note(input.screen, 40),
          note(input.locale, 20),
          countryOf(request),
          replayLink(input.replay),
          now,
        )
        .run();
      const { id } = (await env.DB.prepare(`SELECT id FROM help_tickets WHERE ${openHere()}`).bind(user.id, office?.id ?? null).first<{ id: string }>())!;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO help_messages (ticket_id, user_id, name, body, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, user.id, user.displayName, body, now),
        env.DB.prepare("UPDATE help_tickets SET updated_at = ? WHERE id = ?").bind(now, id),
        markRead(env, id, user.id),
      ]);

      if (office) changed(env, ctx, { office_id: office.id, lobby: 0, user_id: user.id });

      const cf = request.cf as { city?: string; region?: string; country?: string } | undefined;
      const site = (env.SITE_ORIGINS ?? "").split(",")[0]?.trim();
      ctx.waitUntil(
        realtime(env)
          .helpMessage({
            place,
            name: user.displayName,
            body,
            first: (opened.meta.changes ?? 0) > 0,
            ...(site ? { link: `${site}/admin` } : {}),
            where: { city: cf?.city, region: cf?.region, country: cf?.country },
          })
          .catch(() => undefined),
      );
      return json({ id }, { status: 201 });
    })

    // A ticket on screen. Reading it is what makes it read.
    .add("GET", "/v1/help/:id", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const ticket = await ticketFor(env, user, params.id);
      const [messages] = await Promise.all([messagesOf(env, ticket.id, user.id), markRead(env, ticket.id, user.id).run()]);
      return json({ id: ticket.id, status: ticket.status, messages }, NO_STORE);
    })

    // The admin view: open or closed tickets, the latest first, with how much the team hasn't read.
    .add("GET", "/v1/admin/help", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const status = url.searchParams.get("status") === "closed" ? "closed" : "open";
      const page = Math.max(0, Math.floor(Number(url.searchParams.get("page")) || 0));
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT t.id, t.place, t.office_id AS officeId, t.lobby, t.name, t.created_at AS createdAt, t.updated_at AS updatedAt,
                  t.closed_at AS closedAt,
                  (SELECT COUNT(*) FROM help_messages m WHERE m.ticket_id = t.id AND m.from_team = 0 AND m.id > t.team_seen_id) AS unread,
                  (SELECT m.body FROM help_messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last
             FROM help_tickets t WHERE t.status = ?1
            ORDER BY t.updated_at DESC LIMIT ?2 OFFSET ?3`,
        ).bind(status, PAGE, page * PAGE),
        env.DB.prepare("SELECT COUNT(*) AS total FROM help_tickets WHERE status = ?").bind(status),
      ]);
      return json(
        {
          tickets: (rows.results as Array<{ lobby: number; last: string | null } & Record<string, unknown>>).map((row) => ({
            ...row,
            lobby: row.lobby === 1,
            last: (row.last ?? "").slice(0, 140),
          })),
          page,
          pageSize: PAGE,
          total: (total.results[0] as { total: number }).total,
        },
        NO_STORE,
      );
    })

    // One ticket in full: who opened it, from where, and everything said. Opening it is reading it.
    .add("GET", "/v1/admin/help/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const ticket = await env.DB.prepare(
        `SELECT id, place, office_id AS officeId, lobby, user_id AS userId, name, email, page, user_agent AS userAgent, screen,
                locale, country, replay, status, created_at AS createdAt, closed_at AS closedAt
           FROM help_tickets WHERE id = ?`,
      )
        .bind(params.id)
        .first();
      if (!ticket) throw new HttpError(404, "no_ticket", "No such ticket");
      const messages = await messagesOf(env, params.id);
      if (messages.length) {
        await env.DB.prepare("UPDATE help_tickets SET team_seen_id = ? WHERE id = ?").bind(messages.at(-1)!.id, params.id).run();
      }
      return json({ ticket: { ...ticket, lobby: ticket.lobby === 1 }, messages }, NO_STORE);
    })

    // The team's answer, which everyone following the ticket is told about.
    .add("POST", "/v1/admin/help/:id/messages", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const body = cleanBody((await readJson(request)).body);
      if (!body) throw new HttpError(400, "empty_message", "Write a reply");
      const ticket = await openTicket(env, params.id);
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO help_messages (ticket_id, from_team, name, body, created_at) VALUES (?, 1, ?, ?, ?)").bind(params.id, TEAM_NAME, body, now),
        env.DB.prepare(
          "UPDATE help_tickets SET updated_at = ?1, team_seen_id = (SELECT MAX(id) FROM help_messages WHERE ticket_id = ?2) WHERE id = ?2",
        ).bind(now, params.id),
      ]);
      changed(env, ctx, ticket);
      return json({ ok: true });
    })

    // Dealt with: it leaves their Chat, and their next message opens a new one.
    .add("POST", "/v1/admin/help/:id/close", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const ticket = await openTicket(env, params.id);
      const now = Date.now();
      await env.DB.prepare("UPDATE help_tickets SET status = 'closed', closed_at = ?1, updated_at = ?1 WHERE id = ?2").bind(now, params.id).run();
      changed(env, ctx, ticket);
      return json({ ok: true });
    });
}
