-- An office is a floor. Workspaces become offices, the rooms table goes away,
-- and the office's own id names the room everyone walks into. Roles drop to
-- two: admin and member.

ALTER TABLE workspaces RENAME TO offices;
ALTER TABLE offices RENAME COLUMN member_limit TO seats;

-- SQLite cannot alter a CHECK, so the tables that carry a role are rebuilt.
CREATE TABLE memberships_new (
  office_id TEXT NOT NULL REFERENCES offices (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (office_id, user_id)
);

INSERT INTO memberships_new (office_id, user_id, role, joined_at)
  SELECT workspace_id, user_id, CASE role WHEN 'owner' THEN 'admin' ELSE role END, joined_at
  FROM memberships;

DROP TABLE memberships;
ALTER TABLE memberships_new RENAME TO memberships;
CREATE INDEX memberships_user ON memberships (user_id);

CREATE TABLE invites_new (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  revoked_at INTEGER
);

INSERT INTO invites_new (id, office_id, token_hash, email, role, created_by, created_at, expires_at, accepted_at, revoked_at)
  SELECT id, workspace_id, token_hash, email, role, created_by, created_at, expires_at, accepted_at, revoked_at
  FROM invites;

DROP TABLE invites;
ALTER TABLE invites_new RENAME TO invites;
CREATE INDEX invites_office ON invites (office_id);

-- Guest links let someone onto the floor, which is the office itself.
CREATE TABLE guest_links_new (
  id TEXT PRIMARY KEY,
  office_id TEXT NOT NULL REFERENCES offices (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);

INSERT INTO guest_links_new (id, office_id, token_hash, created_by, created_at, expires_at, revoked_at)
  SELECT g.id, r.workspace_id, g.token_hash, g.created_by, g.created_at, g.expires_at, g.revoked_at
  FROM guest_links g JOIN rooms r ON r.id = g.room_id;

DROP TABLE guest_links;
ALTER TABLE guest_links_new RENAME TO guest_links;
CREATE INDEX guest_links_office ON guest_links (office_id);

DROP TABLE rooms;

-- Usage is per floor, and the public lobby keeps its own id.
CREATE TABLE usage_daily_new (
  day TEXT NOT NULL,
  office_id TEXT NOT NULL,
  peak_people INTEGER NOT NULL DEFAULT 0,
  person_minutes INTEGER NOT NULL DEFAULT 0,
  sfu_minutes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, office_id)
);

INSERT INTO usage_daily_new (day, office_id, peak_people, person_minutes, sfu_minutes)
  SELECT day, room_id, peak_people, person_minutes, sfu_minutes FROM usage_daily;

DROP TABLE usage_daily;
ALTER TABLE usage_daily_new RENAME TO usage_daily;

ALTER TABLE subscriptions RENAME COLUMN workspace_id TO office_id;
