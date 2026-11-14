-- Each connected calendar's busy times, as its office sees them (src/calendar.ts,
-- the team's day): when they're busy, out or focusing, and a title only where
-- its owner shows titles and the event isn't private. Read from Google at most
-- every few minutes, whoever asks; gone with the account or the calendar.
CREATE TABLE calendar_busy (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  from_ms INTEGER NOT NULL,
  to_ms INTEGER NOT NULL,
  blocks TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
