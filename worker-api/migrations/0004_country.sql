-- The country someone last signed in or showed up from, as Cloudflare reads it
-- off the connection (ISO 3166 letters). Nothing more exact is kept. It is for
-- the admin view: where people come from, not where they are.
ALTER TABLE users ADD COLUMN country TEXT;
