-- Help and feedback becomes tickets (docs/19): an office can have several
-- issues open with the team at once, each its own conversation in Chat until
-- the team closes it. Replaces 0014's one conversation per office, which only
-- ever held test data.
DROP TABLE help_reads;
DROP TABLE help_messages;
DROP TABLE help_threads;

CREATE TABLE help_tickets (
  id TEXT PRIMARY KEY,
  -- The office it was opened in; kept, without the office, if the office closes.
  office_id TEXT REFERENCES offices (id) ON DELETE SET NULL,
  -- Who opened it.
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  -- Opened in the demo office, where strangers mix: only its opener sees it.
  lobby INTEGER NOT NULL DEFAULT 0,
  -- The office's name when it was opened, or 'Demo office'.
  place TEXT NOT NULL,
  -- The first line of the first message, as its name in Chat.
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- How far the team has read.
  team_seen_id INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER
);

CREATE INDEX help_tickets_office ON help_tickets (office_id, status);
CREATE INDEX help_tickets_user ON help_tickets (user_id, status);
CREATE INDEX help_tickets_activity ON help_tickets (updated_at);

-- Who said what. The team's messages have from_team = 1 and no user. Each of
-- theirs carries where it was written from (page, browser, the PostHog recording).
CREATE TABLE help_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES help_tickets (id) ON DELETE CASCADE,
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

CREATE INDEX help_messages_ticket ON help_messages (ticket_id, id);
CREATE INDEX help_messages_user ON help_messages (user_id, created_at);

-- How far each person has read a ticket. Only those who have opened it have a
-- row, so only they are told about something new in it.
CREATE TABLE help_reads (
  ticket_id TEXT NOT NULL REFERENCES help_tickets (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seen_id INTEGER NOT NULL,
  PRIMARY KEY (ticket_id, user_id)
);
