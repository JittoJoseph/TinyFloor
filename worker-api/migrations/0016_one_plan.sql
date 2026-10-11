-- One paid plan (docs/23): offices and subscriptions on Plus move to Pro.
UPDATE offices SET plan = 'pro', seats = 25 WHERE plan = 'plus';
UPDATE subscriptions SET plan = 'pro' WHERE plan = 'plus';
