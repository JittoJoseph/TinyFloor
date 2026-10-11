# 28. Waving at a teammate

Built 11 October 2026, on top of arriving at your desk (`27`).

## What it does

When a teammate walks into the office, everyone already on the floor sees a
quiet toast for a few seconds: *Ana is in*, with **👋 Wave**. One tap waves:
a hand goes up over you on the floor, and Ana gets *Ben waved at you* with
**👋 Wave back**. That's all of it.

- Only for walking in, never for coming back after a dropped connection.
- Only for people on the floor right then. Nobody is notified anywhere else,
  and nothing is sent to anyone who isn't there.
- One toast per person: their wave replaces their arrival.
- No counts, no history, no list of who waved. It's a hello in passing.
- The same toasts as new messages, so one setting (*Messages and arrivals*)
  turns all of it off.

## Why

Fully remote people report much more loneliness than people on site (25% vs
16% in [Gallup's 2024 data](https://www.gallup.com/workplace/645566/employees-worldwide-feel-lonely.aspx)),
and what Gallup finds lowers it is feeling part of a team, not perks. In an
office the smallest form of that is being noticed when you come in: a nod, a
"morning". Remote, nobody sees you arrive, so nobody says it.

The arrival walk (`27`) made coming in visible; the wave lets someone answer
it. It's reciprocal and costs a tap on both sides, which is what makes it
feel like a greeting and not a feature. It gives a small reason to come in
when the team does, without asking for one: the reward is people, not
points.

What it deliberately isn't: a feed of who came in when, a "first in today"
badge, a wave counter, or a notification that pulls you back into the tab.
Each would turn a greeting into a metric.

## How it's built

| Piece | Where |
|---|---|
| `player_joined.arrived` (walked in, not reconnected), `wave` / `waved` | `shared-protocol/src/messages.ts` |
| Sending `arrived`, relaying a wave to the whole floor (only to someone present, never to yourself) | `worker-realtime/src/room.ts`, tested in `test/waves.test.ts` |
| The hand over someone's head | `lib/PlayerManager.ts` (`wave`) |
| Arrivals and waves to the page, a wave back to the room | `lib/MessageHandler.ts`, `lib/floor.ts`, `scenes/GameScene.ts` |
| The toasts | `components/app/FloorNudges.tsx` (was ChatNudges) |
