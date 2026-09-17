import { HttpError } from "./http";

/**
 * Accounts and guests created, and sign-ins, per IP address per minute. On top
 * of Turnstile and the per-email lockout, so a script can't burn through them.
 * Checked before Turnstile, which saves a siteverify call per refused request.
 */
export async function limitAuth(env: Env, request: Request): Promise<void> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await env.AUTH_LIMIT.limit({ key: ip });
  if (!success) throw new HttpError(429, "slow_down", "Too many attempts. Wait a minute and try again");
}
