-- A link someone chooses to show on their profile (a website, a portfolio), seen
-- by the people they chat with. Accounts only; guests have no profile.
ALTER TABLE users ADD COLUMN link TEXT;
