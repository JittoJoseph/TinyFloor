-- The team trial (docs/22): an office's first 14 days with a team are on Plus.
-- NULL: never had one. A time: the trial runs until then. 0: it's over, or a
-- plan was bought or given in its place.
ALTER TABLE offices ADD COLUMN trial_ends_at INTEGER;
