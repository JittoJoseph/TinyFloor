-- Meeting hours (docs/14): each office's time with two or more people in a
-- meeting, per calendar month (UTC), copied here by its room so the API can
-- show it next to the plan. The room's own SQLite keeps the running count.
CREATE TABLE usage_monthly (
  office_id TEXT NOT NULL,
  period TEXT NOT NULL,
  meeting_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (office_id, period)
);
