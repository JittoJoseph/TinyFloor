-- Calls on the floor, counted per office and day (docs/24): minutes in a call,
-- and the part of them with video coming in. Counted only, never limited.
ALTER TABLE usage_daily ADD COLUMN call_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage_daily ADD COLUMN call_video_minutes INTEGER NOT NULL DEFAULT 0;
