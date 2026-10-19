-- Whether colleagues can find and join an office by their work email: anyone
-- signed in with a verified address at the owner's company domain. NULL is the
-- default (on, except for a university's domain), 1 and 0 an admin's choice.
ALTER TABLE offices ADD COLUMN domain_join INTEGER;
