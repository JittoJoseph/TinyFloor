-- Google Meet rooms were tried on preview and taken out again; nothing on live
-- ever held them. Drop the tables wherever migration 0007 made them.
DROP TABLE IF EXISTS google_grants;
DROP TABLE IF EXISTS meeting_rooms;
