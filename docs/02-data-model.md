# 02. Data model

## What lives where

| Store | Holds | Why |
|---|---|---|
| D1 `tinyfloor-db` | Accounts, sessions, workspaces, members, invites, rooms, guest links, subscriptions, usage totals | Relational, shared across Workers, queried by the API |
| `Room` Durable Object SQLite | Whiteboard strokes, jukebox state, room settings cache | Belongs to one room, written often, read only by that room |
| WebSocket attachments | Who is connected: position, character, status, seat, meeting | Changes many times a second; must survive hibernation; never persisted |
| R2 | Licensed art (existing) | Files |

Rule: nothing that changes per move, per heartbeat or per stroke point is ever
written to D1. The D1 free plan allows 100,000 rows written per day.

## IDs

All primary keys are text. New records use `crypto.randomUUID()`. User accounts
carried over from MongoDB keep their MongoDB `_id` as text. Nothing else is
carried over.

Timestamps are integers, milliseconds since the Unix epoch.

## D1 schema

### users

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| email | TEXT UNIQUE | Lowercased. Null only for guests |
| email_verified | INTEGER | 1 when it came from Google or a magic link |
| google_sub | TEXT UNIQUE | Google account ID, null until they sign in with Google |
| display_name | TEXT | |
| character | TEXT | One of the character names |
| is_guest | INTEGER | |
| created_at | INTEGER | |
| last_active_at | INTEGER | Updated at most once per hour per user, to save writes |

### sessions

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | SHA-256 of the session token. The token itself is only in the cookie |
| user_id | TEXT | FK users |
| created_at | INTEGER | |
| expires_at | INTEGER | 30 days for accounts, 7 days for guests |
| last_seen_at | INTEGER | Refreshed at most once per day |
| user_agent | TEXT | For a "signed in devices" list later |

Index on `user_id`, index on `expires_at`.

### workspaces

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | |
| owner_id | TEXT | FK users |
| plan | TEXT | `free`, `team10`, `team25`, `team50` (proposal) |
| member_limit | INTEGER | Denormalised from the plan: 3, 10, 25, 50 (proposal) |
| created_at | INTEGER | |

### memberships

| Column | Type | Notes |
|---|---|---|
| workspace_id | TEXT | |
| user_id | TEXT | |
| role | TEXT | `owner`, `admin`, `member` |
| joined_at | INTEGER | |

Primary key `(workspace_id, user_id)`. Index on `user_id`.

### invites

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT | |
| token_hash | TEXT UNIQUE | SHA-256 of the invite token |
| email | TEXT | Optional. When set, only that email can accept |
| role | TEXT | `admin` or `member` |
| created_by | TEXT | |
| expires_at | INTEGER | 7 days |
| accepted_at | INTEGER | Null until used |
| revoked_at | INTEGER | |

### rooms

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | Also the Durable Object name |
| workspace_id | TEXT | |
| name | TEXT | |
| capacity | INTEGER | Capped by the workspace plan, maximum 20 |
| created_by | TEXT | |
| created_at | INTEGER | |
| archived_at | INTEGER | Soft delete |

Index on `workspace_id`.

The public lobby is not a row. Its copies are named `lobby-1`, `lobby-2` and so
on, and are handled by the `LobbyRouter` object.

### guest_links

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| room_id | TEXT | |
| token_hash | TEXT UNIQUE | |
| created_by | TEXT | |
| expires_at | INTEGER | Chosen when creating: 1 day, 7 days, 30 days |
| revoked_at | INTEGER | |

### subscriptions (built with billing)

| Column | Type | Notes |
|---|---|---|
| workspace_id | TEXT PK | |
| provider | TEXT | Stripe or Paddle, decided later |
| provider_customer_id | TEXT | |
| provider_subscription_id | TEXT | |
| plan | TEXT | |
| status | TEXT | `active`, `past_due`, `canceled` |
| current_period_end | INTEGER | |
| updated_at | INTEGER | |

### usage_daily

| Column | Type | Notes |
|---|---|---|
| day | TEXT | `YYYY-MM-DD` |
| room_id | TEXT | |
| workspace_id | TEXT | Null for lobby copies |
| peak_people | INTEGER | |
| person_minutes | INTEGER | |
| sfu_minutes | INTEGER | Participant minutes on meeting tables |

Primary key `(day, room_id)`. The room's Durable Object keeps running totals in
its own SQLite (`usage_pending`) and adds them to today's row when the room
empties, or after an hour in a room that never does
(`worker-realtime/src/usage.ts`). `tinyfloor-realtime` has its own D1 binding
for this one table, so writes stay proportional to active rooms, not to people
or messages. Person minutes are counted as each person leaves; meeting minutes
as they stand up from a table.

### Migrations

Plain SQL files in `worker-api/migrations/`, applied with
`wrangler d1 migrations apply`. Never edited after being applied; changes are
new files.

## Room Durable Object storage

Each `Room` object has its own SQLite database:

```sql
CREATE TABLE IF NOT EXISTS board_strokes (
  id TEXT PRIMARY KEY,
  color TEXT NOT NULL,
  size REAL NOT NULL,
  erase INTEGER NOT NULL,
  points TEXT NOT NULL,      -- JSON array of numbers
  seq INTEGER NOT NULL       -- drawing order
);

CREATE TABLE IF NOT EXISTS room_state (
  key TEXT PRIMARY KEY,      -- 'music', 'settings'
  value TEXT NOT NULL        -- JSON
);
```

Limits carried over from the Java whiteboard: 400 strokes, 4,000 points per
stroke. The oldest stroke is dropped when a 401st arrives.

Strokes are written when a stroke chunk arrives, not on a timer, so an idle
room has nothing pending and can hibernate.

## WebSocket attachment

Serialized with `serializeAttachment`, maximum 16 KB, read back after the object
wakes:

```ts
interface Attachment {
  userId: string;
  name: string;
  character: string;
  guest: boolean;
  role: "owner" | "admin" | "member" | "guest";
  x: number;          // tile
  y: number;          // tile
  status: "available" | "busy" | "away" | "in_call";
  seat: number | null;
  meeting: string | null;
  joinedAt: number;
  moveWindow: number; // start of the current rate-limit second
  moveCount: number;  // moves received in that second
}
```

## Retention (cron, see `04-api.md`)

- Expired sessions: deleted daily.
- Guest users with no session for 7 days: deleted daily (as today).
- Expired or used invites and guest links older than 30 days: deleted daily.
- `usage_daily` older than 13 months: deleted (checked daily, cheap).
- Archived rooms older than 30 days: the room object's storage cleared with
  `deleteAll()` (the `forgetRoom` admin call), then the row deleted.

Each job deletes at most 1,000 rows (50 rooms) per run; the next day picks up
the rest. Built in `worker-api/src/retention.ts`.
