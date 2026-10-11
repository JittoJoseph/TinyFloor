# Calls and meetings: what we learned

What testing and research showed about calls, September to October 2026.
How they're built is in `lib/CallManager.ts`, `lib/SfuMeeting.ts` and
`worker-realtime`; what they cost is in `costs.md`.

## Two kinds of call, two services

- **Walking up to someone** is a one-to-one call through Cloudflare's TURN
  relay. The room passes the WebRTC handshake; the API hands out short-lived
  TURN credentials.
- **Three or more is a meeting**, through Cloudflare's SFU: everyone sends
  once, the SFU forwards. The room opens SFU sessions server-side, so browsers
  never hold the app credentials. Walking up to a third person while on a call
  offers a meeting instead.

## Always relayed

In testing, direct peer-to-peer connections almost never worked (firewalls,
NATs, mobile networks), and the relay carried nearly every call anyway. So
calls are relay-only (`iceTransportPolicy: "relay"`): one path, faster setup,
the same behaviour on any network.

## UDP first, TCP only when needed

Offered every relay address, Chrome often settles on TCP, where one late
packet holds up all the rest. Measured on 28 September: voice arriving up to
a second late, a fifth of it patched over. Calls now offer only the relay's
UDP addresses; TCP and TLS join after 3.5 s without a UDP address of our own,
or 10 s without a connection (`widenRelay`). Counted from when both sides
agreed, so a microphone prompt on the other end isn't taken for a blocked
network.

## Voice sent twice (RED)

Each voice packet carries the one before, so a lost packet is still heard. In
the same tests the audible gaps fell from 8–9 per half minute to 0–1. It
costs ~30 kbps more, about 0.03 GB per call-hour.

## Audio first

- **Slack huddles launched with no video at all**, and still start audio-only
  in a small window. By mid-2022, 44% of paying enterprise customers used
  them weekly (Wired). Discord's voice channels are the same. Quick talk is
  audio; video is for when there's something to see.
- Our camera used to start on and be remembered, so every call started on
  video, which nobody chose and which costs 5× voice. Now **a call starts with
  voice, the camera is a button, and it's off again at the next call**. The
  mic preference is remembered; the camera isn't.
- Echo cancellation and noise suppression run in the browser; no audio is
  ever processed on a server.

## Google Meet, tried and dropped

On 25–27 September we built meetings that opened the office's Google Meet
instead of our own. Taken out because:

- **Meet can't be embedded**: framed, it answers 403, and there's no embed
  SDK. It always opens in another tab.
- **Free Gmail organisers are cut off at 60 minutes** for groups of three or
  more.
- Creating Meet spaces needs `meetings.space.created`, a sensitive scope:
  Google verification, or an "unverified app" screen for everyone.
- Alternatives were no better: `meet.jit.si` no longer allows embedding and
  JaaS's free tier is 25 monthly users for the whole app; Zoom's SDK needs a
  Zoom account per participant and cuts free group calls at 40 minutes.

Once a meeting only receives what's on screen (`costs.md`), our own SFU
became cheap enough, and meetings stayed in TinyFloor.

## The meeting stage

Copied from Meet's spotlight: one big card and a column beside it. What's
not obvious from the code is the timing: the big card switches to a new
speaker only once the previous one has paused for 1.2 s and has been up for
at least 2.5 s. Faster than that and the stage flickers on every "mm-hm".
Who's talking comes from each person's own microphone, as a short on/off
message, never as streamed audio levels.

## Floor calls turned out to be one to one

We planned for groups standing together on the floor (a mesh through TURN,
everyone receiving everyone). In practice a call is two people and groups go
to meetings, so the floor never needed speaker-only video.
