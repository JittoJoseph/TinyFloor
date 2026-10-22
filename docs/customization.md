# Customization notes

Findings from going through the bought art and building a lab to try it,
October 2026: what the packs hold, what an item, a layout and a character
need to be, what went wrong when we tried, and an order to build it in.
Today an office is one fixed floor and eight premade characters; the packs
hold enough for people to dress themselves, decorate their desks, and admins
to furnish and theme their offices.

## What the packs hold

**Modern Interiors** (LimeZu, full version), at 16, 32 and 48px. We work at 32.

- **26 themes** of furniture and objects, each as a sheet and as cut-out
  single images: about 5,300 singles at 32px in each shadow style (black
  shadow, which we use, plain, shadowless). Generic, living room, bathroom,
  bedroom, classroom and library, music and sport, art, gym, fishing,
  birthday party, Halloween, kitchen, conference hall, basement, Christmas,
  grocery store, an upstairs system, jail, hospital, Japanese interiors,
  clothing store, museum, TV studio, ice-cream shop, shooting range,
  condominium. Singles are trimmed to a 16px grid and **numbered, not named**,
  so a catalog has to name them.
- **Room builder**: about 75 floor materials and 55 wall styles, in the same
  corner, edge and fill layout our map already uses, plus baseboards, borders,
  floor paths, arched entryways and 3D walls. Swapping materials is enough to
  re-theme a room.
- **621 animated objects** (GIFs and sprite sheets): doors that open (glass,
  sliding, elevator), coffee machines, fridges, server racks and control-room
  screens, security cameras, fish tanks, a cat, clocks, candles, fireplaces,
  party balloons, seasonal pieces.
- **14 premade room designs**, each in layers below and above the characters.
- **UI elements**, including animated "thinking" emotes.

**The character generator** in the same pack: 9 bodies (6 natural skin tones,
3 fantasy), 7 eye colours, 33 outfits in 3 to 10 colours (132 sheets), 29
hairstyles in about 7 colours (200), 19 accessories (glasses, beard,
moustache, beanie, caps, hats, mask, backpack and some costume pieces), plus
children's versions, phones and books, and 20 premade characters. Every sheet
is on the same grid of 32×64 frames: row 1 idle and row 2 walk (six frames
each for right, up, left, down), rows 4 and 5 sitting (side views only), then
phone, reading, carrying and others.

**Modern Office Revamped**: the office sheet we use today (desks in four
finishes, L-desks, office chairs in four colours, monitors, laptops,
printers, copiers, sofas, plants, boards, vending machines) and 339 singles.
The first 95 office singles are desk *pieces*, not desks: whole desks exist
only on the sheet.

The free and RPG Maker versions add nothing we'd use.

**Licence.** Both packs may be used and edited in a commercial product,
not redistributed, with credit (already served in `credits.txt`). Showing the
art in an editor is use; letting people download sprites or sheets is not
something to offer.

## What we use today

The floor is the Startup template (below), drawn from data: the lab bakes it
and builds it (`lab/build.mjs`) into `shared-protocol/src/catalog/floors/startup.json`,
which the app draws and the room reads its desks from. Characters are still
the eight legacy 16px ones at twice their size.

The hand-made map it replaced (`office-map.tmj`, from `tools/buildmap.py`)
is now only what the website's pictures of the floor were drawn from.

## How the floor looks: the rules

Decided by looking, and checked by the lab on every change (`lab/check.mjs`):

- **Nobody sits sideways.** Seated side-on, a character reads badly, so a seat
  faces up (your back to us) or down (facing us). The packs' side chairs
  aren't in the catalog.
- **At a desk you face the desk**: up on its near side, down on its far side.
- **A desk is the one the office has now**: wide (six tiles), with the glass
  divider and its posts, in maple, oak, beech or white, never the dark grey
  (templates use maple). The packs' small three-tile desks looked cramped
  and aren't used.
- **A desk always has a chair.** The chair can be swapped for another office
  chair but never taken away, and the seat stays in the same spot whichever
  chair it is.
- **Seats facing down are drawn behind whoever sits in them, seats facing
  up in front** (their back covers you). Egg chairs, a bench and a stool had
  it the wrong way round, with the chair drawn over the person; the rule is
  now checked.
- **You stop beside things, not in them.** Your feet are a point, but you're
  about 24px wide: colliders keep that clearance. A wall at your side stops
  you 16px short of it; a desk bank is one collider from its far desks (or,
  one-sided, its divider) to just past the near desks' front, and 16px past
  the posts at either end, so there's no way between its rows, under a desk or
  half into its end; the side desk is solid over its whole top, not only its
  front. Walked into from every side in the layout editor.
- **A wall's corner casts a small shadow** on the floor diagonally below it
  where no wall is beside or above that floor (where a wall ends at a
  doorway); the room builder has a tile for it.
- **Nothing on a desk stands over its chair**: a single screen goes beside the
  chair, never in front of it, so an empty chair isn't covered. Checked over
  300 seeds.
- **Desks can be used from both sides.** Back to back across the divider
  works, once each row of the bank is drawn as one piece with its own sort
  line instead of tile by tile: the far person is drawn behind their desk and
  their monitor's back, so you see their face over it; the near person is
  drawn behind their chair, so you see the back of their head over the desk;
  someone walking past either side is in front of or behind the whole row.
  Tested sitting and walking on both sides in the layout editor.
- **A chair's two views**: the front view shows the seat and both armrests
  towards us; the back view only the chair's rounded back. Front views go
  where you sit facing us (a desk's far side, above a table), drawn behind
  you; back views where you sit facing away (a desk's near side, below a
  table), drawn over you, as the current floor has it. The office sheet's row
  of chairs mixes both views side by side, so the chairs are taken from the
  pack's single images, one picture each, and their facing is set by looking.
- **Chairs are tucked in**: a chair's bottom a tile into the desk or table on
  either side, as the current office's far desks have it.
- **What's on a desk faces whoever sits there**: screens on the near side, the
  backs of screens on the far side.
- **Desks are working desks, not cluttered ones.** The current office puts
  everything on every desk and it reads as a mess; a desk gets one setup or a
  phone or plant, the far side its screens and nothing else. Some desks are
  clear.
- **Things are cut where they are.** Several small things on the sheet sit
  across a tile line, or overlap their neighbours (papers): cut on tile lines
  they come out clipped. Cut by their pixels, or left out.

## Items

An item is everything the floor needs to know about one thing:

- **sprite**: a rectangle cut from a pack image, on the 16px grid, optionally
  mirrored; or layers cut from several places and drawn in order, for things
  the packs draw in pieces (a meeting table is its nine table pieces);
- **mount**: on the floor, on a wall, on a desk (surface), or a rug, under
  everything;
- **colliders**: rectangles you can't walk into, in the sprite's pixels;
- **sort line**: above it you're behind the item, below it in front;
- **seats**: a point and which way you face sitting there (up or down);
- **surface**: where things on top can go;
- **facing**: for desk things, which side of a desk they suit (near, far, either);
- name, category, themes.

A **bundle** is items placed and moved together, a part sometimes a slot of
interchangeable items. A **cluster** is a bank of desks made to measure (next
section). The catalog (`shared-protocol/src/catalog/items.json`) has 64:
desk banks in four finishes, two meeting tables, chairs, sofas, egg chairs,
a bench, plants, shelves, kitchen and tech pieces, desk things, rugs, windows
and pictures. What making them taught us:

- **Every item needs looking at.** A first guess (a collider as the bottom
  third of the item's pixels, the sort line at its foot) is right for plants
  and cabinets and wrong for chairs, sofas and partitions.
- **A chair you sit in facing up needs its sort line at its very bottom**, so
  the backrest covers whoever sits there and their head shows over it.
- **Shadows join objects on a sheet.** Finding boxes automatically works for
  most things but returns a row of four chairs as one, so cutting takes an eye.
- **Office singles aren't desks.** The office pack's single images include
  desk pieces, not whole desks; the sheet, cut in layers, is the reliable source.
- **Loud rugs look like objects.** The packs' big rugs are bright patterns; on
  a quiet floor they read as furniture. Small and neutral ones read as rugs.
- **Our characters' side-sitting frames are swapped** (frame 49 faces right,
  50 left, against `SIT_ORDER` in `AnimationManager`). With no sideways seats
  it never shows; worth fixing so it never surprises anyone.

## Desk banks, sized like a widget

A desk bank is placed with a size: how many desks along (one to six) and one
side or two. Drag its right edge and a desk is added or taken away beside the
others; drag its top edge and the far side appears or goes. Everything
follows from the size: an end post at each end and a joining post between
neighbours, the glass panels, the near desks, the strips of the far desks,
and a chair at every desk, the way the current map's desk bank is drawn. It
is worked out from the office sheet the floor already loads, so a bank of any
size costs no extra art and is three pictures (the far row, the near row with
its divider, and the chairs), not dozens of tiles.

Each side of a bank has its own chair choice (near chairs face up, far ones
down), and a cluster says which chairs suit it.

## Walls and floors that work themselves out

The office's walls and floors are a plain map: one character a tile, from a
legend (a wall and its material, a floor and its material, or nothing),
readable and easy to diff (`shared-protocol/src/catalog/shells/`). They are
drawn from it, not placed piece by piece:

- a wall with floor in front of it shows its face, two tiles tall; any other
  wall shows its top;
- every art pixel is sorted into wall top, wall face or floor, and the
  outline (#3a3a50, one art pixel) goes wherever a top meets anything else and
  wherever a face meets floor;
- faces take their pattern from the material's tiles; floors take the
  material's tile with the shadow from a wall above or beside it.

So corners, joins, a wall's end at a doorway and two walls meeting come out
right whatever the shape; the hand-placed map had a wall end with its outline
missing, which this can't produce. Painting a rectangle of wall, floor or
nothing in the layout editor redraws it at once. The whole shell is drawn once
into a single picture when the floor loads (a few tens of milliseconds), and
costs nothing after that.

Windows: the packs have none in the office style, so they are drawn (lab/pages/art.js) in
the walls' own style, a pane a tile, white frame, outline and sill, some with
their blinds part way down. The same code draws them in the lab and into the
atlas, so a window is an ordinary wall item. Along a top wall they come first,
one size and spacing per wall, centred on it, clear of the kitchen and of
anything placed against the wall; the rest of the dressing fills between them,
and only plants may stand in front of one.

## Templates and themes

An office is never sized for a headcount: one team, one floor, whatever the
team's size, three people or fifteen. Nobody types a number of people. Every
office is Startup's plan, 48×32 tiles: four two-sided banks (16 desks), a
meeting room, a break room, an open hall.

A **theme** is a look: its walls and floors, its furniture and desk things,
all made to the same rules (seats face up or down, colliders with clearance,
sort lines, desks with chairs), checked the same way. A **template** is the
plan in one theme, built by hand in the lab: every piece placed, every desk
dressed, every wall furnished. Startup, in the startup theme, is the first.

Every theme draws **the same plan**: the same rooms and the same desk spots,
in different art. So switching an office's theme keeps everyone's desk;
what's on the desks goes back to the new theme's own, since its things are
different things. The theme is chosen when an office is made and changed by
admins in its settings, never on the floor.

Templates use the default desks (maple). People can make their own desk any
finish (maple, oak, beech or white), never the dark grey.

There is no randomness on the floor. The seeds and the generators (desk
things, wall dressing, whole plans) are tools for building templates in the
lab: they suggest, the author adjusts, and **Bake** freezes the result into
the template as explicit pieces. Two offices on the same template look exactly
the same until someone changes one.

A template is versioned (`startup@1`). A version never changes once offices
use it; fixing art or moving a piece makes a new version, which keeps the
keys of every piece it didn't change, so offices move to it with their
changes intact (a change to a piece that's gone is dropped).

What we can theme with the art we own: the modern office (startup), a
library or study, a calm Japanese office, a loft (living room and art
studio), and seasonal decor on top of any theme. A medieval office isn't in
the packs: it needs new art, top-down at 32px to sit with the characters,
bought or made.

## An office: its template and its changes

An office is its template plus its **changes**, each kept against one
piece's key:

- `{ hidden }`: taken away;
- `{ at: [x, y] }`: moved;
- `{ item }`: swapped for another item that fits (same mount; for a desk
  thing, the same desk side and room on the desk);
- a new piece, `{ item, at, host? }`, under a new key of its own.

One function turns a template and its changes into the floor (pieces with
keys, depth, seats, colliders). It lives in `shared-protocol`, so the lab,
the app and the server work the office out identically; it takes a few
milliseconds.

**Who changes what:**

- **Your desk**, once it's yours: the things on it (move along it, swap, take
  away, add, up to six), its chair (any office chair; a desk always has
  one) and its finish. The server checks that the piece is hosted on the desk you hold.
- **Admins**: the furniture. Move, add and take away tables, sofas, plants,
  wall pieces and desk banks, and put any piece back to the template's. Walls
  and floors stay as the template has them, so every room and doorway stays
  where the rules were checked. A desk bank with a claimed desk on it can't be
  taken away until the desk is let go.
- **Letting a desk go** (or leaving the team) puts its things back to the
  template's: the next person gets a clean desk.

**Limits**, so every office stays light on a phone: six things a desk, 300
pieces added to an office, a few edits a second per person.

## Serving it

- **Templates** ship with the app (a few kilobytes each, compressed), and each
  theme's art is one atlas in R2, cached forever under its hash. Nothing about
  an office's look is fetched per office except its changes.
- **The office** in D1 says which template and version it's on: two columns.
  Nothing on the floor's hot path touches D1.
- **Changes** live where the desks already do: in the office's room (its
  Durable Object's SQLite), one row per changed piece
  (`key, change, by, at`), and a revision number. The room is the one writer
  for its office, so two people changing things never race.
- **Arriving**, the welcome message carries the revision and every change (a
  few kilobytes for a busy office); the client works the floor out and draws
  it. Reconnecting with the same revision skips them.
- **Changing**, the client sends `{ key, change }`; the room checks who may
  change it and that it fits, writes the row, and sends `{ rev, key, change }`
  to everyone there. Each client redraws that one piece. So a coworker's desk
  changes while you watch, and anyone arriving later sees it as it is.
- **Seats** are numbered by the tile they're on, and each keeps its piece's
  key beside it; where you arrive for each desk is worked out when a template
  is baked and kept with it. When the floor changes, a room moves its claims
  once (it records which floor its claims are on): each to the free desk
  nearest the one it was, the earliest claim choosing first, so nobody loses
  their desk while there are desks to go round. From the hand-made map's 19
  desks to Startup's 16, that's everyone in an office of up to 16.

Per office that's one row in D1, a few kilobytes in its room, and nothing
else; a thousand offices cost what one does, a thousand times, with no shared
bottleneck.

## Your desk

Claimed by sitting at a free one (as today). Then, sitting there, **Arrange**
shows the desk's things with a handle each: drag it along the desk, swap it
for something else that fits that side, take it away, or add from the desk
things that suit it; the chair has its own picker; **Reset** puts the
template's back. Coworkers see it as you do it. Everything is chosen on the
floor, at the desk, never in a separate editor.

## Weight

Nothing here makes the floor heavier to run: the shell is one picture drawn
once, a desk bank three, each wall or desk thing one small one; working an
office out takes a few milliseconds when the floor loads, and a change redraws
only its piece. What's stored is a few kilobytes of layout and a row per
change.

## Startup

Built in the lab (`layouts/startup.json`), baked (`templates/startup.json`)
and built for the floor (`floors/startup.json`): the hand-made map's rooms and
walls, so the meeting room, its table and the whiteboard are where they were;
four two-sided banks of two maple desks, staggered rather than gridded; a
break room bottom left with a table, vending machines, water and coffee;
every top wall furnished with windows and things in turn, the whiteboard's
spot kept clear; plants by every bank.

What the app loads for it: the room builder sheet (14 KB), which it draws the
walls and floors from, and the catalog's atlas (91 KB), which everything else
is a frame of; the floor file comes with the code (17 KB, a few compressed).
The hand-made map took the room builder sheet, the office sheet (110 KB), the
chairs and the map itself.

## Characters

- **Layers compose exactly.** Body, eyes, outfit, hair, accessory, drawn in
  that order, line up on every frame; nothing needs adjusting.
- **Sitting is drawn from the side only.** Facing up or down, a seated
  character is their standing pose, as our characters already are.
- **Sharper at the same size.** The 32px generator draws 32×64 frames at
  1×; on the floor they're the size of today's 16px characters at 2×, with
  twice the detail.
- **Cheap to load.** Cropped to the rows the floor uses (idle, walk, sit),
  the 432 part sheets come to 2.75 MB, about 6.5 KB each; a character is
  about 30 KB, and parts are shared and cached.

Everyone arrives as a premade character, picked at their first door (as
today), and can change how they look at any time: body, eyes, hair and its
colour, outfit and its colour, one accessory. The premades are recipes in the
same terms, so picking one and then changing the hair is one step.

- the **look** is a small recipe on the profile in D1, carried on the room
  ticket like the character name is today, so everyone sees it as you arrive;
- each client composes the parts into one texture per look and keeps it; the
  parts come from R2, cropped to the rows the floor uses, a few kilobytes
  each, fetched only when someone wears them;
- today's eight characters map to the matching premades, so nobody's look
  changes until they change it.

The creator lives with the profile: the person walking, standing and sitting
as they are now, every style shown on them, colours as swatches, Randomize,
and the premades along the top. Fantasy skins and costume pieces stay out of
the default list.

## The lab and the pipeline

`lab/` is a local tool, kept in the repository and never deployed (its
README says how to run it). Items, bundles, layouts and characters are made
there, and it is the only way art reaches the floor:

1. **Cut** an item from a pack's sheet or singles, or layer it from pieces.
2. **Fit** its colliders, sort line, seats and surface by dragging them on a
   floor while a character walks round it and sits in it; bundle it.
3. **Check**: the house rules run on every change in the lab and in
   `pnpm --dir lab check`, which needs no art and can run anywhere.
4. **Bake** a layout into a template (the layout editor's Bake template):
   a new version only when something changed.
5. **Build**: `pnpm --dir lab build` bakes every drawn item, and every desk
   row the templates' banks need, into one atlas in `private-assets/catalog/`
   (85 items, 91 KB), writes where each one is to
   `shared-protocol/src/catalog/atlas.json`, records the atlas in the asset
   manifest, and works each template out into `floors/<id>.json` for the
   floor.
6. **Upload** the atlas to R2 with the command the build prints; every build
   of the app then pulls and checks it like the rest of the art (`ASSETS.md`).

The catalog, layouts, templates and floors are our own data and live in git;
the art only ever leaves `assets-pack/` as the baked atlas, through R2.

## Build order

Each step ships on its own and needs the one before it:

1. **Templates** (done). Bake in the lab: a template is its shell and every
   piece, with keys, desk seats and where you arrive for each. Startup baked.
2. **The floor from the template** (done). The lab builds what the floor
   needs; the app draws Startup from it instead of the hand-made map; the
   room's desks come from it, and claims move over once. The walls' drawing
   is one function in `shared-protocol` that both use.
3. **Your desk.** Changes in the room, Arrange at your desk, reset when it's let go.
4. **Characters.** The creator, the look on the profile, the premades.
5. **Furnishing for admins.** Move, add and take away furniture; put back.
6. **More themes**, on the same floor plan.
