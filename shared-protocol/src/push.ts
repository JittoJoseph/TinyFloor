/**
 * Web Push: reaching someone's browser when TinyFloor isn't open
 * (docs/product.md). The browser subscribes with this public key; the private
 * half is the realtime worker's VAPID_PRIVATE_KEY secret, the same for
 * production and preview, so there's one pair to look after.
 */
export const VAPID_PUBLIC_KEY = "BCjOH3Pf8MfJ7sDBWn2gcYuSXV5FIbZl3vZvJRFb5gDGB9fm3gDAQVwmsNljGBythOR9BWwSJOrtxYJGi2YUT8w";

/** What a push carries, for the service worker to show. */
export interface PushPayload {
  title: string;
  body: string;
  /** One per conversation: the next one replaces it. */
  tag: string;
  /** Where clicking it goes, on the app's own origin. */
  url: string;
}

/** A browser's subscription, as PushSubscription.toJSON() gives it. */
export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
