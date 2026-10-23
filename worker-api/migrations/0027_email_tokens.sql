-- One-time links sent by email (src/email-links.ts): confirming an address,
-- and choosing a new password. Only a hash of each token is kept, as with
-- sessions; a link stops working once used, or when it expires.
CREATE TABLE email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 'verify' or 'reset'.
  kind TEXT NOT NULL,
  -- The address it went to: a link for an address the account no longer has does nothing.
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX email_tokens_user ON email_tokens (user_id, kind);
