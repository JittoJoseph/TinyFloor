-- Accounts, teams and rooms. Live presence never lives here; see docs/02-data-model.md.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  google_sub TEXT UNIQUE,
  display_name TEXT NOT NULL,
  character TEXT NOT NULL DEFAULT 'Adam',
  is_guest INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE INDEX users_guest_activity ON users (is_guest, last_active_at);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expiry ON sessions (expires_at);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users (id),
  plan TEXT NOT NULL DEFAULT 'free',
  member_limit INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL
);

CREATE TABLE memberships (
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX memberships_user ON memberships (user_id);

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  revoked_at INTEGER
);

CREATE INDEX invites_workspace ON invites (workspace_id);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity BETWEEN 2 AND 20),
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE INDEX rooms_workspace ON rooms (workspace_id);

CREATE TABLE guest_links (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX guest_links_room ON guest_links (room_id);

CREATE TABLE subscriptions (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE usage_daily (
  day TEXT NOT NULL,
  room_id TEXT NOT NULL,
  workspace_id TEXT,
  peak_people INTEGER NOT NULL DEFAULT 0,
  person_minutes INTEGER NOT NULL DEFAULT 0,
  sfu_minutes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, room_id)
);
