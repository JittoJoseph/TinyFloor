# What keeps a team on the floor

Findings and decisions about the product itself, October 2026: who tries it,
what makes a team stay, and what we deliberately don't build.

## Who tries it, and the two moments that matter

Someone on a small remote team (2–10 people) tries TinyFloor alone first,
decides in minutes whether it feels right, and only then brings the team. On
11 October, 22 of our 28 offices had one person: people who tried and didn't
stay. Two moments decide everything: **the first minutes alone**, and **the
day the team arrives**. The team trial (`pricing.md`) is for the second.

**Retention is a team property.** Slack's best-known finding is that teams
that had exchanged about 2,000 messages (a week for a team of ten) almost
all stayed. A person on an empty floor leaves; a team that has made it its
place stays. Anything that makes the team's presence visible matters more
than anything built for one person.

The number to watch: the share of new offices where three or more people are
on the floor on the same day within the first week.

## For real work, not a game

TinyFloor should be like Linear: people come back because it's where the
work happens. What we don't build, though each would raise usage numbers:

- streaks, points, badges, levels or leaderboards;
- emails or notifications to pull people back (arrival pings, invite
  follow-ups and trial reminders were proposed and turned down on 11 October);
- reminders to sit at your desk;
- anything that shows anyone how long someone was online or idle. A team that
  feels watched closes the tab. Hours present are never counted or shown.

## What the research says, and what we did with it

- **Seeing others work motivates, and leads to talking.** Ambient-awareness
  studies (AmbiTeam, 2021; Hello.Wall, 2004) found that showing colleagues'
  presence at a glance raised the sense that others are working and led to
  more informal contact. Small studies, but they describe the floor exactly:
  desks with names, people arriving and sitting, statuses. Not a feed.
- **Your own desk.** People value what's theirs more than what's merely
  available, and the feeling comes from choosing and using it (psychological
  ownership; the endowment and IKEA effects). Gather's own guide calls the
  desk "your home base" and treats being at it or away as a signal of
  availability. So: you claim a desk by sitting at it (offered after you sit,
  never as a prompt on approach), its name plate shows only when someone's
  near and you're away, and nobody else sits there.
- **Arriving is a moment.** Remote work lost the commute, which marked the
  switch into work; Microsoft built a "virtual commute" into Teams on that
  reasoning, and the point researchers make is that the ritual's form hardly
  matters, only that there is one. You appear two steps from your desk and
  walk in and sit down: half a second, no prompt. Arriving already seated was
  tried and dropped (static, and nobody sees you come in); making people walk
  and sit themselves was rejected (a click every day for nothing). Without a
  desk yet, you appear beside a free one, where "Pick a desk" is something you
  can act on.
- **Being noticed when you come in.** In Gallup's 2024 data, 25% of fully
  remote workers reported loneliness against 16% on site, and what lowers it
  is feeling part of a team, not perks. So when a teammate walks in, people
  already on the floor get a quiet "Ana is in · 👋 Wave" for a few seconds;
  a wave puts a hand up over you for everyone and tells Ana. Only on walking
  in, only to people present, one toast per person, no counts.
- **A pinned tab should say what's new.** People keep work tools pinned, and a
  pinned tab shows only its title. The office's tab reads "(2) Northwind ·
  TinyFloor": the office, and unread messages. It brings you back only when
  something is waiting.
- **Guardrails that are features.** Video-call fatigue comes mostly from being
  watched (Bailenson, *Nonverbal Overload*, 2021). Cameras resting after quiet
  minutes and no video to a hidden tab save money (`costs.md`) and are things
  we can say out loud: TinyFloor won't keep you on camera when nobody's
  talking.

## Small decisions worth remembering

- **"Office", not "workspace".** The whole product is the metaphor (a floor,
  desks, walking over), "workspace" is Slack's and Notion's abstract word,
  and "virtual office" is what people search for.
- **Google sign-in first**, email behind "Continue with email": one tap, a
  verified email and a real name. Two equal choices slow people down.
- **Google One Tap costs the worker nothing until it's used**: whether to show
  it comes from the browser alone (a hint saved when an account signs in),
  never from asking the API, which was one request per landing view and why
  the first version was removed.
- **One invite link per office**, good for as many people as there are seats.
  One-use invitations piled up unread, and a link sent to a group chat only
  worked for the first person. An invite is sent the ways people actually
  send things: a ready message for the team's chat, an email from their own
  address, the phone's share sheet.
- **The doors' main button never moves**: every step is the same height, so
  people can keep pressing the same place, with a thumb on a phone.
- **No way out within a click's reach** (17 October). The menu under your
  face opened upward with Sign out as the item nearest the pointer, so a slip
  took you off the floor in front of your team; it now holds only your status
  and profile, and signing out lives in Settings › Signing in (a guest, with no
  account settings, still signs out from the menu). Leaving or closing an
  office is one quiet line at the foot of its settings, not a red card, and
  leaving, closing and removing someone each ask first, with staying as the
  button and going as plain words beside it. Closing also wants the office's
  name typed. An owner can hand the office to a teammate instead of closing it.
- **The office menu is for the office you're in**: invite, its plan, its
  settings, your other offices, a new one. The demo office isn't there, or on
  the screen after stepping out of an office; someone with an office has no
  use for it.
