-- Help and feedback (docs/19): a ticket with the TinyFloor team, one open at
-- a time for an office (shared by everyone in it) or for a demo office visitor.
-- Earlier drafts of this left tables on the preview database; they held only
-- test data and go first.
DROP TABLE IF EXISTS help_reads;
DROP TABLE IF EXISTS help_messages;
DROP TABLE IF EXISTS help_tickets;
DROP TABLE IF EXISTS help_threads;
DROP TABLE IF EXISTS report_messages;
DROP TABLE IF EXISTS reports;

CREATE TABLE help_tickets (
  id TEXT PRIMARY KEY,
  -- The office it was opened in; kept, without the office, if the office closes.
  office_id TEXT REFERENCES offices (id) ON DELETE SET NULL,
  -- Opened in the demo office, where strangers mix: only its opener sees it.
  lobby INTEGER NOT NULL DEFAULT 0,
  -- Who opened it, and where, as they were then.
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  place TEXT NOT NULL,
  -- What the team needs to look into it: the page, the browser and its
  -- window, the language and country, and the PostHog recording.
  page TEXT,
  user_agent TEXT,
  screen TEXT,
  locale TEXT,
  country TEXT,
  replay TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- How far the team has read.
  team_seen_id INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER
);

-- One open ticket at a time, for an office and for a visitor.
CREATE UNIQUE INDEX help_tickets_open_office ON help_tickets (office_id) WHERE status = 'open' AND lobby = 0;
CREATE UNIQUE INDEX help_tickets_open_visitor ON help_tickets (user_id) WHERE status = 'open' AND lobby = 1;
CREATE INDEX help_tickets_status ON help_tickets (status, updated_at);

-- Who said what; the team's messages have from_team = 1 and no user.
CREATE TABLE help_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES help_tickets (id) ON DELETE CASCADE,
  from_team INTEGER NOT NULL DEFAULT 0,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX help_messages_ticket ON help_messages (ticket_id, id);
CREATE INDEX help_messages_user ON help_messages (user_id, created_at);

-- How far each person has read a ticket. Only those who have opened it have
-- a row, so only they are told about something new in it.
CREATE TABLE help_reads (
  ticket_id TEXT NOT NULL REFERENCES help_tickets (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seen_id INTEGER NOT NULL,
  PRIMARY KEY (ticket_id, user_id)
);
