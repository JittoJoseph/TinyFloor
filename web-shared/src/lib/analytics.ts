import type { CaptureResult, PostHog } from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const analyticsConfigured = Boolean(token && host);

/**
 * Where an event comes from, on every event: the live sites, preview, or a
 * laptop. PostHog's "filter out test accounts" leaves out everything that
 * isn't production, so testing never reaches the numbers.
 */
function environment(): "production" | "preview" | "development" {
  const where = typeof window === "undefined" ? "" : window.location.hostname;
  if (/^(www\.|app\.)?tinyfloor\.com$/.test(where)) return "production";
  if (where.endsWith("tinyfloor.com")) return "preview";
  return "development";
}

/**
 * An invite link is a key to an office, so its code never leaves the browser:
 * in any URL PostHog keeps (the page, where they came from, a redirect back),
 * `/invite/<code>` becomes `/invite/:code`.
 */
const scrub = (value: unknown) => (typeof value === "string" ? value.replace(/(\/invite\/|%2Finvite%2F)[^/?#&%]+/gi, "$1:code") : value);

function scrubUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event;
  for (const key of ["$current_url", "$pathname", "$referrer", "$initial_current_url", "$initial_pathname", "$prev_pageview_pathname"]) {
    if (key in event.properties) event.properties[key] = scrub(event.properties[key]);
  }
  return event;
}

let loaded: Promise<PostHog> | null = null;

/**
 * PostHog, fetched and set up on first use. It is some 100KB of script, so no
 * page carries it up front: it arrives once the page has settled (see
 * startAnalytics), or sooner if something is tracked before then.
 */
function load() {
  return (loaded ??= import("posthog-js").then(({ default: posthog }) => {
    const where = environment();
    posthog.init(token!, {
      api_host: host,
      defaults: "2026-01-30",
      // A laptop's errors are mid-edit noise, not something a user ran into.
      capture_exceptions: where !== "development",
      before_send: scrubUrls,
      // Recordings show the page as people see it, so we can see where they get
      // stuck. What's private stays hidden: everything typed (inputs are masked),
      // and what's marked: messages, emails, the invite link, help tickets, the
      // admin pages (`data-ph-mask` hides the words, `ph-no-capture` the whole
      // thing, for chat pictures).
      session_recording: { maskTextSelector: "[data-ph-mask], [data-ph-mask] *", maskAllInputs: true },
      debug: false,
    });
    posthog.register({ environment: where });
    return posthog;
  }));
}

/** Runs with PostHog once it's there, in the order asked. Nothing happens when it isn't set up. */
export function withPostHog(use: (posthog: PostHog) => void) {
  if (analyticsConfigured) void load().then(use);
}

/** Records something someone did, with what it was about (never what they wrote). */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  withPostHog((posthog) => posthog.capture(event, properties));
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
