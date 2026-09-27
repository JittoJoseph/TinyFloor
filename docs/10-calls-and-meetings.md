# 10. Calls and meetings: talk on our side, meet on Google's

> Decided on 27 September 2026: meetings stay in TinyFloor, made cheap by
> receiving only the speakers' video (see [12-meetings.md](12-meetings.md)).
> The Google Meet integration was built, tried on preview and taken out. What
> follows is the research that led there.

## What changed our mind

On the night of 24–25 September two people from Argentina talked in the
public lobby for about 2 h 45 min, cameras on. Cloudflare:

| 15 min slot (UTC) | TURN egress | Rate |
|---|---|---|
| 00:30 – 02:15 (steady) | 49–59 MB | **~490 kbps** |
| 02:30 | 96 MB | 853 kbps (a screen share or an enlarged card, most likely) |
| **Whole call** | **624 MB** | **~0.22 GB per call-hour** |

`usage_daily` agrees: `lobby-1`, 352 person-minutes, 0 table minutes.

TURN bills only what Cloudflare sends *to* each client, so 490 kbps is both
directions together: **~245 kbps each way**. We had planned on 0.13 GB an
hour. The real figure is 1.7× that.

The low video profile is 150 kbps and audio ~32 kbps, so ~245 each way is
more than the caps add up to, even with overhead. Before trusting any
per-call-hour number, check with `getStats()` that the low encoding is really
applied on peer-to-peer calls. `sendAtQuality` runs as soon as a track is
swapped in, which can be before negotiation has finished.

It is still cheap: a 3-hour video call cost about 3 cents at list price.
The lesson is about defaults. The camera preference starts on and is
remembered, so every call starts with video. Video costs five times what
audio does, and nobody chose it.

## What Slack does

- **Every huddle starts audio-only**, in a small minimised window. Video, screen
  share and drawing are there, but you switch them on.
- Huddles launched in 2021 **with no video at all**. Video came a year later,
  and the default stayed audio because, in Slack's words, customers loved the
  fast, minimal version.
- It took off: by mid-2022, 44% of paying enterprise customers used huddles
  weekly (Wired). Slack does not publish how many huddles turn video on.
- Scheduled meetings with a lot of video stay in Zoom, Meet or Teams. Slack
  never tried to replace them.

Discord voice channels work the same way. The pattern: **quick talk is
audio, and video is something you turn on when there is something to see.**

## The plan

| | Today | After |
|---|---|---|
| Walk up to someone | peer-to-peer through TURN, camera on | **peer-to-peer through TURN, audio only**. Camera is a button, off every time |
| Screen share | yes | yes, on purpose, while it is on |
| Group of 3+ on the floor | unbounded mesh through TURN | audio only, **at most 5**. The sixth person gets "take it to the meeting" |
| Meeting table | our SFU, 6 chairs, video | **gone as a call**. The table stays as the place you see who is in the meeting |
| Meetings | — | **a Meetings view in the shell** that opens the office's Google Meet in its own tab |

The SFU is not needed for anything after this.

### Audio-first calls

- Walking up opens an audio call with no camera. The card shows the face we
  generate, not a black box.
- The camera button is in the call card. It turns off again when the call ends
  and is no longer a remembered preference (today `camera: true` is the saved
  default). It never comes back on by itself.
- Screen share stays, since it is the reason to have video at all.
- The public lobby is **audio only**: no camera button. It is free, open to anyone,
  and the one place our bill has no customer behind it.

Estimated cost, to measure once built: Opus at ~32 kbps plus packet overhead
is ~45 kbps each way, so **~0.04 GB per call-hour**, five times cheaper than
the Argentina call. A busy 10-person office (everyone talking 1.5 hours a day) comes to
about 7 GB a month, **~$0.35**. The free 1 TB covers over a hundred such
offices. At that level we have nothing to meter, and no fair-use rule to explain.

### Meetings in Google Meet

Meet does the expensive part (many people, cameras, recording, captions)
for free, on infrastructure people already trust. We do the part Meet cannot:
**knowing who is in the meeting without opening it.**

**It cannot be embedded.** Framed, `meet.google.com` answers 403 (we tried),
and Google offers no embed SDK. Meet always opens **in its own tab**. That's fine:
it is what a Meet user expects, and the office stays open in ours.

**The Meetings view** (`/office/:id/meetings`, a fifth rail item):

- The office's meeting room: its name, the link, and **who is in it now**.
- **Join** opens the link in a named tab (`window.open(uri, "tinyfloor-meet")`),
  so a second click brings that tab back rather than opening another.
- While you are in the meeting, your character **sits at the table on the
  floor** with a Meet badge. Everyone on the floor can see who is in the
  meeting without opening anything. The table becomes the meeting's presence,
  not its media.
- Later: more than one room (Standup, Design review), and "start a meeting with
  these people" from the People view.

**Getting the link.** Two steps. The first needs no Google review at all.

1. **Paste a link.** In office settings, an admin pastes the team's standing
   meeting link: Google Meet, Zoom, Teams, Jitsi, anything. Most teams already
   have one. No OAuth, works for every provider, ships in a day.
2. **"Create with Google Meet".** The admin connects Google once and we create a
   persistent Meet space for the office through the Meet REST API
   (`spaces.create`, scope `meetings.space.created`). We store the space's
   `name`, not its meeting code: Google warns codes can be reassigned after a
   year unused. Access type `OPEN`, so members join without knocking.

**Knowing who is in the meeting.**

- *Without Google*: clicking Join marks you "in the meeting" and puts you at the
  table. You leave when you come back and press "Back to the floor", or after a
  missed heartbeat. If Meet's tab lets us read `window.closed` (it may not,
  depending on its opener policy), we notice the tab closing too. Good enough,
  and it works for every provider.
- *With Google (step 2)*: for spaces we created, the Workspace Events API sends
  `participant.joined` / `participant.left` and `conference.started` / `ended`.
  That needs a Google Cloud Pub/Sub topic pushing to a Worker route. Or we poll
  `conferenceRecords.participants` from the office's Durable Object while a
  conference is live. Real presence, including people who joined from their
  phone.

**Limits to design around:**

| | |
|---|---|
| Free Gmail organiser | group calls (3+) end at **60 minutes**. One-to-one lasts 24 h. Workspace accounts have no such limit. The organiser's account decides this, not ours |
| `meetings.space.created` | a **sensitive** scope. Google has to verify our app (privacy policy, demo video, domain) before strangers can grant it. Until then, 100 test users and an "unverified app" screen |
| Personal accounts | reports disagree on whether `spaces.create` works for a plain Gmail account. **First thing to test**, before building step 2 |
| Meet API use | Google's terms forbid using Meet data for performance tracking. We only show who is in the room, which is what Meet itself shows |

We already have Google sign-in. Step 2 asks for the Meet scope separately,
only from the admin who presses "Create with Google Meet", never at sign-in.

## Alternatives we looked at

| | Why not |
|---|---|
| Embedding Jitsi | `meet.jit.si` no longer allows embedding. JaaS does, but its free tier is **25 monthly users for the whole app**, then paid per user |
| Our SFU for group video | works, but group video is the only cost that grows with the square of the room. Meet makes it Google's cost |
| Zoom Meeting SDK | embeddable, but every participant needs a Zoom account, and free Zoom cuts group calls at 40 minutes |

## What it does to pricing

- The busy-office costs in `08` are almost all video: table meetings and
  camera-on proximity calls. After this, a busy office's media is audio
  through TURN plus the odd screen share: **cents per office per month**.
- The fair-use table and the metering plan in `08` can go. Nothing left is
  worth counting.
- Tiers and prices stay as they are. The margin stops depending on how
  much people use cameras.
- "Group video in Google Meet, calls on the floor" is also a feature, not a gap.
  Teams already live in Meet. We are the office around it, not another meeting app.

## Order

1. Audio-first proximity calls, camera opt-in, lobby audio-only, group cap of 5.
   Check the P2P low-quality encoding with `getStats()` at the same time.
2. Meetings view with a pasted link, self-reported presence, sitting at the table.
3. Remove the table call and the SFU from the client and `worker-realtime`.
4. Spike: `spaces.create` with a personal Gmail account and with a Workspace
   account. Only then decide whether to do step 2 and Google's verification.
5. "Create with Google Meet" and real presence through Workspace Events.

## To decide

- Whether the camera exists at all in walk-up calls. Suggested yes, as a button:
  sometimes you need to hold something up.
- One meeting room per office at first, or several from day one.
- Whether guests (who have no account) see the Meetings view.
