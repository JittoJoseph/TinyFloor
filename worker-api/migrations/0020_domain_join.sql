-- How colleagues at the owner's company (anyone signed in with a verified
-- address at its email domain) find the office: 'open' to walk straight in,
-- 'ask' to join and an admin lets them in, or 'off' not to see it at all.
-- NULL is the default: open, except at a university's domain, where it's off.
ALTER TABLE offices ADD COLUMN domain_join TEXT;

-- Colleagues asking to join, until an admin lets them in or turns them away.
CREATE TABLE join_requests (
  office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (office_id, user_id)
);
