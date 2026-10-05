import { requireAdmin } from "./admin";
import { requireOffice } from "./access";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { countryOf, requireUser } from "./session";

/**
 * Help and feedback (docs/19). Anyone in an office or the demo office can tell
 * the team something from inside the app. It goes to the team, never to the
 * office, and the sender sees their own reports, with the team's replies,
 * until one is closed and they have seen that. The admin view lists them all
 * with where they came from, and answers or closes them.
 */

const LOBBY_PLACE = "Demo office";
const MAX_BODY = 4000;
/** Plenty for anyone with something to say; not enough to fill the inbox. */
const REPORTS_PER_DAY = 10;
const MESSAGES_PER_HOUR = 30;
const PAGE = 30;
const HOUR_MS = 60 * 60 * 1000;

export interface ReportMessage {
  id: number;
  fromTeam: boolean;
  body: string;
  at: number;
}

interface ReportRow {
  id: string;
  status: "open" | "closed";
  place: string;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  seen_at: number;
  replied_at: number | null;
}

interface MessageRow {
  id: number;
  report_id: string;
  from_team: number;
  body: string;
  created_at: number;
}

/** What someone typed: trimmed, with control characters other than line breaks and tabs taken out. */
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

async function messagesOf(env: Env, ids: string[]): Promise<Map<string, ReportMessage[]>> {
  const byReport = new Map<string, ReportMessage[]>(ids.map((id) => [id, []]));
  if (!ids.length) return byReport;
  const { results } = await env.DB.prepare(
    `SELECT id, report_id, from_team, body, created_at FROM report_messages
      WHERE report_id IN (${ids.map(() => "?").join(", ")}) ORDER BY id`,
  )
    .bind(...ids)
    .all<MessageRow>();
  for (const row of results) {
    byReport.get(row.report_id)?.push({ id: row.id, fromTeam: row.from_team === 1, body: row.body, at: row.created_at });
  }
  return byReport;
}

/** News for the sender: a reply, or the report closed, since they last looked. */
const isNews = (row: ReportRow) => (row.replied_at ?? 0) > row.seen_at || (row.closed_at ?? 0) > row.seen_at;

/** The sender's reports: every open one, and a closed one until they have seen it closed. */
async function yours(env: Env, userId: string) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM (
       SELECT r.id, r.status, r.place, r.created_at, r.updated_at, r.closed_at, r.seen_at,
              (SELECT MAX(m.created_at) FROM report_messages m WHERE m.report_id = r.id AND m.from_team = 1) AS replied_at
         FROM reports r WHERE r.user_id = ?1
     ) WHERE status = 'open' OR closed_at > seen_at OR replied_at > seen_at
     ORDER BY updated_at DESC LIMIT 20`,
  )
    .bind(userId)
    .all<ReportRow>();
  const messages = await messagesOf(env, results.map((row) => row.id));
  return {
    reports: results.map((row) => ({
      id: row.id,
      status: row.status,
      place: row.place,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      news: isNews(row),
      messages: messages.get(row.id) ?? [],
    })),
    unseen: results.filter(isNews).length,
  };
}

export function reportRoutes(router: Router): void {
  router
    .add("GET", "/v1/reports", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      return json(await yours(env, user.id), { headers: { "Cache-Control": "no-store" } });
    })

    // Something new, from an office (officeId) or the demo office (none).
    .add("POST", "/v1/reports", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const input = await readJson(request);
      const body = cleanBody(input.body);
      if (!body) throw new HttpError(400, "empty_report", "Say what happened");

      const now = Date.now();
      const today = await env.DB.prepare("SELECT COUNT(*) AS sent FROM reports WHERE user_id = ? AND created_at > ?")
        .bind(user.id, now - 24 * HOUR_MS)
        .first<{ sent: number }>();
      if ((today?.sent ?? 0) >= REPORTS_PER_DAY) throw new HttpError(429, "slow_down", "That's a lot for one day; try again tomorrow");

      let officeId: string | null = null;
      let place = LOBBY_PLACE;
      if (typeof input.officeId === "string" && input.officeId) {
        const office = await requireOffice(env, input.officeId, user.id);
        officeId = office.id;
        place = office.name;
      }

      const id = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO reports (id, user_id, name, email, office_id, place, page, locale, user_agent, screen, country, replay, created_at, updated_at, seen_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?13)`,
        ).bind(
          id,
          user.id,
          user.displayName,
          user.email,
          officeId,
          place,
          note(input.page),
          note(input.locale, 20),
          note(request.headers.get("User-Agent")),
          note(input.screen, 40),
          countryOf(request),
          replayLink(input.replay),
          now,
        ),
        env.DB.prepare("INSERT INTO report_messages (report_id, from_team, body, created_at) VALUES (?, 0, ?, ?)").bind(id, body, now),
      ]);
      return json(await yours(env, user.id), { status: 201 });
    })

    // More from the sender, on one of their open reports.
    .add("POST", "/v1/reports/:id/messages", async ({ request, env, ctx, params }) => {
      const user = await requireUser(env, request, ctx);
      const body = cleanBody((await readJson(request)).body);
      if (!body) throw new HttpError(400, "empty_report", "Say what happened");
      const report = await env.DB.prepare("SELECT status FROM reports WHERE id = ? AND user_id = ?")
        .bind(params.id, user.id)
        .first<{ status: string }>();
      if (!report) throw new HttpError(404, "no_report", "No such report");
      if (report.status !== "open") throw new HttpError(409, "report_closed", "That report is closed");

      const now = Date.now();
      const lastHour = await env.DB.prepare(
        `SELECT COUNT(*) AS sent FROM report_messages m JOIN reports r ON r.id = m.report_id
          WHERE r.user_id = ? AND m.from_team = 0 AND m.created_at > ?`,
      )
        .bind(user.id, now - HOUR_MS)
        .first<{ sent: number }>();
      if ((lastHour?.sent ?? 0) >= MESSAGES_PER_HOUR) throw new HttpError(429, "slow_down", "Slow down a little");

      await env.DB.batch([
        env.DB.prepare("INSERT INTO report_messages (report_id, from_team, body, created_at) VALUES (?, 0, ?, ?)").bind(params.id, body, now),
        env.DB.prepare("UPDATE reports SET updated_at = ?1, seen_at = ?1 WHERE id = ?2").bind(now, params.id),
      ]);
      return json(await yours(env, user.id));
    })

    // The sender opened Help and feedback: what was new isn't any more.
    .add("POST", "/v1/reports/seen", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      await env.DB.prepare("UPDATE reports SET seen_at = ? WHERE user_id = ?").bind(Date.now(), user.id).run();
      return json({ ok: true });
    })

    // The admin view: every report, open or closed, newest activity first.
    .add("GET", "/v1/admin/reports", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const status = url.searchParams.get("status") === "closed" ? "closed" : "open";
      const page = Math.max(0, Math.floor(Number(url.searchParams.get("page")) || 0));
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT r.id, r.user_id AS userId, r.name, r.email, r.office_id AS officeId, r.place, r.status,
                  r.page, r.locale, r.user_agent AS userAgent, r.screen, r.country, r.replay,
                  r.created_at AS createdAt, r.updated_at AS updatedAt, r.closed_at AS closedAt,
                  (SELECT m.from_team FROM report_messages m WHERE m.report_id = r.id ORDER BY m.id DESC LIMIT 1) = 0 AS waiting
             FROM reports r WHERE r.status = ?1
            ORDER BY r.updated_at DESC LIMIT ?2 OFFSET ?3`,
        ).bind(status, PAGE, page * PAGE),
        env.DB.prepare("SELECT COUNT(*) AS total FROM reports WHERE status = ?").bind(status),
      ]);
      const reports = rows.results as Array<{ id: string; waiting: number } & Record<string, unknown>>;
      const messages = await messagesOf(env, reports.map((one) => one.id));
      return json({
        reports: reports.map((one) => ({ ...one, waiting: one.waiting === 1, messages: messages.get(one.id) ?? [] })),
        page,
        pageSize: PAGE,
        total: (total.results[0] as { total: number }).total,
      });
    })

    .add("POST", "/v1/admin/reports/:id/messages", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const body = cleanBody((await readJson(request)).body);
      if (!body) throw new HttpError(400, "empty_reply", "Write a reply");
      const now = Date.now();
      const [, updated] = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO report_messages (report_id, from_team, body, created_at) SELECT id, 1, ?2, ?3 FROM reports WHERE id = ?1",
        ).bind(params.id, body, now),
        env.DB.prepare("UPDATE reports SET updated_at = ? WHERE id = ?").bind(now, params.id),
      ]);
      if (!updated.meta.changes) throw new HttpError(404, "no_report", "No such report");
      return json({ ok: true });
    })

    // Closed, or opened again.
    .add("PATCH", "/v1/admin/reports/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const { status } = await readJson(request);
      if (status !== "open" && status !== "closed") throw new HttpError(400, "bad_status", "Open or closed");
      const now = Date.now();
      const done = await env.DB.prepare("UPDATE reports SET status = ?1, closed_at = ?2, updated_at = ?3 WHERE id = ?4")
        .bind(status, status === "closed" ? now : null, now, params.id)
        .run();
      if (!done.meta.changes) throw new HttpError(404, "no_report", "No such report");
      return json({ ok: true });
    });
}
