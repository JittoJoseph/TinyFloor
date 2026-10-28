# Customization notes

Findings from going through the bought art and building a lab to try it,
October 2026: what the packs hold, what an item, a layout and a character
need to be, what went wrong when we tried, and an order to build it in.

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
which the app draws and the room reads its desks from. Everyone walks in as
one of the pack's characters, drawn at 32px, and can make their own look in
the creator (Characters, below).

The hand-made map it replaced (`office-map.tmj`, from `tools/buildmap.py`)
is now only what the website's pictures of the floor were drawn from.

## Where the art lives

The pixel art comes from two paid packs by LimeZu: [Modern
Interiors](https://limezu.itch.io/moderninteriors) for the characters and
[Modern Office Revamped](https://limezu.itch.io/modernoffice) for the office.
Both licences allow using and editing the art in this project, commercial or
not, and both forbid redistributing the art itself. A public repository
counts as redistributing, so these are not in git:

```
*-frontend/public/characters/*/*.png
*-frontend/public/tilesets/textures/*.png
*-frontend/public/tilesets/items/*.png
*-frontend/public/catalog/*.png
```

Our own work stays in git: the floors and templates (`shared-protocol/src/catalog/`),
the old hand-made map (`app-frontend/public/tilesets/office-map.tmj`) and the
pictures rendered from it (`web-shared/public/floor.webp`, the social cards in
`marketing-frontend/public/og/`).

- **How a build gets them.** `web-shared/assets.manifest.json` lists every file
  with its size and SHA-256. `pnpm assets` in either frontend (it also runs
  before `dev` and every build) copies them from `private-assets/` when that
  folder exists, and otherwise downloads them from the R2 bucket's public URL,
  checking each against the manifest. Neither needs credentials, so CI builds
  without the packs. `pnpm assets --remote` ignores the local copy, to check a
  build elsewhere will work.
- **Running it yourself.** With both packs bought, put your copies in
  `private-assets/` (ignored by git) in the manifest's layout and everything
  works offline. Without them, everything runs but the floor and characters.
- **Uploading a changed file:** `wrangler r2 object put tinyfloor/<key>
  --file=<path> --remote`, then update the manifest entry's size and SHA-256.
- **Closing the bucket:** `wrangler r2 bucket dev-url disable tinyfloor`, drop
  `publicUrl` from the manifest, and give the build `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (an R2 token with read access) and
  optionally `R2_BUCKET` (default `tinyfloor`).
- **Characters.** `pnpm --dir lab characters` crops the presets and the
  generator's parts into the strips the floor uses (`characters/presets/`,
  `characters/parts/`); the browser assembles them (`web-shared/src/lib/characterSheet.ts`).
- **Credit.** The Modern Interiors licence requires credit to
  [LimeZu](https://limezu.itch.io), and the Modern Office licence welcomes it.
  It's served at `/credits.txt` on both sites, from `web-shared/public/credits.txt`.

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
section). The catalog (`shared-protocol/src/catalog/items.json`) has 127:
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
- a new piece, `{ item, at }`, under a new key of its own (on a desk,
  `<desk>/+<id>`, so the key says which desk it's on).

One function turns a template and its changes into the floor (pieces with
keys, depth, seats, colliders). It lives in `shared-protocol`, so the lab,
the app and the server work the office out identically; it takes a few
milliseconds.

**Who changes what:**

- **Your desk**, once it's yours: the things on it (move along it, swap, take
  away, add, up to eight), its chair (any office chair; a desk always has
  one) and its finish. The room checks that the piece is on the desk you hold
  and that the thing fits there, with the same function the app uses.
- **Admins**: the furniture. Move, add and take away tables, sofas, plants,
  wall pieces and desk banks, and put any piece back to the template's. Walls
  and floors stay as the template has them, so every room and doorway stays
  where the rules were checked. A desk bank with a claimed desk on it can't be
  taken away until the desk is let go.
- **Letting a desk go** (or leaving the team) puts its things back to the
  template's: the next person gets a clean desk.

**Limits**, so every office stays light on a phone: eight things a desk, 300
pieces added to an office, a few edits a second per person.

## Serving it

- **Templates** ship with the app (a few kilobytes each, compressed), and each
  theme's art is one atlas in R2, cached forever under its hash. Nothing about
  an office's look is fetched per office except its changes.
- **The office** in D1 says which template and version it's on: two columns.
  Nothing on the floor's hot path touches D1.
- **Changes** live where the desks already do: in the office's room (its
  Durable Object's SQLite), one row per changed piece
  (`key, desk, change, by, at`). The room is the one writer for its office,
  so two people changing things never race.
- **Arriving**, the welcome message carries every change (a few kilobytes for
  a busy office, nothing for an untouched one); the client works the floor out
  and draws it.
- **Changing**, the client sends `{ key, change }` (or nothing, to put the
  piece back); the room checks who may change it and that it fits, writes the
  row, and sends `{ key, change, by }` to everyone there. Each client redraws
  only the pieces that differ. So a coworker's desk changes while you watch,
  and anyone arriving later sees it as it is. Resetting a desk, letting it go
  or leaving the team deletes its rows and sends the office's changes again.
- **Pacing**: the room takes a few actions a second from each person; the
  client sends one change at a time, about four a second, and a change still
  waiting is replaced by a newer one to the same piece, so dragging and
  undoing quickly never trips the limit.
- **Seats** are numbered by the tile they're on, on every floor (the
  hand-made map numbered its chairs by tile too), and each keeps its piece's
  key beside it; where you arrive for each desk is worked out when a
  template is baked and kept with it.
- **When the floor changes under a claim** (a desk it doesn't have any more,
  as with every claim on the hand-made map's 19 desks), the room moves the
  claim as it starts, before anything reads its claims: to the free desk
  nearest the tile it was on, the earliest claim choosing first, so nobody
  loses their desk while there are desks to go round (from 19 desks to
  Startup's 16, everyone in an office of up to 16), and a claim with none
  left is let go. It needs nothing of the old floor, so there's no old floor
  kept, no record of which floor a room is on and no script to run over
  every office: a room with nothing to move only reads its claims.

Per office that's one row in D1, a few kilobytes in its room, and nothing
else; a thousand offices cost what one does, a thousand times, with no shared
bottleneck.

## Your desk

Claimed by sitting at a free one (as today). Nothing appears when you sit
or when you point at it. Your desk is reached through **you on the floor**,
at its top right, opposite where you are and who's here, and as tall:

- at rest, your character, head and shoulders, a pixel to a pixel, with your
  status on it: the rail's face (bottom left) is you everywhere, your
  account; this is you here, so the two never look alike or do the same job;
- pointed at, it widens to your name, as a desk's plate does;
- pressed, it grows down into a card: you standing on the office's floor,
  head to waist at twice your size, your name, status and note (or that
  you're at your desk); then your desk (go to it, or, sitting at it,
  customize it) and how you look;
- customizing, the same card grows into the desk's things, and the floor
  brings the desk into the middle of what the card leaves showing, without
  zooming (pixel art blown up looks worse, not better). Nothing is dimmed
  and you aren't faded: the floor stays the floor.

One thing changing shape, never two things trading places. The rail's menu
keeps what's yours everywhere (profile, status, note, music, settings); the
card keeps what's yours on this floor, and nothing is in both. Away from the
floor, how you look is changed from your profile's Character section.

In the card:

- **Things**: what suits the desk's side, on shelves (tech, lamps,
  personal, setups) and the chairs, each cropped to its pixels, at twice its
  size when small and its own size when not, never in between. A card
  clicked goes where there's room; with a thing picked on the desk, it takes
  that one's place, standing where it stood. A card dragged out is carried:
  over the desk it shows where it would stand, and it's put down there.
- **On the desk**: pointed at, a thing is outlined; pressed, picked and
  framed, with a little bar over it (take it away, done); dragged, it lifts,
  slides along the desk kept to where it can stand, and settles where it's
  let go. While something is in hand, a faint outline shows the desk's top.
  Delete, Escape, Ctrl+Z and Ctrl+Y work too.
- **Undo, redo**, **Reset** after a confirm, and **Done**.

Changes are seen happening, by everyone: a new thing drops onto the desk, one
taken away lifts off, one moved slides, one swapped hops. A coworker's desk
changes like this while you watch.

What the desk things are: 40 from the office pack's singles (monitors and
monitor setups in several colours, laptops, keyboards, lamps facing either
way, phones, photo frames, mugs, books, papers, a desk plant), and the backs
of monitors for far desks. Each has which side of a desk it suits, its frame,
where its pixels are in the frame, and its shelf.

Where a thing may stand is measured from the art, not the frames (the
frames carry margins: a laptop's pixels end 16px above its frame's foot):

- along the desk's length, by its pixels, right up to the posts;
- the foot of its pixels on the desk's top: a near desk's wood, from under
  the divider to its front edge; a far desk's strip behind the divider;
- on a near desk, nothing rising over the divider's top: before this, a tall
  setup dragged to the back stood over onto the far desk;
- anywhere along it, in front of whoever sits there included: things on a
  desk are behind the person at it either way.

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

What the app loads for it: the room builder sheet (14 KB), which it paints the
walls and floors from (in a worker, while the office is still being read: on
the page it cost the floor's start over 100 ms), and the catalog's atlas
(108 KB), which everything else is a frame of; the floor file comes with the
code (17 KB, a few compressed).
The hand-made map took the room builder sheet, the office sheet (110 KB), the
chairs and the map itself.

## Characters

- **The earlier characters come at 32px too.** The pack has every one of its
  earlier characters (the eight the floor began with, and twenty-odd more) at
  16, 32 and 48px. At 32px they're the same people, the same size on the
  floor as the 16px ones at twice their size, with twice the detail. 48px
  would have to be scaled down, which pixel art doesn't survive.
- **They aren't made of the generator's parts.** Matched part by part, none
  of them comes out exactly: they're an older drawing of the same style. So
  they stay whole pictures, the presets, and for each the lab finds the look
  nearest it (its skin, eyes, outfit and hair, as close as the parts come),
  which is close enough that changing one part of a preset doesn't change
  the rest.
- **The generator's own premades are looks**: matched from the top layer
  down, 18 of its 20 are exactly a set of parts.
- **Layers compose exactly.** Body, eyes, outfit, hair, accessories, drawn in
  that order, line up on every frame. Hair carries faint shading that falls
  on the face beneath it, so a premade only matches its parts where nothing
  at all lies above.
- **Whole pixels only.** Shown off the floor, a character is drawn at twice
  or three times its size, never in between; head-and-shoulders crops and
  fractional sizes made the art look wrong.
- **Cheap to load.** Every part and preset is one strip of the two rows the
  floor uses (idle and walk, 48 frames), written with a palette: a kilobyte
  or two each, 587 KB for all 448. A preset is one strip, a look about five.

Everyone starts as a preset, picked at their first door from the eight the
floor began with; the creator has those and eight more of the pack's
(Bruce, Samuel, Edward, Rob, Roki, Pier, Josh, Jenny), the generator's
characters to start from, and every part: all nine skins, seven eye colours,
33 outfits, 29 hairstyles in every colour, and accessories in slots that go
together (face: beard, moustache, mask, monocle, balaclava; glasses; hat;
gloves; backpack).

Someone's character is one short string, kept on their account, so it's the
same in every office: a preset by name, `Adam`, or a look,
`body.1/eyes.1/outfit.1-2/hair.4-3/glasses.15-1`. It's carried where the name
always was (the profile in D1, the room ticket, the room's players), and
existing accounts, which have one of the eight names, look as they did, only
sharper. `shared-protocol/src/character.ts` says what's valid, from
`catalog/characters.json` (`pnpm --dir lab characters`), for the creator,
the API and the room alike.

Every character anywhere is drawn by one thing,
`web-shared/src/lib/characterSheet.ts`: its layers stacked once into a sheet
(idle, walking, a seated pose a direction), kept for whoever wears it. The
floor makes its sprites' textures from it; the doors, the creator and the
website's pictures draw from it onto a canvas, in whole pixels. Saving a look
keeps it on the account and tells the room, which shows everyone the new look
where you stand.

The creator: you on the left, standing on the office's own floor at three
times your size, turning and walking, trying on whatever the pointer is
over; characters, skin and eyes, hair, outfit and extras on the right, each
choice drawn on you, colours as swatches; Randomize; on a phone, a sheet.

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
   (125 pictures, 108 KB), writes where each one is to
   `shared-protocol/src/catalog/atlas.json`, records the atlas in the asset
   manifest, and works each template out into `floors/<id>.json` for the
   floor.
6. **Upload** the atlas to R2 with the command the build prints; every build
   of the app then pulls and checks it like the rest of the art (see "Where the art lives").

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
3. **Your desk** (done). Changes in the room, decorating from your desk,
   reset when it's let go.
4. **Characters** (done). The presets at 32px, the creator, the look on the
   account.
5. **Furnishing for admins.** Move, add and take away furniture; put back.
6. **More themes**, on the same floor plan.
