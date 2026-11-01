-- The floor each office is on (shared-protocol's map.ts FLOORS): Startup,
-- where every office began, until the team moves it to another from the
-- admin view. The room is told by its ticket, and its desks follow.
ALTER TABLE offices ADD COLUMN floor TEXT NOT NULL DEFAULT 'startup';
