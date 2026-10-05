import { realtime, requireOffice } from "./access";
import { requireAdmin } from "./admin";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { countryOf, requireUser, type User } from "./session";

/**
 * Help and feedback (docs/19): a conversation with the TinyFloor team, kept
 * in D1 and read by asking, so it needs nothing live. An office has one,
 * shared by everyone in it; in the demo office, where strangers mix, each
 * person has their own. Whoever has taken part is told about anything new
 * since they last looked. Everything said to the team goes to its Discord,
 * and the admin view answers it.
 */

const LOBBY_PLACE = "Demo office";
const TEAM_NAME = "TinyFloor team";
const MAX_BODY = 4000;
/** Plenty for a conversation; not enough to flood the team. */
const MESSAGES_PER_HOUR = 30;
/** What a conversation shows: its latest messages. */
const SHOWN = 100;
const PAGE = 30;
const HOUR_MS = 60 * 60 * 1000;

/** Which conversation: an office's, or this person's in the demo office. */
interface Where {
  officeId: string | null;
  place: string;
}

interface MessageRow {
  id: number;
  thread_id: string;
  from_team: number;
  user_id: string | null;
  name: string;
  body: string;
  created_at: number;
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

/** An office you're in, named by the request; the demo office when none is. */
async function whereOf(env: Env, user: User, office: unknown): Promise<Where> {
  if (typeof office !== "string" || !office) return { officeId: null, place: LOBBY_PLACE };
  const found = await requireOffice(env, office, user.id);
  return { officeId: found.id, place: found.name };
}

function findThread(env: Env, user: User, where: Where) {
  return (
    where.officeId
      ? env.DB.prepare("SELECT id FROM help_threads WHERE office_id = ?").bind(where.officeId)
      : env.DB.prepare("SELECT id FROM help_threads WHERE user_id = ? AND office_id IS NULL").bind(user.id)
  ).first<{ id: string }>();
}

/** The conversation as one person sees it: its latest messages, and how many came since they last looked. */
async function view(env: Env, threadId: string | undefined, userId: string) {
  if (!threadId) return { messages: [], unread: 0 };
  const [rows, unread] = await env.DB.batch([
    env.DB.prepare(
      `SELECT * FROM (SELECT id, from_team, user_id, name, body, created_at FROM help_messages
         WHERE thread_id = ? ORDER BY id DESC LIMIT ${SHOWN}) ORDER BY id`,
    ).bind(threadId),
    // Only someone who has taken part has a place they read to; anyone else isn't told.
    env.DB.prepare(
      `SELECT COUNT(*) AS unread FROM help_messages m JOIN help_reads r ON r.thread_id = m.thread_id AND r.user_id = ?2
        WHERE m.thread_id = ?1 AND m.id > r.seen_id AND m.user_id IS NOT ?2`,
    ).bind(threadId, userId),
  ]);
  return {
    messages: (rows.results as unknown as MessageRow[]).map((row) => ({
      id: row.id,
      mine: row.user_id === userId,
      team: row.from_team === 1,
      name: row.name,
      body: row.body,
      at: row.created_at,
    })),
    unread: (unread.results[0] as { unread: number }).unread,
  };
}

/** Read to the latest message: this person has taken part, or looked. */
const markRead = (env: Env, threadId: string, userId: string) =>
  env.DB.prepare(
    `INSERT INTO help_reads (thread_id, user_id, seen_id)
     SELECT ?1, ?2, COALESCE(MAX(id), 0) FROM help_messages WHERE thread_id = ?1
     ON CONFLICT (thread_id, user_id) DO UPDATE SET seen_id = excluded.seen_id`,
  ).bind(threadId, userId);

export function helpRoutes(router: Router): void {
  router
    .add("GET", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const where = await whereOf(env, user, new URL(request.url).searchParams.get("office"));
      const thread = await findThread(env, user, where);
      return json(await view(env, thread?.id, user.id), { headers: { "Cache-Control": "no-store" } });
    })

    // Said to the team. The first message starts the conversation.
    .add("POST", "/v1/help", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const input = await readJson(request);
      const body = cleanBody(input.body);
      if (!body) throw new HttpError(400, "empty_message", "Say what happened");
      const where = await whereOf(env, user, input.office);

      const now = Date.now();
      const lastHour = await env.DB.prepare("SELECT COUNT(*) AS sent FROM help_messages WHERE user_id = ? AND created_at > ?")
        .bind(user.id, now - HOUR_MS)
        .first<{ sent: number }>();
      if ((lastHour?.sent ?? 0) >= MESSAGES_PER_HOUR) throw new HttpError(429, "slow_down", "Slow down a little");

      // Two people in an office can start it at once: the first one in makes it, both land in it.
      const started = await env.DB.prepare(
        `INSERT INTO help_threads (id, office_id, user_id, place, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5) ON CONFLICT DO NOTHING`,
      )
        .bind(crypto.randomUUID(), where.officeId, where.officeId ? null : user.id, where.place, now)
        .run();
      const thread = (await findThread(env, user, where))!;

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO help_messages (thread_id, user_id, name, email, body, page, locale, user_agent, screen, country, replay, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
        ).bind(
          thread.id,
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
        ),
        env.DB.prepare("UPDATE help_threads SET status = 'open', updated_at = ? WHERE id = ?").bind(now, thread.id),
        markRead(env, thread.id, user.id),
      ]);

      const cf = request.cf as { city?: string; region?: string; country?: string } | undefined;
      const site = (env.SITE_ORIGINS ?? "").split(",")[0]?.trim();
      ctx.waitUntil(
        realtime(env)
          .helpMessage({
            place: where.place,
            name: user.displayName,
            body,
            first: (started.meta.changes ?? 0) > 0,
            ...(site ? { link: `${site}/admin` } : {}),
            where: { city: cf?.city, region: cf?.region, country: cf?.country },
          })
          .catch(() => undefined),
      );
      return json(await view(env, thread.id, user.id), { status: 201 });
    })

    // The conversation was on screen: nothing in it is new any more.
    .add("POST", "/v1/help/read", async ({ request, env, ctx }) => {
      const user = await requireUser(env, request, ctx);
      const thread = await findThread(env, user, await whereOf(env, user, (await readJson(request)).office));
      if (thread) await markRead(env, thread.id, user.id).run();
      return json({ ok: true });
    })

    // The admin view: conversations, the latest first; or only those waiting on the team.
    .add("GET", "/v1/admin/help", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const onlyWaiting = url.searchParams.get("show") !== "all" ? 1 : 0;
      const page = Math.max(0, Math.floor(Number(url.searchParams.get("page")) || 0));
      const waiting = `(t.status = 'open' AND (SELECT m.from_team FROM help_messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) = 0)`;
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT t.id, t.office_id AS officeId, t.place, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt, ${waiting} AS waiting
             FROM help_threads t WHERE ?1 = 0 OR ${waiting}
            ORDER BY t.updated_at DESC LIMIT ?2 OFFSET ?3`,
        ).bind(onlyWaiting, PAGE, page * PAGE),
        env.DB.prepare(`SELECT COUNT(*) AS total FROM help_threads t WHERE ?1 = 0 OR ${waiting}`).bind(onlyWaiting),
      ]);
      const threads = rows.results as Array<{ id: string; waiting: number } & Record<string, unknown>>;
      const messages = new Map<string, unknown[]>(threads.map((one) => [one.id, []]));
      if (threads.length) {
        const { results } = await env.DB.prepare(
          `SELECT id, thread_id AS threadId, from_team AS team, user_id AS userId, name, email, body, page, locale,
                  user_agent AS userAgent, screen, country, replay, created_at AS at
             FROM help_messages WHERE thread_id IN (${threads.map(() => "?").join(", ")}) ORDER BY id`,
        )
          .bind(...threads.map((one) => one.id))
          .all<{ threadId: string; team: number } & Record<string, unknown>>();
        for (const { threadId, ...row } of results) messages.get(threadId)?.push({ ...row, team: row.team === 1 });
      }
      return json({
        threads: threads.map((one) => ({ ...one, waiting: one.waiting === 1, messages: messages.get(one.id) })),
        page,
        pageSize: PAGE,
        total: (total.results[0] as { total: number }).total,
      });
    })

    // The team's answer, which everyone in the conversation is told about.
    .add("POST", "/v1/admin/help/:id/messages", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const body = cleanBody((await readJson(request)).body);
      if (!body) throw new HttpError(400, "empty_message", "Write a reply");
      const now = Date.now();
      const [, updated] = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO help_messages (thread_id, from_team, name, body, created_at) SELECT id, 1, ?2, ?3, ?4 FROM help_threads WHERE id = ?1",
        ).bind(params.id, TEAM_NAME, body, now),
        env.DB.prepare("UPDATE help_threads SET updated_at = ? WHERE id = ?").bind(now, params.id),
      ]);
      if (!updated.meta.changes) throw new HttpError(404, "no_thread", "No such conversation");
      return json({ ok: true });
    })

    // Dealt with, or not after all.
    .add("PATCH", "/v1/admin/help/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const { status } = await readJson(request);
      if (status !== "open" && status !== "done") throw new HttpError(400, "bad_status", "Open or done");
      const done = await env.DB.prepare("UPDATE help_threads SET status = ? WHERE id = ?").bind(status, params.id).run();
      if (!done.meta.changes) throw new HttpError(404, "no_thread", "No such conversation");
      return json({ ok: true });
    });
}
