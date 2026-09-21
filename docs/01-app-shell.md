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

The design system — tokens, themes, beUI components, generated faces, and how
each view is composed — is [06-app-design.md](06-app-design.md).

## What is built

The shell, the People view and chat are in. What the code does differs from the
sketch above in two places, both for the better:

- **The floor never unmounts.** It is rendered by the shell itself and the other
  views cover it, rather than replacing it. That is what keeps your socket, your
  call and your position while you read a message — the thing this was for.
- **The column belongs to the view**, not to the shell: chat owns its channel
  list, People owns its seat card, and each puts the presence dock underneath.
  On a phone the column is the whole screen and picking a channel pushes the
  conversation over it, with a back arrow.

Still to come: the settings sheet holds only the office's own settings (name,
seats, leave, close); microphone and camera pickers stay on the floor, with the
microphone. Billing arrives with `05-pricing.md`.
