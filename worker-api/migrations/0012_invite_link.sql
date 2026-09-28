-- One invite link per office (docs/15), shared by anyone in it and good until
-- an admin resets it. Kept as it is, not hashed, so it can be shown again; it
-- only lets an account ask for a seat, which the seat limit still decides.
ALTER TABLE offices ADD COLUMN invite_code TEXT;
CREATE UNIQUE INDEX offices_invite_code ON offices (invite_code);
