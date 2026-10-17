-- A status note beside your status ("🍜 Lunch, back at 2"), kept with the
-- account so it holds across visits and shows in People while you're away. It
-- can clear itself: past status_until it's as if there were none.
ALTER TABLE users ADD COLUMN status_emoji TEXT;
ALTER TABLE users ADD COLUMN status_text TEXT;
ALTER TABLE users ADD COLUMN status_until INTEGER;

-- Who can share the office's invite link: everyone in it (the default), or only admins.
ALTER TABLE offices ADD COLUMN invite_policy TEXT NOT NULL DEFAULT 'everyone';
