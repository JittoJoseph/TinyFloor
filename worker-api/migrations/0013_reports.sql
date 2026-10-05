-- Help and feedback (docs/19): what someone tells the team from inside the
-- app, and the conversation that follows. Who sent it and from where is
-- copied in, so a report outlives a guest's account or a closed office.
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  office_id TEXT REFERENCES offices (id) ON DELETE SET NULL,
  -- The office's name when it was sent, or 'Demo office' for the lobby.
  place TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  page TEXT,
  locale TEXT,
  user_agent TEXT,
  screen TEXT,
  country TEXT,
  -- A link to the session's recording in PostHog, when there is one.
  replay TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  closed_at INTEGER,
  -- When its sender last opened Help and feedback: anything newer is news to them.
  seen_at INTEGER NOT NULL
);

CREATE INDEX reports_user ON reports (user_id, updated_at);
CREATE INDEX reports_status ON reports (status, updated_at);

-- The report itself is its first message; the team's replies have from_team = 1.
CREATE TABLE report_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  from_team INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX report_messages_report ON report_messages (report_id, id);
