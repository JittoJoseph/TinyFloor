-- Paid plans move from Paddle to Creem (docs/09-billing.md). Paddle never took
-- a live payment, so what it left is sandbox purchases: those offices go back
-- to the free plan, and their subscriptions go.
UPDATE offices SET plan = 'free', seats = 3
  WHERE id IN (SELECT office_id FROM subscriptions WHERE provider = 'paddle' AND status IN ('active', 'trialing', 'past_due'));
DELETE FROM subscriptions WHERE provider = 'paddle';

-- Who paid for the plan. Creem's customer portal shows everything its customer
-- buys there, so only they open it from the office's billing settings.
ALTER TABLE subscriptions ADD COLUMN payer_id TEXT;
