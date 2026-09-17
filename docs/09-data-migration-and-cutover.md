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
| `email` (lowercased) | `email` |
| | `email_verified = 0` until they sign in with Google |
| `displayName`, else `username` | `display_name` |
| `avatarPreferences.characterName` | `character` |
| `createdAt`, `lastActiveAt` | `created_at`, `last_active_at` |
| | `is_guest = 0` |

Only accounts with an email and `isGuest = false`. **Not carried over:**
`passwordHash`, `status`, `createdRooms`, `joinedRooms`, `recentCollaborators`,
and all guests.

Carried-over accounts own no workspace. The first time they sign in with Google
using the same email, the account is linked (`03-auth-and-accounts.md`) and they
land on "Create your office".

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
4. **Verify:** D1 count matches the report; three spot-checked accounts sign in
   with Google and keep their name and character.

## Rehearsal

Before the merge, the same scripts import a copy of production accounts into a
local D1 (`wrangler d1 execute tinyfloor-db --local`). The new frontend runs
against it locally, and a carried-over account signs in and is linked. Repeat
until the report is clean.

## Cutover runbook

**Before the day**
- Every milestone in `10-build-order.md` done, with `preview.tinyfloor.com`
  working end to end.
- The pull request from `feature/cloudflare-platform` into master reviewed and
  green.
- A backup of MongoDB taken.

**On the day, with nobody online**
1. Turn on the maintenance switch on the live site: on the `tinyfloor` Worker,
   add the variables `MAINTENANCE=on` and `MAINTENANCE_BYPASS=<a secret>`.
   Every page answers 503 with "Back in a few minutes". Open any page with
   `?bypass=<the secret>` to get through yourself.
2. Stop the Java backend on Railway, so no new accounts are created.
3. Export users, transform, import into `tinyfloor-db`, verify.
4. Merge the pull request. Workers Builds deploys the new frontend, which points
   at `api.tinyfloor.com` and `realtime.tinyfloor.com`.
5. Once the build has deployed, check the site through the bypass, then delete
   `MAINTENANCE` (and `MAINTENANCE_BYPASS`).
6. Smoke test on production: Google sign-in as a carried-over account, create an
   office and a room, invite a second account, enter the lobby as a guest, a
   proximity call, a meeting-table call, whiteboard, jukebox.

**If something is wrong**
- Before step 4: restart Railway and turn off the maintenance switch. Nothing has
  changed for users.
- After step 4: roll the `tinyfloor` Worker back to its previous deployment from
  the Workers dashboard, and restart Railway. MongoDB was never modified. Anything
  created on the new platform in between stays in D1 and is kept for the next
  attempt.

**After a quiet week**
- Railway project shut down.
- MongoDB backup archived; the database deleted.
- `backend-springboot/` gets a `DEPRECATED.md` pointing to these docs.
