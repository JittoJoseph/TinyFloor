# Gather, looked at properly

Notes from using Gather v2 (app.v2.gather.town) on 21 September 2026, in a real
signed-in office, plus the signed-out onboarding and the public pricing pages.
Screenshots sit beside this file in `onboarding/`, `app/`, `chat/`, `pricing/`
and `costs/`; they are gitignored, because they are someone else's product.

The point of this is not to copy the look. It is to see **what makes the thing
usable by a team all day**, which is the part we are missing.

## 1. What Gather actually is

A map you walk around is maybe a fifth of the product. The rest is an office
shell: a permanent left rail, and the map is only one of the views inside it.

| Rail item | Route | What it is |
|---|---|---|
| Logo / space | `/app/:space` | the space, and a space switcher |
| Search | ⌘K palette | people, channels, rooms |
| Map | `/app/:space` | the floor, the game |
| Chat | `/app/:space/chat` | a Slack: channels, DMs, threads |
| Calendar | `/app/:space/calendar` | meetings, Google Calendar sync |
| Activity | `/app/:space/activity-feed` | mentions and replies |
| Settings | `?modal=settings&tab=…` | preferences and office admin |

Two things are worth stealing outright:

1. **Views are routes, not floating windows.** A view fills everything right of
   the rail. Modals are URL state (`?modal=settings&tab=chat`), so every screen
   is linkable and the back button works.
2. **You never leave the room.** In every non-map view, the bottom of the second
   column keeps a small live map of where you are standing plus the same
   mic/camera bar. Chat does not take you out of the office; it sits beside it.
   (`app/12.calendar-view.png`, `chat/01.chat-view-channels.png`.)

The second column changes with the rail item — people online for the map, the
channel list for chat, scheduled meetings for the calendar — and it carries a
promo card at the top nudging you to invite people until you have.

## 2. Onboarding

Signed out, `gather.town` → **Create Space** works before you have an account:
"What are you looking to do on Gather?" → *Remote office* or *Conference* or
*advanced templates* (`onboarding/03`), then a preview of the office with a
value-prop carousel (`onboarding/04`–`08`) and only then a sign-in wall.

Joining a space is a **green room**, not a character picker
(`app/02.join-green-room.png`): camera preview, mic and camera toggles with
device dropdowns, your name, one **Join** button. There is no avatar step at
all — the avatar was chosen once, on the account.

Entering the office for the first time drops onboarding nudges into the
activity feed ("Your desk is ready", "Chat activity lives here") rather than
gating the screen with a tour.

Friction they accept that we should not: an interstitial pushing the desktop
app (`app/04.desktop-app-interstitial.png`) and a slow cold boot ("Loading
data…" for several seconds) on any hard navigation.

## 3. Chat — the part we do not have

`chat/01.chat-view-channels.png` is the shape: channel list, `# general` open
with a channel intro card, grouped messages with date separators, and a
composer with a formatting toolbar.

What exists:

- **Channels**, public or private (`chat/02.create-channel-dialog.png`: name,
  and a visibility radio, nothing else). A new office starts with `general` and
  `social`.
- **Direct messages**, one-to-one, listed under the channels.
- **Threads**: every message has a reply bubble on hover, beside 👍 😂 ❤️ quick
  reactions, an emoji picker and an overflow menu.
- **Rich text**: bold, italic, strike, link, ordered and bullet lists,
  blockquote, code, plus mentions, emoji and **attachments** (paperclip).
- **Drafts** as a first-class item above the channel list.
- **Channel details** as a modal: About (description, created by), members, and
  your own notification preferences.

The admin toggles (`chat/04.chat-settings-toggles.png`) are the clearest
statement of their model, and they draw exactly the line we should draw:

| Toggle | Semantics, in their words |
|---|---|
| Gather Chat Channels | public and private channels; "messages are visible indefinitely" |
| Gather Chat in Meetings | messages scoped to a meeting, kept in the meeting artifacts |
| **Send Nearby in Map View** | "transient … visible for a short period of time" |
| Direct Messages | private, "visible indefinitely" |

So: **durable chat** (channels, DMs) and **transient chat** (nearby, in the
map) are different features with different storage. Our current room chat is
their "nearby" — we have the throwaway one and none of the durable one.

## 4. Members, guests and seats

Three separate ideas, each with its own screen:

- **Members** (`app/06.manage-members.png`): a table of name, role (Admin /
  Member), last active. Tabs: *Member List (1)* and *Invitations (0)* — an
  invitation is not a member and is counted separately.
- **Guests** (`app/07.manage-guests.png`): their own list with a lifecycle —
  All / Active / Expired / Revoked / Archived.
- The invite modal (`app/10`, `app/11`) defines both in one line each:
  - member: "can have their own desk and decorate the office"
  - guest: "must be let in by someone in the office, and can't claim a desk or
    decorate"

Security settings (`app/09`): domain-based membership (anyone with the company
email domain becomes a member automatically), and **"Allow members to invite
other members" is off by default** — only admins invite.

Billing (`pricing/03.in-app-billing-seats.png`) counts **members**, not
sessions: "1 member", "$12 per member/month" billed annually ($15 monthly),
plus "30 base guest hours, 3 guest hours per member". Guests are metered by
time; members are the seat.

That is precisely the model asked for here: **membership is the seat, and an
invitation is not**. Their trial is a 28-day auto-cancelling one rather than a
free tier, which is where we differ — we want a genuinely free small office.

## 5. Conversation and room settings worth noting

`app/08.conversations-settings.png`: ambient audio/video on or off, a
conversation **range** picked from two illustrated cards (short / long), and
auto-lock desks space-wide. Illustrated radio cards beat a select box for
anything spatial; worth copying for our own room settings.

## 6. What we take, and what we leave

Take:

- the permanent rail, views as routes, modals as URL state
- the presence dock (small map + mic/camera) in every non-map view
- durable channels + DMs, transient nearby chat, kept apart
- member / guest / invitation as three separate things, seats counted on members
- the green room before joining, and a settings modal split into
  *Preferences* (mine) and *Office* (admin)

Leave:

- desktop app push, heavy cold boot, the 20-second "Loading data…"
- threads, drafts, rich-text toolbars, calendars and integrations on day one
- decorating, desk ownership, smart objects — the gimmick surface
- per-member pricing at $12–15; our costs do not justify it and our buyer is
  smaller
