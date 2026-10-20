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

## What a team needs before it drops its other tools (20 October)

The rail (chat, meetings, people, settings) was the step that made TinyFloor
something a team could use instead of a toy beside Slack. Where we stand
after it, from PostHog (30 days to 20 October) and the admin:

- **Teams try it for one sitting and don't come back.** 26 people reached an
  office floor; 20 of them on one day only. Of five offices that ever had two
  or more people in them, the busiest (five people) spent 55 minutes walking
  in one after another, calling and meeting (11 calls, 19 meeting joins),
  and never opened it again. Nobody was turned away or shown a price.
- **People mostly arrive to an empty floor**: 46 of 60 arrivals found nobody
  there. The median visit to an office lasts 73 seconds.
- **Meetings are the most used thing after the floor**, chat the least: 27
  people opened Chat and 4 sent anything; Floor is the most clicked thing in
  it. People also try meetings alone (18 of 32 office meeting joins).

What the tools a small team already uses do that we don't (checked in the
code on 20 October):

- **Nothing reaches you when you aren't looking.** There are no system
  notifications at all: a message or a call only makes a sound while the
  office's tab is open, and nothing at all once it's closed. Slack and every
  virtual office with a desktop app (Gather, Roam, Kumospace) notify.
- **A meeting can't be sent to anyone.** Office meetings have no link a
  client, candidate or guest can open, and no time: nothing can go in a
  calendar invite, so scheduled and external calls stay in Meet or Zoom.
  Gather leads its new version with Google Calendar ("create and join
  meetings in one click"; Outlook next) and Roam has a booking lobby for
  outside guests.
- **Chat lacks what makes Slack work for a team**: @mentions that reach the
  person, threads, message search, and files (images say "shortly").
- **It's a tab, not an app.** The site is installable (a manifest with
  standalone display) but nothing offers it. The floor draws 60 frames a
  second all day unless battery saver is on, which is what a window left
  open on a laptop pays for.
- **Presence only exists while the tab is open**: closed, you are "Not on
  the floor", with no calendar status ("In a meeting until 3") the way
  Gather's calendar sync sets it.

Outside, the advice that recurs for moving a team into a virtual office is
behavioural, not a feature: run one existing recurring meeting there first,
start with a few people who already work together, and have the lead be
there visibly (SoWork); and keep the common hours modest (core-hours
guides). Reviews of Gather and Kumospace complain about price per seat,
audio problems, missing integrations and heavy clients, rarely about
missing features on the map.

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
- **A status note says why you're away** (17 October). Most of a remote team
  is off the floor most of the day, and "Not on the floor" alone reads as
  absent; a few words and an emoji ("🌴 On holiday until Monday") answer the
  question before anyone asks it. The note shows on your name tag, the card
  when someone walks up, People, the presence dock and your menu, and stays
  while you're signed out. Picking one of the five usual notes fills it in
  with the time it usually lasts (lunch an hour, sick until midnight), as
  Slack's do, so a stale note doesn't sit there for a week; one save sets
  it. Guests don't get one.
- **A welcome, the same for every office** (17 October). Someone who has just
  joined sees it once, the first time they reach the floor: the office, the
  faces of who's in it, and one line on walking up to talk. An admin-written
  note was tried and dropped: one more thing to set up before an office
  feels finished, and most would have stayed empty. Not shown to the owner,
  or to anyone who joined more than three days ago.
- **Who can invite** is everyone by default, which is how a team grows
  without asking. An admin can limit it to admins, and then members see no
  invite button anywhere, and the empty floor stops telling them to send the
  link.
- **Colleagues find their team's office by their work email** (19 October).
  People from the same company were signing up on their own and landing on
  "make your office": on 19 October four people from one company signed up
  within the hour; two joined a colleague's office and two never got into
  any, and another company had two offices with different members. Now
  anyone signed in with a verified address at the domain of an office's
  owner sees "Your team is already here" before "make your own" (and on the
  new-office screen, and outside an office), and walks straight in: nobody
  has to be online to let them in. An admin can change that under Inviting,
  "People at your domain": have them ask first (a company with several teams
  might), when the request waits in People for the office's admins, with a
  count on the rail, and the asker's page walks them in the moment they're
  let in; or keep the office out of sight. A university's domain is out of
  sight until an admin changes it. A full free office's trial starts for the fourth, as with an
  invite. Personal addresses (Gmail, Outlook, Yahoo, UOL and the like) never
  match, only the owner's domain counts, and only Google-verified addresses
  do: a password account's email is never checked.
- **Chat picks up where you left it** (19 October). Coming back to Chat
  opens the conversation you were last in, not #general; what you'd started
  writing waits in each conversation, across trips to the floor; typing
  anywhere on the page writes in the box; Up in an empty box edits your last
  message, and finishing the edit hands the cursor back. Sending always
  shows what you sent, links open, and on a phone Enter is a new line.
