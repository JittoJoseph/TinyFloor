-- Someone's permission for us to make Google Meet rooms as them: the refresh
-- token Google gave us, and the access token it last traded for, both sealed
-- with GOOGLE_TOKEN_KEY. The Google account can differ from the one they sign
-- in with (a work account for meetings, say), so it is named here.
CREATE TABLE google_grants (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  google_sub TEXT NOT NULL,
  google_email TEXT NOT NULL,
  scope TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_expires_at INTEGER,
  granted_at INTEGER NOT NULL
);

-- An office's meeting room: one Google Meet space, made by an admin with their
-- grant. We keep the space's name, which is permanent, and its link.
CREATE TABLE meeting_rooms (
  office_id TEXT PRIMARY KEY REFERENCES offices (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_meet')),
  space_name TEXT NOT NULL,
  meeting_uri TEXT NOT NULL,
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
