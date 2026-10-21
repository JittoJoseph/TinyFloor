-- Who made what someone is playing (a song's or album's artist, an episode's
-- show), from the Open Graph tags on its Spotify page (src/spotify.ts).
ALTER TABLE users ADD COLUMN spotify_subtitle TEXT;
