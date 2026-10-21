-- What someone shared they're listening to on Spotify (src/spotify.ts): the
-- link, and its name and cover as Spotify gave them. spotify_until is when the
-- share clears itself; the link stays after, so it can be shared again.
ALTER TABLE users ADD COLUMN spotify_url TEXT;
ALTER TABLE users ADD COLUMN spotify_kind TEXT;
ALTER TABLE users ADD COLUMN spotify_title TEXT;
ALTER TABLE users ADD COLUMN spotify_image TEXT;
ALTER TABLE users ADD COLUMN spotify_until INTEGER;
