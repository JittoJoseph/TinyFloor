import { realtime } from "./access";
import { HttpError, json } from "./http";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * The admin view: who has signed up and when they were last around, where
 * they come from, and every office with its members. Read only. Open to the
 * accounts named in ADMIN_EMAILS, and only once Google has vouched for the
 * address, since a password sign-up proves nothing about owning it. Anyone
 * else is told there is nothing here.
 */

const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

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
        env.DB.prepare(
          `SELECT CAST((created_at - ?1) / 86400000 AS INTEGER) AS day, COUNT(*) AS people
             FROM users WHERE is_guest = 0 AND created_at > ?1 GROUP BY day`,
        ).bind(now - 30 * DAY_MS),
      ]);
      // Sign-ups on each of the last 30 days, oldest first, zeros included.
      const signups = Array.from({ length: 30 }, () => 0);
      for (const row of days.results as Array<{ day: number; people: number }>) {
        if (row.day >= 0 && row.day < 30) signups[row.day] = row.people;
      }
      return json({ counts: counts.results[0], countries: countries.results, signups });
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
                u.display_name AS ownerName, u.email AS ownerEmail
           FROM offices o LEFT JOIN users u ON u.id = o.owner_id
          WHERE o.created_at < ?1 ORDER BY o.created_at DESC LIMIT ?2`,
      )
        .bind(cursor(url), PAGE)
        .all<{ id: string; name: string; plan: string; seats: number; createdAt: number; ownerName: string | null; ownerEmail: string | null }>();
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
    });
}
