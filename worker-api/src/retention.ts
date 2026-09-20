const DAY_MS = 24 * 60 * 60 * 1000;
/** Rows deleted per job per run, so one run stays small; the next day picks up the rest. */
const BATCH = 1000;

export interface RetentionReport {
  sessions: number;
  guests: number;
  invites: number;
  guestLinks: number;
  usage: number;
}

/** The daily clean-up. Each job is safe to run again. */
export async function runRetention(env: Env, now = Date.now()): Promise<RetentionReport> {
  const deleted = (result: D1Result) => result.meta.changes ?? 0;

  const sessions = await env.DB.prepare(
    `DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at < ?1 LIMIT ${BATCH})`,
  )
    .bind(now)
    .run();

  // Guests nobody can sign in as any more, idle for a week.
  const guests = await env.DB.prepare(
    `DELETE FROM users WHERE id IN (
       SELECT u.id FROM users u
        WHERE u.is_guest = 1 AND u.last_active_at < ?1
          AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)
        LIMIT ${BATCH})`,
  )
    .bind(now - 7 * DAY_MS)
    .run();

  const invites = await env.DB.prepare(
    `DELETE FROM invites WHERE id IN (
       SELECT id FROM invites WHERE MIN(expires_at, COALESCE(accepted_at, expires_at), COALESCE(revoked_at, expires_at)) < ?1
        LIMIT ${BATCH})`,
  )
    .bind(now - 30 * DAY_MS)
    .run();

  const guestLinks = await env.DB.prepare(
    `DELETE FROM guest_links WHERE id IN (
       SELECT id FROM guest_links WHERE MIN(expires_at, COALESCE(revoked_at, expires_at)) < ?1
        LIMIT ${BATCH})`,
  )
    .bind(now - 30 * DAY_MS)
    .run();

  // Chat trims itself as it writes, so there is nothing to do for it here.
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 13);
  const usage = await env.DB.prepare("DELETE FROM usage_daily WHERE day < ?1")
    .bind(cutoff.toISOString().slice(0, 10))
    .run();

  return {
    sessions: deleted(sessions),
    guests: deleted(guests),
    invites: deleted(invites),
    guestLinks: deleted(guestLinks),
    usage: deleted(usage),
  };
}
