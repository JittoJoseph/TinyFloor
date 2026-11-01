-- When an office was last used: someone on its floor (the room writes it with
-- its usage) or someone writing in its chat. Not when one of its people was
-- signed in somewhere else, which is what the admin view read before.
ALTER TABLE offices ADD COLUMN active_at INTEGER;
-- What there is to go on so far: the last day anyone was on its floor.
UPDATE offices SET active_at = (
  SELECT CAST((julianday(MAX(day)) - 2440587.5) * 86400000 AS INTEGER) FROM usage_daily WHERE office_id = offices.id
);
