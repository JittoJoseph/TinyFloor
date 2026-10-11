# 27. Arriving, and why people come back

Built 11 October 2026, after `26` gave everyone a desk of their own.

## What was wrong

You appeared at a random spot on the floor, and a moment later the room's
welcome sat you at your desk: a visible jump, every time. And arriving already
seated was static: a frozen pose, nothing that says *you just came in*, and
nothing for the people already there to notice.

## What arriving is now

- **With a desk:** you appear standing, two steps from your desk, and walk in
  and sit down. It takes about half a second. Teammates see you arrive and
  sit, the way you'd see someone come in and settle. Steering or clicking
  elsewhere on the way lets it go: it's a default, not a cutscene.
- **Without one yet:** you appear beside a free desk, where the one-line hint
  (*Pick a desk and sit down. It can be yours.*) is something you can act on
  right there, instead of at a random spot.
- **Back after a dropped connection:** exactly where you were, seated again if
  you were sitting. Nothing replays.
- **Nothing jumps:** you're out of sight until the room says where you are,
  and the floor fades in there, with the camera already on you.
- **The tab** says which office it is and how many messages are waiting:
  *(2) Northwind · TinyFloor*.

Arriving seated (the old way) was considered and dropped: it is the least
friction, but it removes the arrival itself, which is the part with value for
you and for everyone else. A manual walk (appear nearby, sit yourself) was
also dropped: it adds a click every single day for no gain.

## How it's built

| Piece | Where |
|---|---|
| Each desk's arrival tile: two steps back from where you stand to sit, with a straight walk in | `shared-protocol/src/map.ts` (`DESK_ARRIVALS`, `deskArrival`) |
| Placing someone arriving (by their desk, or by a random free one; guests and the lobby as asked) | `worker-realtime/src/room.ts` (`arrivalNear`) |
| Hidden until welcomed, the fade in, walking to your desk on the first welcome only | `lib/PlayerManager.ts`, `lib/MessageHandler.ts`, `lib/SeatManager.ts` (`walkToDesk`) |
| The tab title | `components/app/OfficeShell.tsx` |

The arrival tiles were worked out with the floor's own pathfinding
(`lib/Navigation.ts` run against `office-map.tmj`): from each desk's standing
spot, two tiles further from the desk, and a straight path back to it. The
desk in the small office room (1159) has its standing spot inside a collider,
so its arrival is the nearest walkable tile straight above. If the map
changes, they need working out again.

## Retention, for a tool that's for work

TinyFloor should be like Linear: people come back because it's where the work
happens, not because it nags them. So the question is what makes a team keep
the floor open all day, beside their real work.

**What the research says, and whether it applies here.**

- **Retention is a team property.** Slack's best-known finding is that teams
  that had exchanged about 2,000 messages, a week for a team of ten, almost
  all stayed ([summary](https://www.ideaplan.io/case-studies/slack-product-led-growth),
  [newsletter](https://rasmus.beehiiv.com/p/your-magic-metric)). A person on
  an empty floor leaves; a team that has made it its place stays. *Applies
  fully:* everything that makes the team's presence visible matters more than
  anything for one person alone. The arrival walk is that: the people already
  there see you come in.
- **Seeing others work motivates.** Studies of ambient awareness, such as
  AmbiTeam ([paper](https://graphicsinterface.org/wp-content/uploads/gi2021-04.pdf))
  and Hello.Wall ([paper](https://www.th-owl.de/fb5/fileadmin/labor/hci/publications/2004/UbiComp_2004.pdf)),
  found that showing colleagues' presence at a glance raised the sense that
  others are working and led to more informal contact. Small studies, but
  they describe the floor exactly. *Applies:* desks with names, people
  arriving and sitting, statuses. Not a feed or a counter.
- **A start-of-day transition helps.** Remote work lost the commute, which
  marked the switch into work; Microsoft built a "virtual commute" into Teams
  on that reasoning, and the point researchers make is that the ritual's form
  hardly matters, only that there is one
  ([Microsoft](https://news.microsoft.com/features/new-tools-can-help-boost-wellbeing-soothe-unexpected-stresses-working-from-home),
  [TechRadar](https://www.techradar.com/news/microsoft-teams-will-soon-let-you-schedule-a-virtual-commute)).
  *Applies, lightly:* walking in and sitting down at your own desk is a
  half-second version of that, with no prompt, timer or meditation.
- **Habits form around a real trigger and a stored investment.** In Nir
  Eyal's model for work software, the trigger is an uncomfortable feeling
  (here: *is anyone around? can I ask now?*) and the investment is what
  accumulates with use ([enterprise write-up](https://www.nirandfar.com/hooked-for-the-enterprise/)).
  *Applies:* the floor answers the first question at a glance; a desk with
  your name, the team's channels and its history are the investment. The
  newcomer arriving beside a free desk is the nudge toward that first
  investment.
- **The desk as home base.** Gather's own guide calls your desk "your home
  base" and treats being at it or away as a signal of availability
  ([Gather](https://support.help.gather.town/articles/5621269913-desk-overview)).
  *Applies:* that is how our desks already work, and why arriving at yours
  is the default.
- **A pinned tab should say what's new.** People keep work tools pinned, and
  a pinned tab shows only its icon and title; Gmail and Slack put the unread
  count there ([example](https://chromestory.com/2026/07/gmail-unread-count-pinned-tab/)).
  *Applies:* hence the tab title. It brings you back only when there is
  something for you.

**What we deliberately don't do, though it would raise usage numbers:**
streaks, points, badges or levels; leaderboards of who was online longest;
emails or notifications to pull people back (decided against on 11 October); reminders to sit at your desk; and anything that shows a manager who
was idle. Each would make the floor feel like a game or like being watched,
and a team that feels watched closes the tab. Hours present should never be
counted or shown to anyone.

**What would be worth measuring** (not built): the share of offices where
three or more people are on the floor on the same day in their first week.
That is our version of Slack's 2,000 messages, and the number to watch.
