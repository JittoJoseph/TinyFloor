# 09. Data migration and cutover

The switch happens once, at a time with nobody online, after everything in
`10-build-order.md` is done and rehearsed on staging.

## What moves, and how it maps

MongoDB collections: `users`, `rooms`, `whiteboards`.

### users

| MongoDB | D1 `users` |
|---|---|
| `_id` | `id` |
| `email` (lowercased) | `email` |
| | `email_verified = 0` until they sign in with Google |
| `displayName`, else `username` | `display_name` |
| `avatarPreferences.characterName` | `character` |
| `createdAt`, `lastActiveAt` | `created_at`, `last_active_at` |

Only accounts with an email and `isGuest = false`. **Not carried over:**
`passwordHash`, `status`, `createdRooms`, `joinedRooms`, `recentCollaborators`,
and all guests.

When someone signs in with Google using the same email, the account is linked
(`03-auth-and-accounts.md`).

### rooms

For each room that is not archived, has an `ownerId` belonging to a carried-over
account, and is not the lobby:

| MongoDB | D1 |
|---|---|
| Owner | One workspace per owner, named "<name>'s office", plan `free`, owner membership |
| `_id` | `rooms.id` |
| `name` | `rooms.name` |
| `maxPlayers` (capped at 20) | `rooms.capacity` |
| `createdAt` | `rooms.created_at` |

**Not carried over:** `passwordHash` (rooms are private to members now),
`shareCode` (owners create guest links), `users`, `status`, and rooms owned by
guests or nobody.

People who were only visitors in someone's room don't become members. Owners
invite them again.

### whiteboards

For each carried-over room with a whiteboard, the strokes are sent to that room's
object through `importBoard(strokes)`, protected by `ADMIN_TOKEN`.

## Tooling

`tools/migrate-mongo-to-d1/` (Node, run locally, not deployed):

1. **Export:** reads the three collections with the official MongoDB driver into
   JSON files under a gitignored folder.
2. **Transform:** applies the mapping above and writes:
   - `d1-import.sql`: `INSERT` statements in batches of 500, in dependency order
     (users, workspaces, memberships, rooms);
   - `boards.json`: room id to strokes.
   - A report: counts in, counts out, and every record skipped with the reason.
3. **Import:**
   `wrangler d1 execute tinyfloor-db --remote --file d1-import.sql`
4. **Boards:** posts `boards.json` room by room to an admin-only endpoint on
   `tinyfloor-realtime`.
5. **Verify:** counts in D1 match the report; five spot-checked accounts, rooms
   and boards.

The same scripts run against staging first, with a copy of production data.

## Rehearsal on staging

1. Export production MongoDB.
2. Import into `tinyfloor-db-staging` and the staging rooms.
3. Point `staging.tinyfloor.com` at staging.
4. Walk through: sign in with Google as a migrated account, see the workspace
   and room, see the whiteboard, invite someone, enter the lobby as a guest,
   hold a proximity call and a meeting-table call.
5. Fix anything, repeat until clean.

## Cutover runbook

**Before the day**
- Every milestone in `10-build-order.md` done on staging.
- Production D1, secrets, custom domains, TURN key, SFU app, Turnstile and
  Google redirect URIs created (`08-cloudflare-setup.md`).
- `tinyfloor-api` and `tinyfloor-realtime` deployed to production, reachable but
  unused.
- A backup of MongoDB taken.

**On the day, with nobody online**
1. Put the current site into a "back in a few minutes" state with the
   maintenance switch built in M8 (a Worker variable read by the site's
   middleware), so no deploy is needed.
2. Stop the Java backend on Railway, so no new data is written.
3. Export MongoDB, transform, import into production D1, import boards.
4. Verify counts and spot checks.
5. Make the new frontend the production build: merge
   `feature/cloudflare-platform` into master, or set the `tinyfloor` Worker's
   production branch to it. **This is decided on the day, by you.** The docs
   don't assume either.
6. Deploy, clear the maintenance flag.
7. Smoke test on production: Google sign-in, dashboard, room entry, lobby as a
   guest, a proximity call, a meeting-table call, whiteboard, jukebox.

**If something is wrong**
- Before step 5: restart Railway and clear the maintenance flag. Nothing has
  changed for users.
- After step 5: redeploy the previous frontend build from the Workers dashboard
  and restart Railway. MongoDB was never modified, so it is still complete. Any
  data created on the new platform in between is lost, which is why this runs
  when nobody is online.

**After a quiet week**
- Railway project shut down.
- MongoDB backup archived; the database deleted.
- `backend-springboot/` gets a `DEPRECATED.md` pointing to these docs.
- `ADMIN_TOKEN` secrets deleted; the import endpoints removed in the next
  realtime deploy.
