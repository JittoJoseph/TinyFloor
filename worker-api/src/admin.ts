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
 * chat. Plans themselves aren't configurable here: they live in code
 * (billing.ts) and in Paddle. Open to the accounts named in ADMIN_EMAILS, and
 * only once Google has vouched for the address, since a password sign-up
 * proves nothing about owning it. Anyone else is told there is nothing here.
 */

const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE = [...HOLDS_PLAN].map((status) => `'${status}'`).join(", ");

async function requireAdmin(env: Env, request: Request, ctx: ExecutionContext) {
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

/** A page cursor: the created_at of the last row shown, or now for the first page. */
const cursor = (url: URL) => {
  const before = Number(url.searchParams.get("before"));
  return Number.isFinite(before) && before > 0 ? before : Number.MAX_SAFE_INTEGER;
};

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
             (SELECT COUNT(*) FROM users WHERE is_guest = 0 AND google_sub IS NOT NULL) AS withGoogle`,
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

    .add("GET", "/v1/admin/users", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const guests = url.searchParams.get("guests") === "1" ? 1 : 0;
      const search = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
      const like = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      const { results } = await env.DB.prepare(
        `SELECT u.id, u.display_name AS displayName, u.email, u.character, u.country,
                u.created_at AS createdAt, u.last_active_at AS lastActiveAt,
                u.google_sub IS NOT NULL AS google, u.password_hash IS NOT NULL AS password,
                (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS offices
           FROM users u
          WHERE u.is_guest = ?1 AND u.created_at < ?2
            AND (?3 = '' OR LOWER(u.display_name) LIKE ?4 ESCAPE '\\' OR LOWER(COALESCE(u.email, '')) LIKE ?4 ESCAPE '\\')
          ORDER BY u.created_at DESC LIMIT ?5`,
      )
        .bind(guests, cursor(url), search, like, PAGE)
        .all();
      return json({ users: results, more: results.length === PAGE });
    })

    .add("GET", "/v1/admin/offices", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const { results: offices } = await env.DB.prepare(
        `SELECT o.id, o.name, o.plan, o.seats, o.created_at AS createdAt,
                u.id AS ownerId, u.display_name AS ownerName, u.email AS ownerEmail, u.country AS ownerCountry,
                CASE WHEN s.status IN (${LIVE}) AND s.provider_subscription_id IS NOT NULL THEN s.status END AS billing,
                s.cancel_at AS cancelAt, COALESCE(um.meeting_seconds, 0) AS meetingSeconds
           FROM offices o
           LEFT JOIN users u ON u.id = o.owner_id
           LEFT JOIN subscriptions s ON s.office_id = o.id
           LEFT JOIN usage_monthly um ON um.office_id = o.id AND um.period = ?3
          WHERE o.created_at < ?1 ORDER BY o.created_at DESC LIMIT ?2`,
      )
        .bind(cursor(url), PAGE, thisMonth().key)
        .all<{
          id: string;
          name: string;
          plan: string;
          seats: number;
          createdAt: number;
          billing: string | null;
          cancelAt: number | null;
          meetingSeconds: number;
          ownerId: string | null;
          ownerName: string | null;
          ownerEmail: string | null;
          ownerCountry: string | null;
        }>();
      if (!offices.length) return json({ offices: [], more: false });

      const ids = offices.map((office) => office.id);
      const marks = ids.map(() => "?").join(",");
      const [members, here] = await Promise.all([
        env.DB.prepare(
          `SELECT m.office_id AS officeId, u.id, u.display_name AS displayName, u.email, m.role,
                  m.joined_at AS joinedAt, u.last_active_at AS lastActiveAt, u.country
             FROM memberships m JOIN users u ON u.id = m.user_id
            WHERE m.office_id IN (${marks}) ORDER BY m.joined_at`,
        )
          .bind(...ids)
          .all<{ officeId: string } & Record<string, unknown>>(),
        realtime(env)
          .presenceCounts(ids)
          .catch(() => ({}) as Record<string, number>),
      ]);
      const byOffice = new Map<string, Array<Record<string, unknown>>>();
      for (const { officeId, ...member } of members.results) {
        byOffice.set(officeId, [...(byOffice.get(officeId) ?? []), member]);
      }
      return json({
        offices: offices.map((office) => ({ ...office, here: here[office.id] ?? 0, members: byOffice.get(office.id) ?? [] })),
        more: offices.length === PAGE,
      });
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
