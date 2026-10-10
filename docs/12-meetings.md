# 12. Meetings

Built on 27 September 2026. Replaces the meeting table (sit down, join its
call) and the Google Meet experiment (`10-calls-and-meetings.md`): meetings
stay in TinyFloor, and are cheap because of what each person is sent.

## What it is

- **Meetings** on the office's rail. Every office has a **main meeting**,
  always there to drop into. Anyone can start **another**, with a name and
  people to ask in; it lasts while someone is in it.
- **Joining walks your character into the meeting room**, to a free spot
  around the table (not a chair, not on anyone), and everyone on the floor
  sees you go. The meeting itself happens on the Meetings page.
- **Walking into the meeting room yourself** doesn't put you in a meeting: a
  prompt offers the main meeting, and any others going on.
- **Walking out of the room while in a meeting leaves it**, with "You walked
  out of the meeting · Rejoin".
- **The stage is Meet's spotlight:** one big card and a column of four
  beside it (a strip of three under it on a phone). The big card is what you
  pinned, else a shared screen, else whoever is talking, once the one before
  has paused (1.2 s) and has been up at least 2.5 s. The column is you, the
  people who spoke last (they keep their places unless someone has clearly
  spoken since), and "n others" when there are more.
- **People are their faces:** a card without a camera is a flat card with
  the person's circle in the middle; while they talk it gets a ring and the
  corner shows moving bars, and a muted mic shows as a badge there.
- **One way to invite:** the people button at the end of the bar opens who
  is in the meeting and, under them, who on the floor could be asked in.
- On the floor while in a meeting, a **small card** shows whoever is talking
  and leads back to the stage.
- The rail's Meetings icon shows **how many are in meetings** (green), and a
  green ring while you are in one.
- **A call is two people.** Already on a call, walking up to a third offers
  **Meeting**: a meeting for the three of you, the other two asked in.
  Someone on a call can't be rung.
- Chairs are only chairs. The table's tag says how many are in meetings.
- **Every place has meetings, the public lobby too:** each lobby copy has its
  own "Lobby meeting" and whatever anyone starts there, with the same limits.
  Nobody pays for the lobby, so its meeting minutes are ours; they show in the
  SFU numbers like any other.

## Where the money goes, and what stops it

Media is the whole bill (`04-costs.md`): Cloudflare charges $0.05 per GB the
SFU sends, after a shared 1,000 GB a month. Sending to the SFU is free. So
every rule is about what each person is **sent**:

| Rule | Where |
|---|---|
| Only **the cards on screen** are received: the big card and the column's three (two on a phone), whatever the meeting's size; everyone else is a face or "n others", which costs nothing | `lib/meetingStage.ts` |
| Each camera is sent in three layers (720p 800k, 360p 300k, 180p 120k); a viewer gets only what its card needs: the big card high (medium on a phone), the column low | `lib/media.ts`, `meetingStage.ts` |
| On the floor or another view: **one small** video. Tab in the background: **none**, voices only | `CallManager.refreshStage` |
| **Nothing is sent while you are alone** in a meeting, and a muted mic sends nothing (the slot is emptied, not a silent track) | `SfuMeeting.fillSlots` |
| Your own camera is shown from your device, never round-tripped | `MeetingStage` |
| The room **refuses more than 6 video tracks** per person, whatever a client asks | `worker-realtime` `MAX_VIDEO_SUBSCRIPTIONS` |
| Who is talking comes from each person's own microphone, as a short on/off message, not audio levels | `lib/voiceActivity.ts` |
| The lists, the rail and the prompts show meetings from the floor socket already open: no media, no extra requests | `lib/meetings.ts` |

Also fixed along the way: the one-to-one call's quality cap was silently
skipped when a browser reported no encodings, which fits the 245 kbps we
measured for a call meant to be ~180.

## What a meeting costs now

Per person, per hour, as sent to them:

| Situation | Sent | Per person-hour |
|---|---|---|
| Stage, the big card and the column on camera | 800 + 3 × 120 kbps + voices ≈ 1.2 Mbps | ~0.52 GB · **$0.026** |
| Stage, only the big card on camera | 800 kbps + voices | ~0.37 GB · $0.018 |
| Stage, only the column on camera | 3 × 120 kbps + voices | ~0.18 GB · $0.009 |
| A screen shared | 1.2 Mbps + 3 × 120 kbps | ~0.7 GB · $0.035 |
| On the floor / another view | 120 kbps + voices | ~0.08 GB · $0.004 |
| Voices only (cameras off, tab hidden) | ~1–2 talking × 40 kbps | ~0.03 GB · **$0.0015** |

Cost now grows with the number of people, not with its square: a 25-person
all-hands costs 25 × one person, where before everyone received everyone.

**One hour of standup every working day** (22 a month), everyone on camera and
on the stage the whole time, the worst case:

| Team | Egress | Cost | Tier price | Share |
|---|---|---|---|---|
| 10 | 114 GB | $5.70 | $19 (Plus) | 30% |
| 25 | 286 GB | $14.30 | $49 (Pro) | 29% |

Real standups sit well under this: cameras off for some, people on the floor
or in another tab. With half the cameras on, halve it. The free 1,000 GB
covers about eight ten-person teams doing this every day before we pay
anything.

That leaves no need for metered hours or fair-use caps, so there are none.

## Protocol

Client → room: `meeting_join {meeting}`, `meeting_start {name, invite}`,
`meeting_leave`, `meeting_invite {to}`, `speaking {on}`. Room → client:
`welcome.meetings`, `meetings` (the whole list, on every change),
`speaking {id, on}`, `meeting_invited`, `meeting_error`, and the existing
`meeting_joined` / `meeting_member_*` / `sfu`. Started meetings live in the
room's own SQLite (`meetings`), deleted once empty; members are on the
sockets. Meeting minutes still go to `usage_daily.sfu_minutes`.

## Not done

- No recording, captions or scheduled meetings.
- Meeting video is received only for speakers; a "pin this person" would be
  the obvious next control.
