-- A service we lean on that is out for a while, so the app stops asking it and says so:
-- 'email' when Resend's daily (or monthly) sending allowance ran out (src/email.ts).
CREATE TABLE service_pauses (
  service TEXT PRIMARY KEY,
  until INTEGER NOT NULL,
  reason TEXT NOT NULL
);
