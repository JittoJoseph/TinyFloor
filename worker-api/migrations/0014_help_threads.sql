-- Help and feedback becomes a conversation (docs/19): one per office, shared by
-- everyone in it, and one per person in the demo office, where strangers mix.
-- It replaces 0013's reports, which only ever held test data.
DROP TABLE report_messages;
DROP TABLE reports;

CREATE TABLE help_threads (
  id TEXT PRIMARY KEY,
  -- An office's conversation. Kept, without the office, if the office closes.
  office_id TEXT UNIQUE REFERENCES offices (id) ON DELETE SET NULL,
  -- A demo office visitor's own conversation; null for an office's.
  user_id TEXT UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  -- The office's name when it started, or 'Demo office'.
  place TEXT NOT NULL,
  -- 'done' once the team has dealt with it; anything new from them opens it again.
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX help_threads_activity ON help_threads (status, updated_at);

-- Who said what. The team's messages have from_team = 1 and no user. The
-- context (page, browser, the PostHog recording) comes with each of theirs.
CREATE TABLE help_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL REFERENCES help_threads (id) ON DELETE CASCADE,
  from_team INTEGER NOT NULL DEFAULT 0,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  body TEXT NOT NULL,
  page TEXT,
  locale TEXT,
  user_agent TEXT,
  screen TEXT,
  country TEXT,
  replay TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX help_messages_thread ON help_messages (thread_id, id);
CREATE INDEX help_messages_user ON help_messages (user_id, created_at);

-- How far each person has read. Only those who have taken part have a row,
-- so only they are told about something new.
CREATE TABLE help_reads (
  thread_id TEXT NOT NULL REFERENCES help_threads (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seen_id INTEGER NOT NULL,
  PRIMARY KEY (thread_id, user_id)
);
