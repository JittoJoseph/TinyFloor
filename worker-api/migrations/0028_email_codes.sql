-- Signing in by a code sent to the address (src/email-codes.ts) replaces
-- passwords, and with them the reset and confirmation links.
DROP TABLE IF EXISTS email_tokens;

-- The one live code per address, whether or not it has an account yet. Only
-- a hash of the code is kept; it goes when used, or after too many wrong tries.
CREATE TABLE email_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  -- Wrong codes tried against this one.
  attempts INTEGER NOT NULL DEFAULT 0,
  -- Codes sent to the address since window_start: a few an hour at most.
  sends INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);
