-- Where someone is, as an IANA zone ("Europe/Berlin"), so the people they work
-- with see their local time. Their browser's zone until they pick one in
-- settings; time_zone_auto says which.
ALTER TABLE users ADD COLUMN time_zone TEXT;
ALTER TABLE users ADD COLUMN time_zone_auto INTEGER NOT NULL DEFAULT 1;
