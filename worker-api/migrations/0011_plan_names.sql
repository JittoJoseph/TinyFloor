-- The paid plans are named by tier, not by the size of the team (docs/15):
-- Team is now Plus, Business is now Pro. Same seats, hours and prices.
UPDATE offices SET plan = 'plus' WHERE plan = 'team';
UPDATE offices SET plan = 'pro' WHERE plan = 'business';
UPDATE subscriptions SET plan = 'plus' WHERE plan = 'team';
UPDATE subscriptions SET plan = 'pro' WHERE plan = 'business';
