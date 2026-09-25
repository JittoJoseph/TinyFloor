import type { PostHog } from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const analyticsConfigured = Boolean(token && host);

let loaded: Promise<PostHog> | null = null;

/**
 * PostHog, fetched and set up on first use. It is some 100KB of script, so no
 * page carries it up front: it arrives once the page has settled (see
 * startAnalytics), or sooner if something is tracked before then.
 */
function load() {
  return (loaded ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(token!, {
      api_host: host,
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
    return posthog;
  }));
}

/** Runs with PostHog once it's there, in the order asked. Nothing happens when it isn't set up. */
export function withPostHog(use: (posthog: PostHog) => void) {
  if (analyticsConfigured) void load().then(use);
}

/** Loads PostHog when the browser is idle after the page has loaded, so it never competes with the page. */
export function startAnalytics() {
  if (!analyticsConfigured || typeof window === "undefined") return;
  const start = () => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => void load(), { timeout: 4000 });
    else setTimeout(() => void load(), 1500);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
