import { cleanDisplayName, FLOORS } from "shared-protocol";
import { cleanName, realtime } from "./access";
import { extendTrial, givePlan, HOLDS_PLAN, liveSubscription, MOST_TRIAL_DAYS, thisMonth } from "./billing";
import { HttpError, json, readJson } from "./http";
import { letter, sendEmail } from "./email";
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
 * (billing.ts) and in Creem. Open to the accounts named in ADMIN_EMAILS, and
 * only once the address is shown to be theirs (by Google, or a code sent to
 * it). Anyone else is told there is nothing here.
 */

const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE = [...HOLDS_PLAN].map((status) => `'${status}'`).join(", ");

/**
 * How an office (`o`) has its plan, which the admin view sorts offices by:
 * paying through Creem; on the trial every new office starts with (its end
 * still set, docs/pricing.md; one just past it until it's swept to Free);
 * given a plan by hand, which clears the trial (billing.ts, givePlan); or free.
 */
const STANDINGS = ["paying", "trial", "given", "free"] as const;
const STANDING = `CASE
    WHEN EXISTS (SELECT 1 FROM subscriptions p WHERE p.office_id = o.id AND p.provider_subscription_id IS NOT NULL AND p.status IN (${LIVE})) THEN 'paying'
    WHEN o.plan = 'free' THEN 'free'
    WHEN o.trial_ends_at > 0 THEN 'trial'
    ELSE 'given' END`;

/** The team's addresses (ADMIN_EMAILS), lower case. */
const adminEmails = (env: Env) =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export async function requireAdmin(env: Env, request: Request, ctx: ExecutionContext) {
  const user = await requireAccount(env, request, ctx);
  const row = await env.DB.prepare("SELECT email_verified FROM users WHERE id = ?").bind(user.id).first<{ email_verified: number }>();
  if (!user.email || !adminEmails(env).includes(user.email) || row?.email_verified !== 1) {
    throw new HttpError(404, "not_found", "No such endpoint");
  }
  return user;
}

/** The team's accounts (their addresses shown to be theirs): who hears when someone writes to the team. */
export async function adminIds(env: Env): Promise<string[]> {
  const emails = adminEmails(env);
  if (!emails.length) return [];
  const { results } = await env.DB.prepare(`SELECT id FROM users WHERE email_verified = 1 AND LOWER(email) IN (${emails.map(() => "?").join(", ")})`)
    .bind(...emails)
    .all<{ id: string }>();
  return results.map((row) => row.id);
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

/** An account as the admin view lists it. */
const PERSON = `u.id, u.display_name AS displayName, u.email, u.character, u.country,
  u.created_at AS createdAt, u.last_active_at AS lastActiveAt, u.google_sub IS NOT NULL AS google, u.is_guest AS guest`;

/** An office as the admin view lists it, with its owner's address and country; this month's usage joined as `um` (bound as ?period). */
const OFFICE = `o.id, o.name, o.plan, o.seats, o.floor, o.created_at AS createdAt,
  ${STANDING} AS standing, o.trial_ends_at AS trialEndsAt, ow.email AS ownerEmail, ow.country AS ownerCountry,
  (SELECT COUNT(*) FROM memberships m WHERE m.office_id = o.id) AS members,
  o.active_at AS lastActiveAt,
  CASE WHEN s.status IN (${LIVE}) AND s.provider_subscription_id IS NOT NULL THEN s.status END AS billing,
  s.cancel_at AS cancelAt, COALESCE(um.meeting_seconds, 0) AS meetingSeconds`;
const OFFICE_FROM = `offices o
  LEFT JOIN users ow ON ow.id = o.owner_id
  LEFT JOIN subscriptions s ON s.office_id = o.id
  LEFT JOIN usage_monthly um ON um.office_id = o.id AND um.period = ?period`;

/** How many are on each office's floor now, from the rooms; nobody, if they can't be asked. */
const hereIn = (env: Env, ids: string[]): Promise<Record<string, number>> =>
  ids.length ? realtime(env).presenceCounts(ids).catch(() => ({})) : Promise.resolve({});

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
      const [counts, standings, plans, countries, days, busiest, newest] = await env.DB.batch([
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
        env.DB.prepare(`SELECT ${STANDING} AS standing, COUNT(*) AS offices FROM offices o GROUP BY standing`),
        // The little said here about plans (the rest is in Creem's own dashboard): paying offices whose card
        // payment failed, and those ending; and this month's meeting hours across every office.
        env.DB.prepare(
          `SELECT
             (SELECT COUNT(*) FROM subscriptions WHERE provider_subscription_id IS NOT NULL AND status = 'past_due') AS pastDue,
             (SELECT COUNT(*) FROM subscriptions WHERE provider_subscription_id IS NOT NULL AND status IN (${LIVE}) AND cancel_at IS NOT NULL) AS ending,
             (SELECT COALESCE(SUM(meeting_seconds), 0) FROM usage_monthly WHERE period = ?1) AS meetingSeconds`,
        ).bind(thisMonth(now).key),
        env.DB.prepare(
          `SELECT country, COUNT(*) AS people FROM users
            WHERE country IS NOT NULL GROUP BY country ORDER BY people DESC LIMIT 20`,
        ),
        // A day's margin either side, so every calendar day in any time zone is whole.
        env.DB.prepare(`SELECT created_at AS at FROM users WHERE is_guest = 0 AND created_at > ?1`).bind(now - 32 * DAY_MS),
        // The offices meeting the most this month, and the newest accounts: the dashboard's ways in.
        env.DB.prepare(
          `SELECT o.id, o.name, o.plan, ${STANDING} AS standing, o.trial_ends_at AS trialEndsAt, um.meeting_seconds AS meetingSeconds,
                  (SELECT COUNT(*) FROM memberships m WHERE m.office_id = o.id) AS members
             FROM usage_monthly um JOIN offices o ON o.id = um.office_id
            WHERE um.period = ?1 AND um.meeting_seconds > 0 ORDER BY um.meeting_seconds DESC LIMIT 5`,
        ).bind(thisMonth(now).key),
        env.DB.prepare(
          `SELECT id, display_name AS displayName, email, country, created_at AS createdAt
             FROM users WHERE is_guest = 0 ORDER BY created_at DESC LIMIT 5`,
        ),
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
      const byStanding = new Map((standings.results as Array<{ standing: string; offices: number }>).map((row) => [row.standing, row.offices]));
      const { meetingSeconds, ...plansNow } = plans.results[0] as { pastDue: number; ending: number; meetingSeconds: number };
      return json({
        counts: counts.results[0],
        standings: Object.fromEntries(STANDINGS.map((standing) => [standing, byStanding.get(standing) ?? 0])),
        countries: countries.results,
        signups,
        signupDays,
        busiest: busiest.results,
        newest: newest.results,
        plans: plansNow,
        meetingSeconds,
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
        env.DB.prepare(`SELECT ${PERSON} FROM users u WHERE ${where} ORDER BY u.last_active_at DESC, u.id LIMIT ?4 OFFSET ?5`).bind(
          guests,
          search,
          like,
          PAGE,
          page * PAGE,
        ),
        env.DB.prepare(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`).bind(guests, search, like),
      ]);
      return json({ users: rows.results, page, pageSize: PAGE, total: (total.results[0] as { total: number }).total });
    })

    // One account: everything the list says, and the offices it's in.
    .add("GET", "/v1/admin/users/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const [person, offices] = await env.DB.batch([
        env.DB.prepare(`SELECT ${PERSON} FROM users u WHERE u.id = ?`).bind(params.id),
        env.DB.prepare(
          `SELECT o.id, o.name, o.plan, ${STANDING} AS standing, o.trial_ends_at AS trialEndsAt, m.role, o.owner_id = m.user_id AS owner, m.joined_at AS joinedAt
             FROM memberships m JOIN offices o ON o.id = m.office_id
            WHERE m.user_id = ? ORDER BY o.active_at DESC, m.joined_at`,
        ).bind(params.id),
      ]);
      if (!person.results[0]) throw new HttpError(404, "no_user", "No such account");
      return json({ person: person.results[0], offices: offices.results });
    })

    // Offices, a page at a time, the one with someone around most recently first: all of them, or those of one standing; found by name or owner's address.
    .add("GET", "/v1/admin/offices", async ({ request, env, ctx }) => {
      await requireAdmin(env, request, ctx);
      const url = new URL(request.url);
      const { search, like } = searchOf(url);
      const page = pageOf(url);
      const standing = STANDINGS.find((one) => one === url.searchParams.get("standing"));
      const where = `(?1 = '' OR LOWER(o.name) LIKE ?2 ESCAPE '\\' OR LOWER(COALESCE(ow.email, '')) LIKE ?2 ESCAPE '\\')${standing ? ` AND ${STANDING} = '${standing}'` : ""}`;
      const [rows, total] = await env.DB.batch([
        env.DB.prepare(
          `SELECT ${OFFICE} FROM ${OFFICE_FROM.replace("?period", "?3")} WHERE ${where}
            ORDER BY lastActiveAt DESC, o.created_at DESC LIMIT ?4 OFFSET ?5`,
        ).bind(search, like, thisMonth().key, PAGE, page * PAGE),
        env.DB.prepare(`SELECT COUNT(*) AS total FROM offices o LEFT JOIN users ow ON ow.id = o.owner_id WHERE ${where}`).bind(search, like),
      ]);
      const offices = rows.results as Array<{ id: string } & Record<string, unknown>>;
      const here = await hereIn(env, offices.map((office) => office.id));
      // Someone on the floor right now is as recent as it gets: those offices come first.
      const listed = offices.map((office) => ({ ...office, here: here[office.id] ?? 0 }));
      return json({
        offices: [...listed.filter((office) => office.here > 0), ...listed.filter((office) => office.here === 0)],
        page,
        pageSize: PAGE,
        total: (total.results[0] as { total: number }).total,
      });
    })

    // One office: everything the list says, its people (with which of them are on its floor now), and its conversation with the team.
    .add("GET", "/v1/admin/offices/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const [office, members, ticket] = await env.DB.batch([
        env.DB.prepare(`SELECT ${OFFICE} FROM ${OFFICE_FROM.replace("?period", "?2")} WHERE o.id = ?1`).bind(params.id, thisMonth().key),
        env.DB.prepare(
          `SELECT u.id, u.display_name AS displayName, u.email, m.role, m.joined_at AS joinedAt,
                  u.last_active_at AS lastActiveAt, u.country, u.id = o.owner_id AS owner
             FROM memberships m JOIN users u ON u.id = m.user_id JOIN offices o ON o.id = m.office_id
            WHERE m.office_id = ?1 ORDER BY u.last_active_at DESC, owner DESC`,
        ).bind(params.id),
        // The open one, or the latest.
        env.DB.prepare(
          "SELECT id, status FROM help_tickets WHERE office_id = ? AND lobby = 0 ORDER BY status = 'open' DESC, updated_at DESC LIMIT 1",
        ).bind(params.id),
      ]);
      const found = office.results[0];
      if (!found) throw new HttpError(404, "no_office", "No such office");
      // Who is on its floor, by name from the room itself, and how many.
      const [here, people] = await Promise.all([
        hereIn(env, [params.id]),
        realtime(env)
          .officePresence([params.id])
          .catch(() => ({}) as Record<string, Array<{ id: string }>>),
      ]);
      const present = new Set((people[params.id] ?? []).map((one) => one.id));
      return json({
        office: { ...found, here: here[params.id] ?? present.size },
        // Whoever is on the floor now first, then whoever was around most recently.
        members: (members.results as Array<{ id: string } & Record<string, unknown>>)
          .map((member) => ({ ...member, here: present.has(member.id) }))
          .sort((a, b) => Number(b.here) - Number(a.here)),
        ticket: ticket.results[0] ?? null,
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

    // More days of an office's trial: a running one ends later, or an ended one starts again.
    .add("POST", "/v1/admin/offices/:id/trial", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const days = Number((await readJson(request)).days);
      if (!Number.isInteger(days) || days < 1 || days > MOST_TRIAL_DAYS) {
        throw new HttpError(400, "bad_days", `Between 1 and ${MOST_TRIAL_DAYS} days`);
      }
      return json({ trialEndsAt: await extendTrial(env, params.id, days) });
    })

    // An office renamed, given a plan without payment, or moved to another floor.
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
      if (body.floor !== undefined) {
        if (typeof body.floor !== "string" || !(body.floor in FLOORS)) throw new HttpError(400, "no_floor", "No such floor");
        await env.DB.prepare("UPDATE offices SET floor = ? WHERE id = ?").bind(body.floor, params.id).run();
        // Everyone on it reconnects: their next ticket says the new floor, the room moves its desks to it, and the page draws it.
        await realtime(env)
          .floorMoved(params.id)
          .catch(() => undefined);
      }
      return json({ ok: true });
    })

    .add("DELETE", "/v1/admin/offices/:id", async ({ request, env, ctx, params }) => {
      await requireAdmin(env, request, ctx);
      const office = await env.DB.prepare("SELECT id FROM offices WHERE id = ?").bind(params.id).first();
      if (!office) throw new HttpError(404, "no_office", "No such office");
      await closeOffice(env, params.id);
      return json({ ok: true });
    })

    // What the app's email looks like in a real inbox, sent to the admin (or an address they give).
    .add("POST", "/v1/admin/email-test", async ({ request, env, ctx }) => {
      const admin = await requireAdmin(env, request, ctx);
      const { to } = await readJson(request);
      const address = typeof to === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim()) ? to.trim() : admin.email!;
      const { html, text } = letter({
        preview: "A test of how TinyFloor's email looks and arrives.",
        heading: "This is a test email",
        paragraphs: ["It shows how email from TinyFloor looks, and checks that it arrives in the inbox, not in spam.", "Replies go to support@tinyfloor.com."],
        button: { label: "Open TinyFloor", url: "https://app.tinyfloor.com" },
        footnote: "Sent from the admin page to test email.",
      });
      const sent = await sendEmail(env, { to: address, subject: "TinyFloor test email", html, text, kind: "test" });
      return json({ sent, to: address });
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
