import { HttpError } from "./http";

/** Checks a Turnstile token with Cloudflare. Waiting on the network doesn't count as CPU time. */
export async function verifyTurnstile(env: Env, request: Request, token: unknown): Promise<void> {
  if (typeof token !== "string" || !token) {
    throw new HttpError(400, "turnstile_required", "Complete the check first");
  }
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
  if (!result?.success) throw new HttpError(403, "turnstile_failed", "The check failed, try again");
}
