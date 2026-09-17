import bcrypt from "bcryptjs";
import { DurableObject } from "cloudflare:workers";

/**
 * bcrypt cost. Each step doubles the work. Hashing takes far longer than the
 * Workers Free plan's 10 ms of CPU per request, but a Durable Object gets 30
 * seconds per request on every plan, so the hashing happens here.
 */
const BCRYPT_COST = 11;

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Checked against when the email has no account, so a miss takes as long as a wrong password. */
const DECOY_HASH = "$2b$11$WqgQAokk7OTfqhMBVH9ofuZWZUQYaLNwkhpesbjBqaHG4g6tE7Tl.";

export type GuardVerdict = { ok: true } | { ok: false; reason: "wrong" | "locked"; retryAfterSeconds?: number };

/**
 * One object per email address (`email:<address>`) or client IP (`ip:<address>`).
 * It hashes and checks passwords, and slows down guessing: five failures within
 * fifteen minutes lock the key until the window passes.
 */
export class PasswordGuard extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS failures (id INTEGER PRIMARY KEY CHECK (id = 1), count INTEGER NOT NULL, since INTEGER NOT NULL)",
    );
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  /** Checks a password against a stored hash, or against a decoy when there's no account. */
  async verify(password: string, hash: string | null): Promise<GuardVerdict> {
    const locked = this.lockedFor();
    if (locked) return { ok: false, reason: "locked", retryAfterSeconds: locked };

    const matches = await bcrypt.compare(password, hash ?? DECOY_HASH);
    if (matches && hash) {
      this.ctx.storage.sql.exec("DELETE FROM failures");
      return { ok: true };
    }
    this.recordFailure();
    return { ok: false, reason: "wrong" };
  }

  /** For keys that only count attempts (per IP): true while under the limit. */
  attempt(maxPerWindow: number): boolean {
    const now = Date.now();
    const row = this.row();
    if (!row || now - row.since > WINDOW_MS) {
      this.save(1, now);
      return true;
    }
    this.save(row.count + 1, row.since);
    return row.count + 1 <= maxPerWindow;
  }

  /** Whether an older hash should be replaced with one at the current cost. */
  needsRehash(hash: string): boolean {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  }

  private lockedFor(): number {
    const row = this.row();
    if (!row || row.count < MAX_FAILURES) return 0;
    const remaining = row.since + WINDOW_MS - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  private recordFailure(): void {
    const now = Date.now();
    const row = this.row();
    if (!row || now - row.since > WINDOW_MS) this.save(1, now);
    else this.save(row.count + 1, row.since);
  }

  private row(): { count: number; since: number } | null {
    return this.ctx.storage.sql.exec<{ count: number; since: number }>("SELECT count, since FROM failures").toArray()[0] ?? null;
  }

  private save(count: number, since: number): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO failures (id, count, since) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET count = excluded.count, since = excluded.since",
      count,
      since,
    );
  }
}
