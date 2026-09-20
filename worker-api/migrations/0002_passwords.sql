-- Email and password sign-in. Hashes are bcrypt, the same format as the Java
-- backend's, so carried-over accounts keep their passwords.
ALTER TABLE users ADD COLUMN password_hash TEXT;
