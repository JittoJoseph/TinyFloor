-- Every office starts on the Pro trial now (docs/pricing.md), not only one a
-- fourth person joins. Offices that never had a trial and never paid get theirs
-- from today: 14 days of Pro, up to 15 people.
UPDATE offices
SET plan = 'pro',
    seats = 15,
    trial_ends_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000 + 14 * 86400000
WHERE plan = 'free'
  AND trial_ends_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.office_id = offices.id);
