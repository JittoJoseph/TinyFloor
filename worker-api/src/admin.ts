import { cleanDisplayName } from "../../shared-protocol/src";
import { cleanName, realtime } from "./access";
import { givePlan, HOLDS_PLAN, liveSubscription, thisMonth } from "./billing";
import { HttpError, json, readJson } from "./http";
import { closeOffice } from "./offices";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * The admin view: who has signed up and when they were last around, where
 * they come from, every office with its members and plan, and a count of
 * paying offices and meeting hours; and a few things the team can do by hand:
 * rename or delete an account, rename or close an office, give an office a
 * plan without payment, and change or take down any message in the lobby's
 * chat. Help and feedback has its own routes (help.ts). Plans themselves aren't configurable here: they live in code
 * (billing.ts) and in Paddle. Open to the accounts named in ADMIN_EMAILS, and
 * only once Google has vouched for the address, since a password sign-up
 * proves nothing about owning it. Anyone else is told there is nothing here.
 */

const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE = [...HOLDS_PLAN].map((status) => `'${status}'`).join(", ");

export async function requireAdmin(env: Env, request: Request, ctx: ExecutionContext) {
  const user = await requireAccount(env, request, ctx);
  const allowed = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const row = await env.DB.prepare("SELECT email_verified FROM users WHERE id = ?").bind(user.id).first<{ email_verified: number }>();
  if (!user.email || !allowed.includes(user.email) || row?.email_verified !== 1) {
    throw new HttpError(404, "not_found", "No such endpoint");
  }
  return user;
}

/** The viewer's time zone, if it's one the runtime knows; otherwise UTC. */
function zoneOf(value: string | null): string {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

/** A moment's calendar day in a time zone, as YYYY-MM-DD. */
function dayFormat(timeZone: string): (at: number) => string {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return (at) => format.format(at);
}

/** The last `count` calendar days in a time zone, ending today, oldest first. */
function lastDays(now: number, timeZone: string, count: number): string[] {
  const today = Date.parse(`${dayFormat(timeZone)(now)}T00:00:00Z`);
  return Array.from({ length: count }, (_, at) => new Date(today - (count - 1 - at) * DAY_MS).toISOString().slice(0, 10));
}

/** Which page of a list, from 0; anything odd is the first. */
const pageOf = (url: URL) => {
  const page = Number(url.searchParams.get("page"));
  return Number.isSafeInteger(page) && page > 0 ? page : 0;
};

/** A search typed into the list: lower case, and LIKE's wildcards taken literally. */
function searchOf(url: URL) {
  const search = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  return { search, like: `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%` };
}

export function adminRoutes(router: Router): void {
  router
    .add("GET", "/v1/admin/summary", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const now = Date.now();
      const [counts, countries, days] = await env.DB.batch([
        env.DB.prepare(
          `SELECT
             (SELECT COUNT(*) FROM users WHERE is_guest = 0) AS accounts,
             (SELECT COUNT(*) FROM users WHERE is_guest = 1) AS guests,
             (SELECT COUNT(*) FROM offices) AS offices,
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND last_active_at > ?1) AS activeDay,
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND last_active_at > ?2) AS activeWeek,
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND created_at > ?2) AS newWeek,
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND created_at > ?3) AS newMonth,
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND google_sub IS NOT NULL) AS withGoogle,
             (SELECT COUNT(*) FROM help_messages m JOIN help_tickets t ON t.id = m.ticket_id
               WHERE m.from_team = 0 AND m.id > t.team_seen_id) AS helpUnread`,
        ).bind(now - DAY_MS, now - 7 * DAY_MS, now - 30 * DAY_MS),
        env.DB.prepare(
          `SELECT country, COUNT(*) AS people FROM users
            WHERE country IS NOT NULL GROUP BY country ORDER BY people DESC LIMIT 20`,
        ),
        // A day's margin either side, so every calendar day in any time zone is whole.
        env.DB.prepare(`SELECT created_at AS at FROM users WHERE is_guest = 0 AND created_at > ?1`).bind(now - 32 * DAY_MS),
      ]);
      // Sign-ups on each of the last 30 calendar days where the viewer is, oldest
      // first, zeros included; the days come back too, so labels match the bars.
      const zone = zoneOf(new URL(request.url).searchParams.get("tz"));
      const signupDays = lastDays(now, zone, 30);
      const index = new Map(signupDays.map((day, at) => [day, at]));
      const signups = signupDays.map(() => 0);
      const dayIn = dayFormat(zone);
      for (const row of days.results as Array<{ at: number }>) {
        const at = index.get(dayIn(row.at));
        if (at !== undefined) signups[at]++;
      }
      return json({
        counts: counts.results[0],
        countries: countries.results,
        signups,
        signupDays,
        ...(await business(env, now)),
      });
    })

    // People, a page at a time, whoever was around most recently first.
    .add("GET", "/v1/admin/users", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const guests = url.searchParams.get("guests") === "1" ? 1 : 0;
      const { search, like } = searchOf(url);
      const page = pageOf(url);
      const where = `u.is_guest = ?1 AND (?2 = '' OR LOWER(u.display_name) LIKE ?3 ESCAPE '\\' OR LOWER(COALESCE(u.email, '')) LIKE ?3 ESCAPE '\\')`;
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT u.id, u.display_name AS displayName, u.email, u.character, u.country,
                  u.created_at AS createdAt, u.last_active_at AS lastActiveAt,
                  u.google_sub IS NOT NULL AS google, u.password_hash IS NOT NULL AS password,
                  (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS offices
             FROM users u WHERE ${where}
            ORDER BY u.last_active_at DESC, u.id LIMIT ?4 OFFSET ?5`,
        ).bind(guests, search, like, PAGE, page * PAGE),
        env.DB.prepare(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`).bind(guests, search, like),
      ]);
      return json({ users: rows.results, page, pageSize: PAGE, total: (total.results[0] as { total: number }).total });
    })

    // Offices, a page at a time, the one with someone around most recently first.
    // Its members are asked for when an office is opened (below).
    .add("GET", "/v1/admin/offices", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const { search, like } = searchOf(url);
      const page = pageOf(url);
      const where = `(?1 = '' OR LOWER(o.name) LIKE ?2 ESCAPE '\\')`;
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT o.id, o.name, o.plan, o.seats, o.created_at AS createdAt,
                  (SELECT COUNT(*) FROM memberships m WHERE m.office_id = o.id) AS members,
                  (SELECT MAX(u.last_active_at) FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.office_id = o.id) AS lastActiveAt,
                  CASE WHEN s.status IN (${LIVE}) AND s.provider_subscription_id IS NOT NULL THEN s.status END AS billing,
                  s.cancel_at AS cancelAt, COALESCE(um.meeting_seconds, 0) AS meetingSeconds
             FROM offices o
             LEFT JOIN subscriptions s ON s.office_id = o.id
             LEFT JOIN usage_monthly um ON um.office_id = o.id AND um.period = ?3
            WHERE ${where}
            ORDER BY lastActiveAt DESC, o.created_at DESC LIMIT ?4 OFFSET ?5`,
        ).bind(search, like, thisMonth().key, PAGE, page * PAGE),
        env.DB.prepare(`SELECT COUNT(*) AS total FROM offices o WHERE ${where}`).bind(search, like),
      ]);
      const offices = rows.results as Array<{ id: string } & Record<string, unknown>>;
      const here = offices.length
        ? await realtime(env)
            .presenceCounts(offices.map((office) => office.id))
            .catch(() => ({}) as Record<string, number>)
        : {};
      return json({
        offices: offices.map((office) => ({ ...office, here: here[office.id] ?? 0 })),
        page,
        pageSize: PAGE,
        total: (total.results[0] as { total: number }).total,
      });
    })

    // One office's people, when it's opened in the list.
    .add("GET", "/v1/admin/offices/:id/members", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const office = await env.DB.prepare("SELECT owner_id FROM offices WHERE id = ?").bind(params.id).first<{ owner_id: string }>();
      if (!office) throw new HttpError(404, "no_office", "No such office");
      const { results } = await env.DB.prepare(
        `SELECT u.id, u.display_name AS displayName, u.email, m.role, m.joined_at AS joinedAt,
                u.last_active_at AS lastActiveAt, u.country, u.id = ?2 AS owner
           FROM memberships m JOIN users u ON u.id = m.user_id
          WHERE m.office_id = ?1 ORDER BY u.id = ?2 DESC, u.last_active_at DESC`,
      )
        .bind(params.id, office.owner_id)
        .all();
      return json({ members: results });
    })

    // An account's name, put right by hand.
    .add("PATCH", "/v1/admin/users/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const displayName = cleanDisplayName((await readJson(request)).displayName);
      if (!displayName) throw new HttpError(400, "name_required", "A name is needed");
      const done = await env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, params.id).run();
      if (!done.meta.changes) throw new HttpError(404, "no_user", "No such account");
      return json({ ok: true });
    })

    .add("DELETE", "/v1/admin/users/:id", async ({ request, env, ctx, params }) => {
      const admin = await requireAdmin(env, request, ctx);
      if (params.id === admin.id) throw new HttpError(400, "not_yourself", "An admin can't delete their own account here");
      return json(await deleteAccount(env, params.id));
    })

    // An office renamed, or given a plan without payment.
    .add("PATCH", "/v1/admin/offices/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const body = await readJson(request);
      const office = await env.DB.prepare("SELECT id FROM offices WHERE id = ?").bind(params.id).first();
      if (!office) throw new HttpError(404, "no_office", "No such office");
      if (body.name !== undefined) {
        const name = cleanName(body.name);
        if (!name) throw new HttpError(400, "name_required", "Name the office");
        await env.DB.prepare("UPDATE offices SET name = ? WHERE id = ?").bind(name, params.id).run();
      }
      if (body.plan !== undefined) await givePlan(env, params.id, String(body.plan));
      return json({ ok: true });
    })

    .add("DELETE", "/v1/admin/offices/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const office = await env.DB.prepare("SELECT id FROM offices WHERE id = ?").bind(params.id).first();
      if (!office) throw new HttpError(404, "no_office", "No such office");
      await closeOffice(env, params.id);
      return json({ ok: true });
    })

    .add("GET", "/v1/admin/lobby-chat", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const before = Number(url.searchParams.get("before"));
      const page = await realtime(env).lobbyChat(url.searchParams.get("channel") ?? "", before > 0 ? before : undefined);
      return json(page, { headers: { "Cache-Control": "no-store" } });
    })

    .add("PATCH", "/v1/admin/lobby-chat/:seq", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const { body } = await readJson(request);
      if (typeof body !== "string" || !body.trim()) throw new HttpError(400, "empty_message", "A message needs some text");
      if (!(await realtime(env).moderateLobbyChat(messageSeq(params.seq), { body }))) {
        throw new HttpError(404, "message_gone", "That message is gone");
      }
      return json({ ok: true });
    })

    .add("DELETE", "/v1/admin/lobby-chat/:seq", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      if (!(await realtime(env).moderateLobbyChat(messageSeq(params.seq), { remove: true }))) {
        throw new HttpError(404, "message_gone", "That message is gone");
      }
      return json({ ok: true });
    });
}

/**
 * The little the admin view says about plans; the rest (revenue, failed
 * payments, cancellations) is in Paddle's own dashboard. Offices paying,
 * by plan; offices on a paid plan given by hand; and this month's meeting
 * hours across every office.
 */
async function business(env: Env, now: number) {
  const [paid, extra] = await env.DB.batch([
    env.DB.prepare(
      `SELECT plan, COUNT(*) AS offices FROM subscriptions
        WHERE provider_subscription_id IS NOT NULL AND status IN (${LIVE}) GROUP BY plan`,
    ),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM offices o WHERE o.plan != 'free' AND NOT EXISTS (
            SELECT 1 FROM subscriptions s WHERE s.office_id = o.id AND s.provider_subscription_id IS NOT NULL AND s.status IN (${LIVE}))) AS given,
         (SELECT COALESCE(SUM(meeting_seconds), 0) FROM usage_monthly WHERE period = ?1) AS meetingSeconds`,
    ).bind(thisMonth(now).key),
  ]);
  const more = extra.results[0] as { given: number; meetingSeconds: number };
  return {
    plans: {
      paid: Object.fromEntries((paid.results as Array<{ plan: string; offices: number }>).map((row) => [row.plan, row.offices])),
      given: more.given,
    },
    meetingSeconds: more.meetingSeconds,
  };
}

/**
 * An account deleted by hand. The offices it owns don't go with it while
 * anyone else is in them: each passes to the longest-standing admin, or
 * else the longest-standing member, who becomes one. An office with nobody
 * else in it closes. An office whose plan still renews stops everything: the
 * plan has to be cancelled first, the same as when its owner closes it.
 */
async function deleteAccount(env: Env, userId: string) {
  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first();
  if (!user) throw new HttpError(404, "no_user", "No such account");

  const { results: owned } = await env.DB.prepare("SELECT id, name FROM offices WHERE owner_id = ?")
    .bind(userId)
    .all<{ id: string; name: string }>();
  for (const office of owned) {
    const live = await liveSubscription(env, office.id);
    if (live && !live.cancel_at) {
      throw new HttpError(409, "owns_paid_office", `${office.name} is on a paid plan that still renews; cancel it first`);
    }
  }

  const handedOver: string[] = [];
  const closed: string[] = [];
  for (const office of owned) {
    const next = await env.DB.prepare(
      `SELECT user_id FROM memberships WHERE office_id = ? AND user_id != ?
        ORDER BY role = 'admin' DESC, joined_at LIMIT 1`,
    )
      .bind(office.id, userId)
      .first<{ user_id: string }>();
    if (next) {
      await env.DB.batch([
        env.DB.prepare("UPDATE offices SET owner_id = ? WHERE id = ?").bind(next.user_id, office.id),
        env.DB.prepare("UPDATE memberships SET role = 'admin' WHERE office_id = ? AND user_id = ?").bind(office.id, next.user_id),
      ]);
      handedOver.push(office.id);
    } else {
      await closeOffice(env, office.id);
      closed.push(office.id);
    }
  }

  const { results: memberOf } = await env.DB.prepare("SELECT office_id FROM memberships WHERE user_id = ?")
    .bind(userId)
    .all<{ office_id: string }>();
  // Sessions and memberships go with the account (ON DELETE CASCADE); invitations it made go too.
  await env.DB.batch([
    env.DB.prepare("DELETE FROM invites WHERE created_by = ?").bind(userId),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
  // Anyone still on a floor is let go of there too.
  await Promise.all(memberOf.map(({ office_id }) => realtime(env).removeMember(office_id, userId).catch(() => undefined)));
  return { ok: true, handedOver, closed };
}

function messageSeq(value: string): number {
  const seq = Number(value);
  if (!Number.isSafeInteger(seq) || seq <= 0) throw new HttpError(400, "bad_message", "No such message");
  return seq;
}
