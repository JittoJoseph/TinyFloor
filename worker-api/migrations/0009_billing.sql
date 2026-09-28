-- Paid plans through Paddle (docs/09-billing.md). The subscriptions table has
-- waited since 0001; it gains what the webhook needs to keep it right.

-- Which price the office is on, how it renews, and when a cancellation lands.
ALTER TABLE subscriptions ADD COLUMN price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN billing_interval TEXT;
ALTER TABLE subscriptions ADD COLUMN cancel_at INTEGER;
-- When the state written here was true at Paddle: an older event arriving late
-- never overwrites a newer one.
ALTER TABLE subscriptions ADD COLUMN changed_at INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX subscriptions_by_provider_id ON subscriptions (provider_subscription_id);

-- Webhook events already applied, so a retry or a duplicate is a no-op.
CREATE TABLE billing_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
