/**
 * Where PostHog is reached on our own sites (`/tf/...`): the middleware passes
 * it on (lib/edge.ts), and the analytics send there (lib/analytics.ts). Ad
 * blockers block PostHog's own domains, which hid every visitor who ran one.
 */
export const RELAY_PATH = "/tf";
