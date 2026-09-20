# 11. Offices, members and seats

The model we have was built for a product with many rooms per workspace. That
is not the product. This collapses it.

## One office, one floor

**An office is a floor.** Not a container of rooms — the floor itself, with its
desks, its meeting table, its whiteboard and its jukebox. Nobody creates rooms,
because there is nothing to create: you make an office and you are standing in
it.

The public lobby is the same thing with the door left open.

That removes a whole screen (room list), a whole flow (create room), a table,
and the question every new admin currently faces — *how many rooms should we
have?* — which has no good answer for a team of five.

If a team ever outgrows one floor, the answer is a second office, not a room
list. That is a decision for when someone asks.

## Two roles

| Role | Can |
|---|---|
| **Admin** | everything a member can, plus invite and remove members, promote a member to admin, rename the office, manage guest links, change floor settings, hold the subscription |
| **Member** | be in the office, talk, chat, share a screen, use an existing guest link |

The creator is the first admin. `owner_id` stays on the office for billing, but
it grants nothing the admin role does not — an office with two admins keeps
working when one of them is on holiday.

Guests are not a role. A guest arrives on a link, cannot be promoted, and has
no seat.

## Seats

**Membership is the seat.** Not the invitation, not the session.

```
seats used = COUNT(memberships WHERE office = ?)
```

- 10/10 and Alice leaves → 9/10, the next person can join.
- 10/10 and Alice closes her laptop → still 10/10.
- Ten invitations outstanding against three seats is fine. They are refused at
  **accept** time, one at a time, with a message that says the office is full
  and what it costs to make it bigger.

The check lives in one place — accepting an invitation — because that is the
only moment membership grows. Everything else (sign-in, walking in, opening
chat) just reads it.

## The schema, after

Renames and deletions against what we have today (16 users, 1 workspace, 1
room, 2 memberships live, so this is a small, safe migration):

```sql
-- offices replace workspaces
ALTER TABLE workspaces RENAME TO offices;          -- id, name, owner_id, plan, created_at
ALTER TABLE offices RENAME COLUMN member_limit TO seats;

-- the floor is the office: no rooms table, no room ids anywhere
ALTER TABLE guest_links RENAME COLUMN room_id TO office_id;
ALTER TABLE usage_daily RENAME COLUMN room_id TO office_id;
DROP TABLE rooms;

-- two roles, not three
UPDATE memberships SET role = 'admin' WHERE role = 'owner';
-- CHECK (role IN ('admin','member')) — rebuilt, SQLite cannot alter a CHECK
```

The realtime object is named by the office id rather than a room id, and the
public lobby keeps its fixed id (`lobby-1`), so the one row in `usage_daily`
that already uses it stays valid.

`capacity` disappears with the rooms table. How many people can be inside at
once is the seat count plus whatever guests are let in, not a separate number
an admin has to think about.

## What each screen becomes

| Screen | Now | After |
|---|---|---|
| Dashboard | a list of workspaces, each with a list of rooms | your offices; one click walks in |
| Space page | rooms, people, settings tabs | gone — the office *is* the floor, and the shell's rail holds the rest |
| Create | office → then a room | office only, and you are standing in it |
| People | a member table | the same table, with seats used and a clear upgrade line |

## Joining, in one path

1. An admin invites by link or email.
2. The invitee opens the link, gives a name and picks a character (the two-step
   door we already have), and signs in or signs up.
3. On accept: seats are counted. Under the limit → membership row, straight
   into the office. At the limit → a plain page saying the office is full, and
   the admin is told.

Guests skip all of it: a guest link puts them on the floor with a name and a
character, no account, no seat, and access ends when the link does.
