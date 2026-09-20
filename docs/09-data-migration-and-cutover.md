# 09. Data migration and cutover

TinyFloor restarts fresh on the new platform. **Only user accounts are carried
over.** Rooms, whiteboards, room passwords, share codes, guests and everything
else start empty.

By the time of the merge, every Cloudflare resource and both backend Workers are
already live (see `08-cloudflare-setup.md`). The switch is the merge itself, done
at a time with nobody online.

## What is carried over

MongoDB collection `users` only:

| MongoDB | D1 `users` |
|---|---|
| `_id` | `id` |
| `email` (trimmed, lowercased) | `email` |
| `passwordHash` (bcrypt `$2a$10$`) | `password_hash`, upgraded to cost 11 on first sign-in |
| | `email_verified = 0` |
| `displayName`, else `username`, cleaned like any display name | `display_name` |
| `avatarPreferences.characterName`, else `Adam` | `character` |
| `createdAt`, `lastActiveAt` | `created_at`, `last_active_at` |
| | `is_guest = 0` |

Only accounts with an email, a bcrypt password and `isGuest = false`. When two
accounts share an email in different case, the one used most recently is kept.
**Not carried over:** `username`, `status`, `createdRooms`, `joinedRooms`,
`recentCollaborators`, and all guests.

Carried-over accounts own no workspace. They sign in with their email and old
password and land on "Create your workspace".

**Accounts without an email.** The Java backend signed people in by username,
and email was optional. Those accounts can't sign in on the new platform and
are left out (reason `no_email` in the report) and can register again. In the
rehearsal on 2026-09-17 that was 9 of 18 accounts.

## Tooling

`tools/migrate-users-to-d1/` (Node, run locally, never deployed):

1. **Export:** reads `users` with the official MongoDB driver into a JSON file
   under a gitignored folder.
2. **Transform:** applies the mapping and writes:
   - `users.sql`: `INSERT OR IGNORE` statements in batches of 500. An email that
     already exists in D1 (someone who signed up on the new platform before the
     merge) is left untouched.
   - A report: accounts in, accounts written, and every skipped record with the
     reason (no email, guest, duplicate email).
3. **Import:** `wrangler d1 execute tinyfloor-db --remote --file users.sql`
4. **Verify:** `verify.mjs` checks every written account is in D1 with the same
   id, password hash, name, character and dates; an email already taken by a
   new account is reported and left alone.

## Rehearsal

Before the merge, the same scripts import production accounts into the local D1
(`import.mjs --local`), and a carried-over Java hash signs in through the local
API. Repeat until the report is clean.

**2026-09-17:** two fresh runs in a row, both clean (18 in, 9 written, 9
`no_email`). A synthetic account with a Java `$2a$10$` hash signed in with its
old password through the local API, kept its name and character, and its hash
was upgraded to cost 11.

## Cutover runbook

**Before the day**
- Every milestone in `10-build-order.md` done, with `preview.tinyfloor.com`
  working end to end.
- The pull request from `dev` into master reviewed and
  green.
- A backup of MongoDB taken.

**On the day, with nobody online**
1. Stop the Java backend on Railway, so no new accounts are created.
2. In `tools/migrate-users-to-d1`: `export.mjs`, `transform.mjs`, read the
   report, `import.mjs --remote`, `verify.mjs --remote`.
3. Merge the pull request. Workers Builds deploys the new frontend, which points
   at `api.tinyfloor.com` and `realtime.tinyfloor.com`.
4. Smoke test on production: sign in as a carried-over account, create a
   workspace and a room, invite a second account, enter the lobby as a guest, a
   proximity call, a meeting-table call, whiteboard, jukebox.

**If something is wrong**
- Before step 3: restart Railway. Nothing has changed for users.
- After step 3: roll the `tinyfloor` Worker back to its previous deployment from
  the Workers dashboard, and restart Railway. MongoDB was never modified. Anything
  created on the new platform in between stays in D1 and is kept for the next
  attempt.

**After a quiet week**
- Railway project shut down.
- MongoDB backup archived; the database deleted.
- `backend-springboot/` gets a `DEPRECATED.md` pointing to these docs.
