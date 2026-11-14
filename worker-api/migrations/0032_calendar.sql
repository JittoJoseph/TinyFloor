-- Someone's Google Calendar, connected from Settings to show the office when
-- they're in a meeting (src/calendar.ts). Read-only access; the tokens are
-- kept encrypted, and go with the account or when it's disconnected (which
-- also takes the access back at Google). show_titles: whether their office
-- sees an event's title, not just that they're busy.
CREATE TABLE calendar_links (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  email TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_until INTEGER,
  show_titles INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
