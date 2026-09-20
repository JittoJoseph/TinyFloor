# 01. The office shell

Everything an office does now lives on one screen or another: the floor, the
chat, the people, the settings. A shell holds them, the way Slack, Linear and
Gather all hold theirs — a rail that never moves, and one view at a time
filling the rest.

## The layout

```
┌────┬──────────────────┬───────────────────────────────────────┐
│    │                  │                                       │
│ r  │  context column  │              the view                 │
│ a  │  (240px, hides   │                                       │
│ i  │   on the floor)  │                                       │
│ l  │                  │                                       │
│    ├──────────────────┤                                       │
│ 56 │  presence dock   │                                       │
└────┴──────────────────┴───────────────────────────────────────┘
```

**The rail (56px)** is the only thing that is always there:

| | Goes to | Badge |
|---|---|---|
| Office mark | office switcher | — |
| Floor | `/office/:id` | who is on the floor |
| Chat | `/office/:id/chat` | unread messages |
| People | `/office/:id/people` | — |
| Settings | `?settings=…` over whatever you are on | — |
| You (avatar, bottom) | status, account, sign out | your status colour |

**The context column (240px)** changes with the view: people online on the
floor, the channel list in chat, nothing at all in settings. On the floor it
collapses by default so the map gets the whole screen, and a click brings it
back.

**The presence dock** sits under the context column in every view that is not
the floor: a small live map of where you are standing, your name, and the same
mic / camera / leave controls as the floor. You never lose the room by reading
a message — the thing Gather gets most right.

## Views are routes, modals are URL state

```
/office/:id                     the floor
/office/:id/chat                chat, last channel
/office/:id/chat/:channel       a channel or a DM
/office/:id/people              members, invitations, guests
?settings=audio                 the settings sheet, over any of them
```

Every screen is linkable, the back button works, and a support reply can be a
URL. Switching views is client-side: the socket to the room and the socket to
chat both stay open, so moving from chat to the floor costs nothing and shows
no loading state. (Gather does a full reload on a hard navigation and sits on
"Loading data…" for seconds; we will not.)

## On a phone

The rail becomes a bottom bar with the same four destinations, the context
column becomes the whole screen, and picking a channel pushes the conversation
over it. The presence dock shrinks to the control bar alone — mic, camera,
leave — with a tap to return to the floor.

The floor itself stays as it is today: full-bleed map, one header row, one
control bar.

## What it is built from

No UI kit with a design language of its own — they all arrive with 60–200 KB of
someone else's opinions. Instead:

| Layer | Choice | Why |
|---|---|---|
| Styling | Tailwind, as now | already here, no runtime |
| Primitives | our own, in `components/ui/` | grown from `components/room/ui.tsx`, which already carries the surface, the button sizes and the type scale |
| Behaviour | Radix primitives, one package at a time (`@radix-ui/react-dialog`, `-dropdown-menu`, `-tooltip`, `-popover`) | headless, unstyled, ~5–8 KB gzipped each, proper focus traps and keyboard handling — the part that is genuinely hard |
| Icons | lucide-react, as now | tree-shaken per icon |

That is the Linear approach: a small set of primitives, one type scale, one
spacing scale, and no component library to fight. The room pass has already
proved it — one `RoomIconButton` replaced five hand-rolled button styles.

House rules, carried from the room:

- 13px semibold for anything with words in it, 12px at 55% opacity for the
  quiet line, and **no uppercase letter-spaced labels anywhere**.
- One button height (40px), one small size (32px) for dense rows.
- One surface: `#fbfbf9`, a hairline border at 7% black, one shadow.
- Orange is for attention and destruction only; green for "on"; everything else
  is ink on paper.

## What lands in which order

1. The shell itself: rail, context column, routes, presence dock — the floor
   moves inside it unchanged.
2. People: members, invitations, guests, seats used (`03-offices-members-and-seats.md`).
3. Chat (`02-chat.md`), which is the reason the shell exists.
4. Settings as a sheet: devices, floor settings, office, billing.
