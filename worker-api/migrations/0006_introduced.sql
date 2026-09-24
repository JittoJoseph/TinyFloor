-- When someone first said who they are on the floor: the name people see and
-- the character they walk in as, asked at their first door. An account made
-- with just an email, or with Google, hasn't yet; everyone before this had.
ALTER TABLE users ADD COLUMN introduced_at INTEGER;
UPDATE users SET introduced_at = created_at;
