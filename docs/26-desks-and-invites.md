# 26. Your own desk, and inviting people

Built 11 October 2026. Both are about the two moments in `25`: the first
minutes alone, and the day the team arrives.

## Your own desk

**What it does.** In an office, sitting down at a free desk shows one small
pill: *Make this my desk* (or *Move my desk here*, with a desk elsewhere) and
a close button. One press, and from then on you arrive sitting there. A desk
has a small paper plate with its owner's name (*Your desk* on yours), shown
only when you're close to it and the owner is away, so the floor stays clean;
nobody else sits at it. A member without a desk sees one line, once per
office: *Pick a desk and sit down. It can be yours.*

**Why.** People value what's theirs more than what's merely available, and
the feeling comes from choosing and using it, not from a deed (psychological
ownership; the endowment and IKEA effects). A desk with your name on it is
also presence when you're not there: walking past a colleague's desk says the
team exists. And it ends the scatter of 25 people standing wherever they
spawned: an office fills like an office.

The offer comes after you sit, not as a prompt on approach: you've already
chosen the spot, so making it yours is one small step from what you did, and
it works the same on a phone.

**How it's built.**

| Piece | Where |
|---|---|
| Which chairs are desks (every chair outside the meeting room, 19), and the tile a chair seats you on | `shared-protocol/src/map.ts` (`DESK_SEATS`, `seatTile`) |
| Whose desk is whose: one table in the office room's own SQLite, one desk per person per office, the owner's name kept for the plate | `worker-realtime/src/desks.ts` |
| Claims (members only, not guests, not the lobby), the rule that nobody sits at someone else's desk, seating you at your desk as you arrive, freeing it when you leave the office | `worker-realtime/src/room.ts` |
| Arriving vs coming back: the first connection says `arrive=1`; a reconnect keeps you where you were | `scenes/GameScene.ts`, `lib/RoomSocket.ts` |
| The desks, as the room says, and the chair you're on, for the floor and the page alike | `lib/desks.ts` |
| Plates, reserved desks, being seated on arrival | `lib/SeatManager.ts`, `lib/DeskPlate.ts` |
| The offer and the one-time hint | `components/room/Desks.tsx` |

Protocol: `welcome.desks`, `desks` (whenever they change), and the client's
`desk_claim {seat}`. Desks live in each office's room, so a person in two
offices has a desk in each, and a deleted office takes its desks with it.

## Inviting people

**Before:** a URL to copy in three places (the floor's chip, a card on People,
the create-office step), each built separately, and the floor's chip copied
silently.

**Now:** one dialog (`components/app/Invite.tsx`), opened from the floor's
Invite, People and the office menu's *Invite people*:

- **Who's here, and places waiting:** the members' faces with two empty
  spots. An unfinished set pulls to be finished.
- **The link, and the ways people really send it:** *Copy link*, *Copy
  message* (a ready line for the team's chat, saying what TinyFloor is, since
  a bare link gets ignored), *Email* (from their own address, which gets read
  and needs no mail service of ours), and the phone's *Share*.
- **The trial, when it's waiting:** inviting past 3 gives the team Pro for 14
  days.
- **Reset**, for admins, asked in place.

The create-office step uses the same actions (`InviteActions`), so the two
can't drift. The lobby, which isn't an office, still just shares its link.

## Also fixed

- The refresh icon was a rotate glyph; it's the refresh arrows now
  (`Refresh`), in admin and on the invite's reset.
- The speaker's and whiteboard's hints sat where your name tag lands while
  you stand at them; they now sit under your feet and above the floor.
