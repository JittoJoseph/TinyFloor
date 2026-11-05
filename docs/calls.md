# Calls and meetings: what we learned

What testing and research showed about calls, September to November 2026.
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
UDP addresses; TCP and TLS join after 2 s without a UDP address of our own,
or 4.5 s without a connection (`widenRelay`), on both ends at once. Counted
from when both sides agreed.

Those were 3.5 s and 10 s, and only the end that noticed widened. In testing
(November) the relay's UDP side didn't answer one end in about a third of
calls, and over UDP two relays sometimes never connected: calls waited out
the 10 s, and the other end its own timer after that, for 11–13 s. A
connection over UDP takes under a second when it works.

## Answering a call

A call used to show as on the moment it was answered, but the connection was
only started then: the offer, the relay, the encryption handshake, the
microphones. Measured from pressing Answer to hearing each other: 2.5–13.7 s
(median 5.7), while the call already looked live. What people said first was
lost.

- **The connection is made while it rings**, on both ends, with nothing sent
  on it. The caller's microphone opens when they call; the other person's
  only when they answer, never while it rings. On answering, only the voices
  have to start: 0.35–1.1 s to hearing each other (median 0.4 and 0.7 s, the
  two directions).
- **A call shows as connected only once the other's voice is arriving** (their
  audio track's first packets), with "Connecting..." and a faded face until
  then, and the connect sound when it's ready. Linked but silent for 6 s (no
  microphone on their end), it counts as ready anyway.
- Declined, cancelled, busy or unanswered, the ring's connection closes on
  both ends and the caller's microphone is let go.
- An older app on the other end, during a deploy: the answer carries `early`
  when the answering end took the ring's offer; without it the caller offers
  again after the answer, so calls still connect (in 4–6 s, as before).
  Guessing from a missing reply instead broke calls answered within moments,
  whose reply was still on its way.

## Voice sent twice (RED)

Each voice packet carries the one before, so a lost packet is still heard. In
the same tests the audible gaps fell from 8–9 per half minute to 0–1. It
costs ~30 kbps more, about 0.03 GB per call-hour.

Chrome's stats name the codec as plain `audio/opus` even when RED is on,
which makes RED look inactive. The bitrate shows it working: measured on
4 November in Chrome 156, a voice sent 66 kbps with RED and 32 kbps without.

## Silence costs almost nothing (DTX)

Opus can stop sending while nobody talks (DTX), but only if the receiver asks
for it with `usedtx=1` in its SDP. Browsers don't ask by default, and neither
does the SFU, so we add it to what each side applies (`lib/sdp.ts`). Measured
on 3 November:

- Silence goes from ~30 kbps to ~1 kbps; speech is unchanged at 60–70 kbps
  with RED. Through the app, with pauses and noise: 59 kbps while quiet
  before, 12 after.
- A call with ordinary pauses sends ~30% less (34 and 29 kbps per side, from
  48 and 42).
- No gaps from it: over alternating runs through the relay, audible gaps were
  0.8% with DTX and 1.2–2.1% without.

## Noise removal

The microphone goes through GTCRN, a small speech-enhancement model
(MIT licence, `@sapphi-red/web-noise-suppressor`), in an AudioWorklet before it's
sent (`lib/noiseFilter.ts`). The setting "Noise suppression" switches it; if
it can't start, the raw microphone is sent. Compared on the same noisy
recording, 3 November:

| | Browser's own | RNNoise | GTCRN |
|---|---|---|---|
| Key clicks, below speech | 8 dB | 29 dB | 29–46 dB |
| Fan hum, below speech | 41 dB | 58 dB | 70 dB |
| Speech kept (match with clean) | 0.92 | 0.95 | 0.97 |

None of them removes a dog's bark. GTCRN costs ~5% of one core. Details
that matter:

- **The call never waits for it.** Loading the filter (code, model, worklet)
  took 5–7 s on a first call, and the microphone waited: the start of every
  call was silent. Now the microphone goes out as it is at once, and the
  filtered track replaces it when it runs (0.4–1.8 s from the microphone
  opening to the call having it, as without the filter). The filter starts
  loading while the call rings or a meeting is joined.
- **Muting applies to what's sent**, never to the microphone under the
  filter: a call started muted, then unmuted, was otherwise silent.
- The filter's output must be forced to mono, or the voice arrives 6 dB
  quieter (the worklet leaves the second channel silent).
- The package must be imported only in the browser: it breaks server
  prerendering.
- The browser's own `voiceIsolation` is asked for as well where it's
  supported.

## Who's talking

The talk light and the meeting stage read the microphone's level against a
noise floor that follows the room: it falls quickly and rises slowly, so a fan
becomes "the room" within ~10 s and a voice over it still stands out by
12 dB. Sharp sounds (crest above 19 dB, like key clicks or a dropped pen) are
never talking. Talking starts once 300 ms of the last 600 were loud, and
ends after a pause (`lib/speech.ts`): a dog's bark (about 250 ms, as loud and
smooth as a voice, and not removed by noise removal) used to light people up
and put them on the stage. Before all this, a fan or typing kept people on
the stage: with only room noise, the talk light came on 4–5 times in 46 s
(10 s lit); now 0–2 times (1.7 s).

## Meetings recover on their own

A meeting connection that fails, or stays disconnected for 8 s, rejoins the
same meeting on a fresh connection, without sounds and keeping the
microphone and camera. A second loss within 20 s is left alone, so a dead
network doesn't loop.

## Everyone heard, and sooner

Repeated two-person meetings through the real SFU (November, on a lossy
connection) found people who stayed unheard for the whole meeting, about one
meeting in four, and voices that took 5–15 s to arrive. Four causes, all in
the code before too, each fixed:

- **A track asked for before it's live** (its owner's connection still
  opening, or the microphone not yet open) fails with
  `not_found_track_error`, and was never asked for again. Now it is, from
  0.3 s and half as long again each time, up to 4 s apart, for a minute.
- **Requests out of order.** The browser sends its answer to the SFU's offer
  and its next request back to back; the room handled them at once, the SFU
  got a new track before the answer, refused it, and could leave the session
  stuck. The room now passes each person's requests to the SFU one at a
  time, in order.
- **One failed track failed the whole request.** Asked for two tracks with
  one not live, the SFU still offered the other; the room dropped that offer,
  and the session waited for an answer that never came. Now the offer goes
  through, and the failed track is named to be asked for again.
- **The connection opened late**, only after the microphone had. It now opens
  on joining, its slots filled when the microphone is ready.

## Simulcast layers named in order

When a viewer's bandwidth runs short, the SFU steps down through the layers
by name, a before z. Named h, m, l, a camera went from 720p straight to
180p, skipping 360p. The layers are now a, b, c, sharpest first; clients
still on h, m, l keep working (the room asks each in its own names).

## Screen sharing

Measured by sharing a real browser tab (an editor with code and a document
of 13px text, on a 2880×1800 laptop screen) and comparing what the other
side received, frame by frame, with the tab itself. What was wrong:

- **A call showed the screen as a small card**, received at 320×180 and
  5 fps until clicked: unreadable, and most people never click.
- **Capped at 720p and 10 fps**: 13px text is soft at 720p, and scrolling
  was a slideshow.
- **Meetings forwarded the thumbnail to the stage.** A still screen sends
  next to nothing, so the SFU's estimate of the viewer's bandwidth stays
  low, and with the camera's rule (step down when bandwidth looks short) it
  forwarded the 320-wide layer to someone watching full size. Screens now
  keep the layer asked for (`priorityOrdering: "none"`).

Before and after, through the real app, two runs each (4 November):

| | Before | After |
|---|---|---|
| Call: text match 8 s into sharing | 0.55 (small card) | 0.90 |
| Call: full size after | 19 s (when clicked) | 5 s |
| Call: frames a second while scrolling | 1.3 | 6.9 |
| Meeting: picture on the stage | 1280×672, thumbnail often | 1768×928 throughout |
| Meeting: frames a second while scrolling | 5 (one run froze) | 13 |

What changed: a shared screen opens big on a call; up to 1080p at 15 fps;
calls send it in AV1 where both browsers have it (VP8 otherwise; meetings
stay on VP8, which every viewer can decode); the picker doesn't offer
TinyFloor's own tab, and Chrome's bar can switch tabs without stopping.

Codecs on the same screen, same machine (loopback, 4 November):

| | Text match | Bitrate while scrolling |
|---|---|---|
| VP8, 720p 10 fps (before) | 0.93 | 1.4 Mbps |
| VP8, higher resolution | 0.99 | 1.7 Mbps |
| H.264 (hardware encoder) | 0.996 | 0.5 Mbps |
| AV1 | 0.996 | 0.25 Mbps |
| VP9 (hardware encoder) | 0.96 | 1.2 Mbps |

Two things that aren't obvious:

- **Bitrate matters more than resolution once the network is involved.**
  After a still screen, the first scroll's burst made the connection's
  bandwidth estimate collapse (3.9 Mbps to under 0.1) and take ~20 s to
  recover: the picture lagged seconds behind. AV1 needs a fifth of VP8's
  bitrate for the same text, which is why calls use it.
- **H.264's quality depends on the machine's encoder**, and VP9's hardware
  encoder did worse than VP8 on text, so neither is used.
- **A still screen on a call settles at 0.90**, against 0.996 in the lab:
  through the relay the encoder stops refining once the connection's
  bandwidth estimate is low. Readable, not pin-sharp.
- **Meetings now cost more while a screen scrolls**: about 2.5 Mbps to each
  viewer, against 1.5 before (when it showed at all). A still screen is a few
  tens of kbps either way.

## Talking while muted

With the microphone off on a call or in a meeting, a copy of it is listened
to on the device, and talking into it brings up "You're muted · Unmute" for
5 s, at most once in 20 s. Nothing is sent. It waits for a second of talk
within two: with the talk light's 300 ms, room noise alone (fan, keys, a
dog) brought it up once in 45 s; with a second, never in three runs.

## Microphones and cameras that change mid-call

Unplugging the microphone in use used to leave the call silent; plugging in
headphones (which become the system's default) didn't move the call to them;
a microphone or camera picked in Settings took effect only at the next call,
and one picked last week and unplugged since failed the call outright. Now
the call reopens the default microphone when its own goes, follows the
system's default, switches to what's picked in Settings at once, turns the
camera off when it's unplugged, and falls back to the default device when the
picked one is gone.

## Audio first

- **Slack huddles launched with no video at all**, and still start audio-only
  in a small window. By mid-2022, 44% of paying enterprise customers used
  them weekly (Wired). Discord's voice channels are the same. Quick talk is
  audio; video is for when there's something to see.
- Our camera used to start on and be remembered, so every call started on
  video, which nobody chose and which costs 5× voice. Now **a call starts with
  voice, the camera is a button, and it's off again at the next call**. The
  mic preference is remembered; the camera isn't.
- Echo cancellation and noise removal run in the browser; no audio is
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
