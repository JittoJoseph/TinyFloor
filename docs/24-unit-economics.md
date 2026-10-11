# 24. Unit economics when teams live in it

Worked out 11 October 2026, for one flat plan (`23`: Free for 3, Pro $29 for
the whole team, up to 25). The question: what if a team doesn't meet for an
hour a day, but sits on video all day?

## What we pay for

Only media costs money. Cloudflare Realtime charges **$0.05 per GB sent to
browsers**, after **1 TB free a month shared by every office** (SFU and TURN
together; ingress is free). Compute, D1, Durable Objects and storage are a
rounding error (`04`). Creem takes 3.9% + 40¢ a payment, so $29 nets **$27.47**.

What one person receives, per hour, from our own settings and measurements
(`media.ts`, `08`, `10`, `12`):

| Stream | Rate | GB / hour |
|---|---|---|
| A voice (Opus with redundancy) | ~65 kbps | 0.029 |
| A floor call with camera (180p + voice) | ~190 kbps | 0.086 |
| Meeting stage, every camera on (big card HD + 3 small + voices) | ~1.2 Mbps | 0.54 |
| Meeting stage, voices only | ~80 kbps | 0.036 |

Floor calls are a mesh through the relay: in a group of 4 everyone receives
3 streams. Meetings send each person only the cards on screen, so they grow
with people, not people squared. Meetings above the office's 60 hours a month
carry on voice only; floor calls are never counted.

## What an office costs a month

22 working days. Costs at list price, ignoring the free 1 TB.

- **Typical**: 1.5 h a day of floor calls in pairs, camera on a third of the
  time; half an hour of meetings a day, half the cameras on.
- **Heavy**: 3 h a day of floor calls in threes, camera half the time; 2 h of
  meetings a day, every camera on.
- **On video all day**: 4 h of meetings a day, every camera on (60 h a month on
  video, the rest voice); 4 h on the floor in groups of four, cameras on.
- **Floor all day**: 8 h a day in groups of four, cameras on, no meetings.

| Team | Typical | Heavy | On video all day | Floor all day |
|---|---|---|---|---|
| 3 | $0.70 | $4.70 | $7.30 | $4.50 |
| 5 | $1.20 | $7.80 | $14.00 | $11.30 |
| 8 | $1.90 | $12.50 | $22.40 | $18.10 |
| 10 | $2.40 | $15.70 | $28.00 | $22.60 |
| 15 | $3.60 | $23.50 | $42.00 | $33.90 |
| 25 | $6.10 | $39.20 | $70.00 | $56.40 |

What's left of $29 (net $27.47):

| Team | Typical | Heavy | On video all day | Floor all day |
|---|---|---|---|---|
| 5 | $26 | $20 | $13 | $16 |
| 10 | $25 | $12 | **−$1** | $5 |
| 15 | $24 | $4 | **−$15** | **−$6** |
| 25 | $21 | **−$12** | **−$43** | **−$29** |

## What that means

- **Cost is per person, about $0.25 typical and up to ~$2.80 a person on video
  all day.** A flat price is a bet on the average, like a gym's.
- **Teams up to ~8 are profitable at $29 even on video all day.** That's the
  team we're actually selling to (`23`).
- **The losses are all big teams that live on camera.** 25 people on video
  eight hours a day is 4,400 person-hours of video a month; a per-seat tool
  would charge that team $300. It's rare, and it's visible when it happens.
- **On average it's healthy.** If one paying office in ten is "on video all
  day" at 10 people and the rest are typical: 0.9 × $2.40 + 0.1 × $28 ≈ $5 a
  month, **~77% margin** after fees.
- **The hole is the floor, not meetings.** Meetings stop costing video after
  60 hours; floor calls have no limit, no counter, and keep receiving video in
  a hidden tab.
- **Free has the same hole.** Three people in a free office on camera all day
  cost ~$7 a month. A few hundred of those would be real money.
- **Today none of this is happening**: October so far is 24 offices, ~210
  person-hours on the floor and 100 meeting minutes. Cents.

## Price: stay at $29, for now

- Raising to $39 or $49 only moves where the 25-person all-day case breaks
  even; it doesn't remove it. Charging per person is the only price that
  scales with this cost, and we chose flat for a good reason: inviting must
  be free (`23`).
- Activation is what's scarce. $29 is an easy yes for 4–10 people, a third of
  what they'd pay per seat.
- Creem prices apply to new checkouts only, so raising later for new offices
  is easy; cutting a price that didn't sell is not. **Revisit at 20 paying
  offices**, with real per-office costs (below). If average cost passes ~$8,
  or many teams are above 10, go to $39, or add a per-person price past 10.

## What protects the margin instead (engineering, invisible to normal use)

In order of what they save:

1. **Count floor calls.** Add relayed call minutes (camera and voice
   separately) to `usage_daily` per office. Until then we can't see a heavy
   office, let alone price it.
2. **No video into a hidden tab on the floor.** Meetings already stop
   receiving video when the tab is hidden; floor calls don't. People leave the
   office open in a background tab all day; this is likely the biggest
   saving.
3. **Speaker video in floor groups of 3+.** Like the meeting stage: receive
   the camera of whoever is talking, voices for the rest. Halves the floor's
   worst case.
4. **Cameras rest when a call goes quiet.** After ~10 minutes with nobody
   talking, floor cameras pause with a "camera paused" state that one click
   resumes. Fits the "reduce video, subtly" principle.
5. **Fair use as a video budget, not meeting hours.** Today's 60 office
   meeting-hours cost very different amounts for 4 people and 25. A budget in
   person-hours of video (e.g. 600 a month, which is 10 people × 60 h) bounds
   the cost the same for every team size. Past it, meetings carry on in
   standard quality, then voice. Nobody sees it until 80%.

With 3 and 5 in place (before counting anything 2 and 4 save), the 25-person
all-day case drops from ~$70 to about $34, and 15 people on video all day
breaks even.

## About one-person offices

22 of 28 offices have one member. These are people trying it alone who
didn't stay, not one-person teams. A virtual office has little to show one
person, and until the trial existed a team of 4 couldn't move in at all.

So the funnel to watch is: a new office → an invite sent in the first day →
a second person arrives → a 4th arrives (the trial) → Pro. Pricing only
matters at the last step.
