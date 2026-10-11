-- Pro is made for small teams (docs/24): an office on it holds up to 15.
-- Members already past that stay; only new ones wait for room.
UPDATE offices SET seats = 15 WHERE plan = 'pro';
