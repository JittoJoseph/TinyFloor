import bcrypt from "bcryptjs";
import { DurableObject } from "cloudflare:workers";

/**
 * bcrypt cost. Each step doubles the work. Hashing takes far longer than the
 * Workers Free plan's 10 ms of CPU per request, but a Durable Object gets 30
 * seconds per request on every plan, so the hashing happens here.
 */
const BCRYPT_COST = 11;

const MAX_FAILURES = 5;
const KEY = "failures";

interface Failures {
  count: number;
  since: number;
}
const WINDOW_MS = 15 * 60 * 1000;

/** Checked against when the email has no account, so a miss takes as long as a wrong password. */
const DECOY_HASH = "$2b$11$WqgQAokk7OTfqhMBVH9ofuZWZUQYaLNwkhpesbjBqaHG4g6tE7Tl.";

export type GuardVerdict = { ok: true } | { ok: false; reason: "wrong" | "locked"; retryAfterSeconds?: number };

/**
 * One object per email address (`email:<address>`) or client IP (`ip:<address>`).
 * It hashes and checks passwords, and slows down guessing: five failures within
 * fifteen minutes lock the key until the window passes.
 *
 * It stores nothing until something fails, and forgets everything when the
 * window closes or the right password arrives. An object with nothing stored
 * does not persist, so the only guards that exist are the ones counting.
 */
export class PasswordGuard extends DurableObject<Env> {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  /** Checks a password against a stored hash, or against a decoy when there's no account. */
  async verify(password: string, hash: string | null): Promise<GuardVerdict> {
    const locked = await this.lockedFor();
    if (locked) return { ok: false, reason: "locked", retryAfterSeconds: locked };

    const matches = await bcrypt.compare(password, hash ?? DECOY_HASH);
    if (matches && hash) {
      await this.forget();
      return { ok: true };
    }
    await this.recordFailure();
    return { ok: false, reason: "wrong" };
  }

  /** For keys that only count attempts (per IP): true while under the limit. */
  async attempt(maxPerWindow: number): Promise<boolean> {
    const now = Date.now();
    const row = await this.row();
    if (!row || now - row.since > WINDOW_MS) {
      await this.save(1, now);
      return true;
    }
    await this.save(row.count + 1, row.since);
    return row.count + 1 <= maxPerWindow;
  }

  /** The window has closed: nothing left worth keeping. */
  async alarm(): Promise<void> {
    await this.forget();
  }

  /** Whether an older hash should be replaced with one at the current cost. */
  needsRehash(hash: string): boolean {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  }

  private async lockedFor(): Promise<number> {
    const row = await this.row();
    if (!row || row.count < MAX_FAILURES) return 0;
    const remaining = row.since + WINDOW_MS - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  private async recordFailure(): Promise<void> {
    const now = Date.now();
    const row = await this.row();
    if (!row || now - row.since > WINDOW_MS) await this.save(1, now);
    else await this.save(row.count + 1, row.since);
  }

  private row(): Promise<Failures | undefined> {
    return this.ctx.storage.get<Failures>(KEY);
  }

  private async save(count: number, since: number): Promise<void> {
    await this.ctx.storage.put<Failures>(KEY, { count, since });
    // A new window: clear up when it ends.
    if (count === 1) await this.ctx.storage.setAlarm(since + WINDOW_MS);
  }

  private async forget(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
}
