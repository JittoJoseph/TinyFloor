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
  ownership; the endowment and IKEA effects). A desk is a home base, and
  being at it or away says whether you're available. So: you claim a desk by sitting at it (offered after you sit,
  never as a prompt on approach), and nobody else sits there. While its owner
  isn't at it, a claimed desk carries their face, with a dot while they're in
  the office, so the floor reads as a seating chart from across the room;
  walk up and it opens to their name. Yours says "Your desk" from anywhere,
  so you can find it. A name card on every desk all the time was noise; one
  only up close hid who sits where.
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
  virtual office with a desktop app notify.
- **A meeting can't be sent to anyone.** Office meetings have no link a
  client, candidate or guest can open, and no time: nothing can go in a
  calendar invite, so scheduled and external calls stay in Meet or Zoom.
- **Chat lacks what makes Slack work for a team**: @mentions that reach the
  person, threads, message search, and files (images say "shortly").
- **It's a tab, not an app.** The site is installable (a manifest with
  standalone display) but nothing offers it. The floor draws 60 frames a
  second all day unless battery saver is on, which is what a window left
  open on a laptop pays for.
- **Presence only exists while the tab is open**: closed, you are "Not on
  the floor", with no calendar status ("In a meeting until 3").

An integration earns its place by answering a question a teammate has. A
calendar answers "are they free?": a day timeline on the card that opens
when you click someone, and an "in a meeting" status from it. Local time on
that card costs nothing and answers "is it late for them?". Sharing what
you're listening to, or decorating the floor when code ships, answers
neither.

Project tracking in the Linear manner doesn't fit: it's a product of its
own that a team already has (Linear, Jira, GitHub), it can't be explained in
the one line a virtual office gets on its landing page, and none of the
virtual offices that added work features kept them central. A link that
unfurls (an issue's title and state in chat) does the part that matters.

Outside, the advice that recurs for moving a team into a virtual office is
behavioural, not a feature: run one existing recurring meeting there first,
start with a few people who already work together, and have the lead be
there visibly (SoWork); and keep the common hours modest (core-hours
guides). Reviews of virtual offices complain about price per seat,
audio problems, missing integrations and heavy clients, rarely about
missing features on the map.

## The floor's labels, and chat (21 October)

- **Name tags are HTML over the floor, not drawn into it.** The canvas paints
  one pixel per CSS pixel, so on any screen past 100% anything drawn in it is
  scaled up and soft. Four tags were tried on the real floor: the pixel font,
  the app's font in the canvas, and two HTML styles (dark glass, light
  paper). The canvas ones stay soft; dark glass reads best on the pale floor
  and matches the floor's own cards. Tags hang from their bottom edge 4 units
  clear of the head, so one scaled up for a distant camera grows away from it.
- **A claimed desk shows its owner's face in a circle**, with a dot while
  they're in the office, and opens to their name as you walk up. Yours is
  ringed in ink, and pressing it walks you there and sits you down.
- **Replies** quote the message they answer above them, a line curling from
  the reply's face to a small face, the name and how it began; pressing it
  brings the message back into view. The quote is read whenever the reply is
  sent out, so an edit shows and a deleted message says it's gone rather
  than keeping its words.
- **Typing** shows above the box while someone's box has words in it: their
  browser says "on" when the box fills, again every few seconds while
  they're in it, and "off" when it empties; the message itself ends it, and
  a closed tab's goes by itself. Nothing is stored.
- **The box's tools** are emoji, a picture (on a phone, the camera and
  gallery first) and a file, in that order, with send on the right.

## Your menu (21 October)

- **Status, note and music are one row each**, saying what they are now.
  Pressing one opens its choices beneath it, inset, while the other two fold
  away; who you are and your profile stay where they are. A pick closes it.
  Every pick has its place before Spotify names it, since the menu grows
  upward from the dock and a late row would move the rest under the pointer.
  Switching the whole menu to a new view read as a new popup each time. No
  dropdowns inside the menu, and no modal. Playing, the music row is what's
  playing, so its choices add only the seek bar, stop and what to play next.
- **Notes have icons, not emoji**: sixteen from the app's own icon set, each
  in a colour of its own (headphones, a bowl, a thermometer, a beach…), the
  same on every device and on the floor's name tags. Notes kept with an emoji
  took the nearest icon.
- **No email addresses in your menu or on chat cards**: the name is enough
  there, and an address is for your profile and the office's member list.
- **A usual note is one press**: Heads down and Lunch clear in an hour, Back
  soon in 30 minutes, Out sick today, On holiday this week, so none goes stale.
  Your own words take Enter and last the day unless you pick 30 minutes, an
  hour or "Don't clear"; new words drop a usual note's icon. The old dialog
  filled a usual note in and still wanted Save, and defaulted to never clearing.

## Music, from Spotify (21 October)

- **Music plays in TinyFloor, from your menu, not from signing in to
  Spotify.** Reading what someone plays in Spotify needs its Web API, which
  since February 2026 serves 5 hand-added accounts in development mode, is
  "for personal, non-commercial" projects there, and needs the app owner on
  Premium; more needs extended quota, open only to registered businesses with
  250,000 monthly users. The same rules rule out search. So your menu offers
  picks and a field for any Spotify link, and Spotify's oEmbed (no key) and
  the Open Graph tags on its public pages give the name, cover and artist.
- **One press to play.** The picks are The Office Theme first, then Spotify's
  own work playlists (Deep Focus, lofi beats, Peaceful Piano, Jazz Vibes,
  Chill Hits), with what you chose lately above them (up to 4, kept in the
  browser), so the list turns into your own as you listen.
- **Everything plays one song at a time, so what's playing is always a song.**
  Signed in, Spotify's player reports only what it was given (a playlist, an
  artist), never the song inside it. So an album, playlist or artist is
  played from the song list its embed page shows (`__NEXT_DATA__`, up to
  100), each song loaded on its own, playlists shuffled; the menu, the dock
  and your card name the song, and Listen on someone's card plays that song.
  A next button skips one.
- **When the songs run out it plays on**, the nearest thing to radio Spotify's
  player offers (it has no "up next" outside Spotify's apps): the
  best-known songs of an artist on the last few played who hasn't had a turn,
  read from the song's embed. Someone featured on a song is how it moves to a
  new artist; it stops when there's no one new. What plays on by itself stays
  out of the recent list.
- **On your name tag, three small bars** while you play something, so people
  walking past on the floor see it without opening your card.
- **Spotify's own player plays it, out of sight; our controls drive it**
  through its iFrame API: play and pause, a seek bar with the time, change
  and stop, in the menu, and the name with Spotify's mark on the dock's
  second line while it plays. It keeps playing from page to page, not across
  a reload. The player has to sit in the viewport, see-through: Chrome stops
  one off screen (it also lazy-loads, so off screen it never loads) or behind
  the page. Signed in to Spotify in that browser it plays whole songs;
  otherwise 30-second previews, and the menu says so with a sign-in link.
- **What plays shows on your card** (the chat card, and a Spotify button on
  the card you get walking up to someone) while it plays: shared when it
  starts, said again every 10 minutes, gone 30 seconds after a pause, and a
  closed tab's lapses in 15.
- **Listen plays it for you too**, in your own player, so it shows on your
  card as well. Never synced: Spotify's policy bars playing one source to many
  listeners. Listening in step is Spotify's Jam: a pasted Jam link goes on
  your card as Join Jam (starting one needs Premium).

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
- **Files, mentions and search in chat** (20 October), the three things that
  kept a team in Slack beside us; threads were left out. Files go in by the
  paperclip, a paste or a drop, start going up at once and are sent the
  moment they're there; a picture is made small in the browser first (2048
  pixels on its long side, WebP: a 20 MB screenshot went up as 1.6 MB) and
  takes its room before it loads. Up to four on a message, 10 MB each, for
  every office, free included. They're kept in a private R2 bucket and read
  only through the API after a membership check; anything that isn't a
  picture downloads rather than opens. A file goes when its message does.
  "@" offers the office's people, and the words stay plain ("@Ana Lima")
  with the ids beside them, so a typed name works too. In a channel only
  mentions are counted (on the rail and in the list); the rest only makes it
  bold, as in Slack, while a direct message counts everything. Search is
  in the ⌘K palette: words and file names in the office's channels and your
  own direct messages, case and accents folded, and picking a result opens
  the conversation at that message.
- **Notifications for what's yours** (20 October): a direct message, a
  mention, a call or an ask into a meeting, a wave, shown by the system while
  the office is open in another window, and only then; in front of it, the
  sound and the floor's nudges say it. A busy channel never notifies or makes
  a sound, the same rule as the counts. One notification per conversation,
  replaced by the next, and a call's stays until it stops ringing. The
  browser is asked from a card in Chat (once there's someone to hear from)
  or from Settings, never on arrival. A message that lands in the open
  conversation while the tab is hidden stays unread until you're back. The
  installed app's icon carries the same count as the tab's title, and the
  menu under your face offers "Install app" whenever the browser can.
  With TinyFloor closed, direct messages and mentions still arrive, as Web
  Push: the office's chat sends one to each browser the person subscribed,
  but only if none of their tabs has the office open (an open tab says it
  itself, so nothing comes twice). No separate service: the chat object
  encrypts and signs each push with WebCrypto, one VAPID key for production
  and preview. A subscription belongs to the session that made it, so
  signing out stops it, and leaving the office stops its pushes; one the
  push service says is gone is deleted. Only browsers' own push services
  are accepted (Google, Mozilla, Apple, Microsoft). Calls and waves don't
  push: answering needs the office open.
- **Chat picks up where you left it** (19 October). Coming back to Chat
  opens the conversation you were last in, not #general; what you'd started
  writing waits in each conversation, across trips to the floor; typing
  anywhere on the page writes in the box; Up in an empty box edits your last
  message, and finishing the edit hands the cursor back. Sending always
  shows what you sent, links open, and on a phone Enter is a new line.
  (20 October) It goes there directly: the rail's Chat link is that
  conversation, so #general no longer shows for a moment first. Its messages
  are fetched as soon as the chat connects, and any conversation's when the
  pointer rests on it in the list, so most open with their messages already
  there; one that has to wait shows nothing (not its empty-conversation
  intro) and fades its messages in, and a message said after it opened eases
  into place. After a dropped connection the open conversation is read again,
  so what was said meanwhile appears. A file taken out of the box, or left in
  it, is deleted rather than kept with no message showing it. One attach
  button takes pictures and files alike; a second, pictures-only button would
  be clutter, and the system's picker already offers photos.
