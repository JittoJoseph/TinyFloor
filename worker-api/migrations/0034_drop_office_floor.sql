-- Every office is on Campus now (shared-protocol's map.ts FLOOR), so the floor
-- each office was on is no longer kept.
ALTER TABLE offices DROP COLUMN floor;
