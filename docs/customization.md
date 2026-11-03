# Customization notes

How an office's floor is made, drawn and changed: the art and where it
lives, the rules the floor keeps, the building as rooms and everything that
follows from them, what the office furnishes by itself, templates and
people's changes, desks, characters, and the lab that turns art into a
floor.

## The art

**Modern Interiors** (LimeZu, full version), at 16, 32 and 48px; we work at
32.

- **26 themes** of furniture and objects, each as a sheet and as cut-out
  single images (black shadow, which we use, plain and shadowless). Singles
  are trimmed to a 16px grid and numbered, not named, so the catalog names
  them.
- **Room builder**: about 75 floor materials and 55 wall styles.
- **621 animated objects**: doors, coffee machines, fridges, server racks,
  screens, clocks, seasonal pieces.
- **The character generator**: 9 bodies, 7 eye colours, 33 outfits, 29
  hairstyles, 19 accessories and 20 premade characters, every sheet on the
  same grid of 32×64 frames (idle, walk, sitting, phone, reading and more).

**Modern Office Revamped**: the office sheet (desks in four finishes, office
chairs, monitors, laptops, printers, sofas, plants, boards, vending machines)
and 339 singles. Its first 95 singles are desk pieces, not desks: whole desks
exist only on the sheet.

**Licence.** Both packs may be used and edited in a commercial product, not
redistributed, with credit (served at `/credits.txt` on both sites, from
`web-shared/public/credits.txt`). Showing the art in an editor is use;
letting people download sprites or sheets isn't something to offer.

**Themes.** An item belongs to a theme (`themes` in the catalog). The office
we have, Startup's, is the office pack's things and a few of the interiors
pack's that sit with them (rugs, floor lamps, egg chairs, plain framed
pictures). The interiors pack's painted pictures, its bookcases full of books
and its pinboard are drawn in another style: next to the office's things they
look like another world, so they're kept under `classic`, for a later theme,
and nothing the office puts up by itself uses them.

### Where it lives

The packs' art isn't in git (a public repository counts as redistributing),
nor is our own drawn art (windows, trees, rocks, flowers, the single desks,
the grounds' tiles), whose code lives with the packs in
`assets-pack/drawn/art.js` (`lab/pages/art.js` only loads it). It wants a
private copy kept somewhere. Everything reaches a page baked, in two
pictures served from R2: the atlas (`catalog/floor-items.png`, every item
the floor draws) and the floor sheet (`catalog/floor-sheet.png`, what walls
and floors are painted from). Our own data stays in git: the catalog,
shells, layouts, templates and floors (`shared-protocol/src/catalog/`).

- **How a build gets them.** `web-shared/assets.manifest.json` lists every
  file with its size and SHA-256. `pnpm assets` in either frontend (it also
  runs before `dev` and every build) copies them from `private-assets/` when
  that folder exists, and otherwise downloads them from the R2 bucket's
  public URL, checking each against the manifest. Neither needs credentials,
  so CI builds without the packs; `pnpm assets --remote` ignores the local
  copy, to check a build elsewhere will work.
- **Running it yourself.** With both packs bought, put them in
  `private-assets/` (ignored by git) in the manifest's layout. Without them,
  everything runs but the floor and characters.
- **Uploading a changed file:** `wrangler r2 object put tinyfloor/<key>
  --file=<path> --remote` (the lab's build prints it for what it changed).
- **Closing the bucket:** `wrangler r2 bucket dev-url disable tinyfloor`, drop
  `publicUrl` from the manifest, and give the build `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (read access) and optionally
  `R2_BUCKET` (default `tinyfloor`).

## The rules the floor keeps

Decided by looking, and checked by the lab on every change (`lab/check.mjs`):

- **Nobody sits sideways.** A seat faces up (your back to us) or down
  (facing us). The packs' side chairs aren't in the catalog.
- **At a desk you face the desk**, and **a desk always has a chair**: it can
  be swapped for another office chair, never taken away, and the seat stays
  in the same spot whichever chair it is. Desks are wood or white, never the
  pack's dark grey.
- **A single desk's owner picks its wood**: maple, oak, beech, walnut, white
  or graphite, from the desk's panel. It stays where it stands and resets
  with the rest of the desk.
- **Seats facing down are drawn behind whoever sits in them, seats facing up
  in front** (their back covers you); a chair you sit in facing up has its
  sort line at its very bottom.
- **A chair's two views**: the front view where you sit facing us, the back
  view where you sit facing away. They're taken from the pack's single
  images, one picture each, since the sheet mixes both views in one row.
  Chairs are tucked in, a tile into the desk or table.
- **Desks are working desks**: one setup, or a phone or a plant, and some
  clear. What's on a desk faces whoever sits there, and nothing stands over a
  chair, so an empty chair is never covered.
- **Everything placed stands on whole tiles**, Startup's half tiles aside
  (its desks are claimed by where they are). What the office puts on desks,
  along walls and in its sitting areas is fitted to them instead.
- **Things are cut where they are**: by their pixels, not tile lines, where
  they sit across one or overlap a neighbour.
- **Nothing that belongs on a desk stands on the floor**: a printer put down
  on its own reads as one dropped there.
- **Everywhere can be walked to**: every desk, the meeting room and every part
  of the floor bigger than a few tiles.

## Items

An item is everything the floor needs to know about one thing: its sprite (a
rectangle cut from a pack image on the 16px grid, optionally mirrored, or
layers cut from several places); its mount (floor, wall, against a wall, on a
desk, or a rug under everything); its colliders; its sort line (above it
you're behind it, below it in front); its seats (a point and a facing); a
surface for things on top; for desk things, the side of a desk they suit;
and its name, category and themes. The catalog
(`shared-protocol/src/catalog/items.json`) has 152.

A **bundle** is items placed and moved together, a part sometimes a slot of
interchangeable items. A **cluster** is a row of desks made to measure:
placed with a size, it builds its own desks, posts, panels and chairs, so a
bank of any size costs no extra art and draws as three pictures. Banks are
two-sided (Startup's, six tiles a desk with the glass divider) or single
desks, one person each (the campus's: four tiles, a wood top, a glass screen
behind on a rail, the chair always on the third tile).

- **Every item needs looking at.** A first guess at a collider and sort line
  is right for plants and cabinets and wrong for chairs, sofas and
  partitions.
- **Shadows join objects on a sheet**, so cutting takes an eye.
- **Our characters' side-sitting frames are swapped** (frame 49 faces right,
  50 left, against `SIT_ORDER` in `AnimationManager`). With no sideways seats
  it never shows.

## The building

### Walls and floors, drawn from a map

A shell is a plain map: one character a tile, from a legend (a wall and its
material, a floor and its material, or nothing). It's drawn from that, never
placed piece by piece (`paintShell` in `shared-protocol/src/shell.ts`, one
drawing for the app and the lab): a wall with floor in front of it shows its
face, two tiles tall; any other wall shows its top; every art pixel is wall
top, wall face or floor, outlined wherever a top meets anything else and a
face meets floor. So corners, joins, a wall's end at a doorway and two walls
meeting come out right whatever the shape. It's drawn once into one picture
when the floor loads, in a worker, and costs nothing after.

- **Walls that draw right.** The template check runs every shell through
  what the painter needs (`wallProblems`): a face lines up with the faces
  beside it, every face has wall above it, and a face is one material along
  its length.
- **Floors** are the room builder's (Startup's grey squares, `plank` despite
  the name, its main floor and the campus hall's) and the interiors pack's
  (`MORE_FLOORS`: cream, sage, dusty rose, light oak), copied onto the floor
  sheet by the lab's build. A pack floor is drawn from its plain tile and a
  wall's shadow on it is worked out, as on the grounds: some of the pack's
  floors draw their edge tiles lighter, not darker.
- **Grounds** are tiles of our own on the floor sheet (`GROUND_TILES`):
  eight grass tiles that can sit by any other, picked a tile from where they
  are so they never repeat, and a block of paving that repeats seamlessly. A
  wall darkens the ground at its foot and beside it. Paths run straight;
  diagonal ones step in pixels.
- **Windows** are drawn in the walls' own style (the packs have none in it),
  some with their blinds part way down, and are ordinary wall items.

### Rooms, and everything that follows from them

A building is a plan (`shared-protocol/src/plan.ts`, kept in its shell as
`plan`): its rooms, each a rectangle with its floor, its kind (open,
meeting, kitchen, lounge, library, quiet) and its carpets; which room is the
hall; the paving outside; and the doors out. Everything else is worked out
from it, the same everywhere and with no randomness (`planShell`):

- **Walls** are the rooms' edges: across, two tiles deep (the top and its
  face), top and bottom alike; down, one tile wide. Rooms side by side share
  the wall between them; one above the other share two rows, so the wall
  between them is one wall, in step.
- **Doorways**: every room opens onto the hall through the wall they share,
  or, if it doesn't touch the hall, onto the neighbour nearest it. One a
  room, in the middle of the shared wall unless the room says where along it
  (`door.at`, from its own corner, so it moves with the room). Rooms that
  only touch for a corner's worth of wall don't open onto each other. A
  doorway's floor runs on from the room above (through a wall across) or the
  room off the hall (through a wall down).
- **Doors out** are the only openings a plan names, and each brings its
  paving: no door opens straight onto the grass. Off a wall down, a patio
  ten tiles along the wall and seven out; off a wall across, a plaza four
  out; both centred on the door. A door through a wall down has two tiles of
  wall under the wall across above it, and its paving can't run into a room.
- **The outside**: a wall facing the grounds is brick, and its face gets
  windows and nothing else.
- **Take a room away** and the hall's wall where its doorway was closes,
  brick with windows if it now faces outside. **Move one** and its walls,
  doorway, carpets and what's in it move with it, and it's furnished afresh
  where it lands.
- **What can't be built** is said, not drawn: rooms over each other, a room
  with no way in, a doorway that doesn't fit, a door out that leads into a
  room. The lab check asks that every planned shell is what its plan draws.

## What the office furnishes by itself

What stands along the walls and the sitting areas in the rooms are worked
out from the building, never placed (`lab/pages/floor.js`). Each draws its
randomness from one seed every office shares and from its own place and
size, which is also its key: `wall:15,2,9` (a wall's first tile and length),
`room:58,13,65,29` (a room's rectangle). So the same wall or room in the same
place is furnished the same in every office; moved or resized by a tile, it's
furnished afresh; and a person's change to one of its things is kept against
that key, through any edit that doesn't touch it. Only the office theme's
things go up.

**Along the walls.**

- **Top walls**: windows first on an outside wall, one size and spacing,
  centred, every other one left out. Then things in groups, with bare wall
  between: what stands against a wall (the kitchen's shelf, the shelf with
  its water cooler, a cooler), what hangs on it (the office's pictures,
  certificates, a trophy) and what a team pins up (whiteboards, charts,
  notice boards). The kinds take turns, never the same twice running and
  less likely each time they're used, and a wall starts with something hung,
  so even a short one between doorways gets a picture or a board.
- **By the room**: a meeting room's walls are boards and pictures, a
  library's shelves, a café's its kitchen (vending machines, coffee, water,
  along its longest wall) and pictures, a lounge's and a quiet room's
  pictures and a shelf, the hall a bit of everything. A shell with no plan
  (Startup's) is furnished as one hall, its kitchen along the longest wall.
- **Limits**: two plants a wall at most (one if it's short), never side by
  side; one water cooler; nothing twice in a row; nothing over a window or
  over anything else; a picture or a board a tile in from a wall's end, not
  against a corner or a doorway; nothing where someone has put furniture or
  where the floor keeps a spot (the whiteboard's).
- **Side walls**: a plant or a cooler here and there, one plant a wall,
  clear of corners and doorways, and always a tile to walk past it to the
  furniture. The side desk (`wall-cabinet`) only stands against a wall on its
  right.
- **Lamps**: a room's floor lamp stands in a top corner; the hall gets one each
  side, slid down its wall to where there's a way past. Red, the warm one,
  everywhere, except the rooms furthest from the middle of the building
  (about one in five, at least one), which get the blue.

**Sitting areas.** The hall and a library get one: a rug, a low table on its
middle, and a seat either side (egg chairs in two colours, or armchairs in a
library), their feet on the table's line, all on the rug. A lounge gets a
corner of egg chairs instead: one of each colour (coral, mustard, teal,
lilac) round a low table, two facing you and two with their backs to you.
The egg chairs are the pack's, traced in art.js so they come in any colour
and from behind. It
goes as near the middle of the room as it fits: on the room's own floor, off
the carpets and a tile clear of every doorway, with a tile round it clear of
anything placed and of carpets. A room an even number of tiles across inside
gets it in its very middle; a room with no such place goes without. Bold rugs
read as part of a sitting area when something is lined up on them; on their
own they read as objects.

**Outside.** Every patio and plaza gets its benches from where it is
(`patio:66,16,72,25`), the same on every side: a tile in from its edges and
clear of the way out of the door. A patio gets two pairs, a tile and four
tiles out from the wall, near either end, with a small tree between them; a
left patio is a right one mirrored. A plaza gets a bench either side of the
door.

**Colour** comes from things, not floors: the rugs, the red floor lamps (and
the odd blue one), the egg chairs, the office's pictures and the charts on its
boards.

## Walking, clicking and solids

- **Where you can stand** is one rule everywhere: a tile is walkable when
  nothing solid covers its middle. Walking with keys, the path a click walks
  and the lab's checks all use it.
- **Solids come from the pieces.** The floor file carries each thing's
  colliders, and the app works out what's solid from the walls and the pieces
  as they stand (`officeSolids` in `office.ts`), again whenever a piece
  changes, so a piece moved, swapped or added is walked round where it is.
- **Up against a wall**: a wall's face reaches 12px into the floor in front
  of it (`FACE_GAP`), and what stands against a wall is solid to the same
  line, so your feet stop just short of its foot and the tile in front is
  one you can walk to. A wall at your side keeps you 16px off it, except
  either side of a doorway through a wall across.
- **Chairs aren't solid**, so keys walk you over them rather than catching;
  sofas, tables and benches are. Sitting is a click or E.
- **Clicking where you can't stand** walks you to the nearest tile you can.
- **Seeing it.** ` (backquote) in development, or `?walk` anywhere, lays
  where you can walk over the floor (`lib/WalkOverlay.ts`): tiles a click can
  reach, ones it can't, what's solid, and the point at your feet.

## The camera

`lib/CameraRig.ts`:

- **Following you**, gently, with some room before it moves.
- **Dragging the floor** with any button, with the grabbing hand: a click
  acts when the press ends, not after a drag (`wasDrag`). The view eases
  after the pointer, so an uneven mouse still moves it smoothly; let go, it
  coasts and slows, and stops at the floor's edges.
- **Coming back** only when you set off yourself (a key, a click, an
  errand), gliding with its speed capped; Phaser's own follow, which snaps,
  only starts once the view is already there.
- **Zooming** keeps one point still: you when it's following you, the floor
  under the pointer when you're looking round. From 0.4 to 1.6 times the
  usual view, never so far out that the whole floor fits: at most 80% of it
  each way, so there's always some floor to drag to. Screens are wide, so
  grounds go further sideways than up and down.

## Templates, offices and changes

A **template** is an office frozen: its shell and every piece written down,
with keys, desk seats and where you arrive for each desk. It's baked in the
lab from a layout (a shell, a seed, what's placed, and changes), with
everything the generators put there written out, so the floor never runs a
generator: two offices on the same template look exactly the same until
someone changes one. A template is versioned (`startup@1`); a version never
changes once offices use it, and a new one keeps the keys of every piece it
didn't change.

An office is its template and its **changes**, each kept against one
piece's key: `{ hidden }`, `{ at: [x, y] }`, `{ item }` (swapped for another
that fits), or a new piece `{ item, at }` under a key of its own. A desk's
pieces take only `{ hidden }` and `{ item }`: where they stand is their
spot's. One
function turns a template and its changes into the floor, in
`shared-protocol`, so the lab, the app and the room work an office out the
same way, in a few milliseconds.

- **Your desk**, once it's yours: what stands in each of its spots, its
  chair and its wood. The room checks the piece is on the desk you hold and
  fits. Letting it go puts its things back.
- **Admins**: the furniture (move, add, take away, put back), and the rooms
  (below). A desk bank with a claimed desk can't be taken away until it's let
  go.
- **Limits**, so an office stays light on a phone: three things a desk (its
  spots), 300 pieces added, a few edits a second a person.

**Serving it.**

- **Templates** ship with the app (a few kilobytes each, compressed); each
  theme's art is one atlas and one floor sheet in R2, cached forever.
- **The office** in D1 says which template and version it's on. Nothing on
  the floor's hot path touches D1.
- **Changes** live in the office's room (its Durable Object's SQLite), one
  row a changed piece; the room is the one writer, so changes never race.
  Arriving, the welcome carries every change; changing, the client sends
  `{ key, change }`, the room checks and writes it and tells everyone there,
  and each client redraws only what differs. A change waiting to send is
  replaced by a newer one to the same piece.
- **Seats** are numbered by the tile they're on. When the floor changes under
  a claim, the room moves it to the free desk nearest, the earliest claim
  choosing first, so nobody loses a desk while there are desks to go round.

Per office that's one row in D1 and a few kilobytes in its room.

## Building rooms

In the lab's layout editor, Rooms mode (the builder's first form): click a
room to pick it up; it follows the pointer, held against whichever side of
the hall is nearest, sharing its wall, slid along it but always sharing
enough for a doorway, flush with a room already on that side within two
tiles, never over another room or in front of a door out (`attach` in
`plan.ts`). Its walls, its doorway, the hall's wall it left, what's on the
walls and its sitting area are worked out again each time it moves a tile.
Click to put it down (trees under it give way), Esc to put it back, Delete
to take it away with what's in it. "Add a room" picks up a new one from a
preset (meeting room, lounge, quiet room, library, café), or a patio. A patio
is carried the same way, along whichever outside wall is nearest (a tile in
from the corners, never into a room or another patio: `attachPatio`), and
its door goes through that wall wherever it's put down; take it away and the
wall closes. A room snaps to
the hall; a room off another room is a plan edit for now.

**Live and baked.** Live, where it's being built: the shell from the plan,
the walls' things, the sitting areas, solids. Baked when it's published:
the shell's rows and every piece, so an office loads one small file and
runs no generator. An office that changes its rooms will keep its own plan
and publish its own template from it; walls and rooms it didn't touch keep
their keys, so changes to their things carry over, and a change to
something that's gone is left out.

## Your desk

Claimed by sitting at a free one. The dock has the way back to it (a key of
its own) and **you**, its first key: pressed, the dock opens up into your
status and note, and, sitting at your desk, Customize your desk. Customizing
opens the desk's panel, a card at the floor's right (over its foot on a
phone), and the floor brings the desk into the floor it leaves showing,
without zooming. Nothing is dimmed: the floor stays the floor.

**A desk is three spots, its chair and its wood**, changed one part at a
time, so nothing ever stands over anything else.

- **Spots**, left to right, one thing each, centred across the spot with its
  foot on the desk's line, so a row of desks lines up. A single desk: a lamp,
  a plant or something small on the left, the screen in front of you,
  something small on the right. A bank's near desk: a setup on one side, two
  small things on yours; its far desk: screens on the strip in front of you,
  a small thing either side. A spot takes what's no wider than it and suits
  the desk's side; a single desk takes only our drawn things.
- **The panel**: its top is the desk in small (the three spots as wide as
  they are on the desk, the chair, the wood), the part picked marked; under
  it, what that part can be, grouped (tech, lamps, personal, setups), or the
  chairs, or the woods; Remove empties a spot. Undo, redo, Reset after a
  confirm, and Done.
- **On the floor**: the spots are outlined faintly while decorating; pointed
  at, a part is outlined; pressed (a spot, the chair, the desk itself),
  picked, the same part the panel shows. Delete empties the picked spot;
  Escape, Ctrl+Z and Ctrl+Y work too.
- **Seen happening, by everyone**: a new thing drops on, one taken away lifts
  off, one swapped hops.

**How the floor's own desks are made up** (single desks, `singleDesk` in the
lab): every desk different, a row easy on the eye together. A row's screens
and small things are dealt from its own shuffled runs, so neighbours never
match; along a row the left spot goes lamp, plant, lamp, the row behind the
other way round; a row has one accent colour and a desk shows it (or a
picture, or a globe) once at most, everything else in neutrals. Screens have
light bezels only.

## Characters

- **32px**, the pack's own size for every character; 48px would have to be
  scaled down, which pixel art doesn't survive.
- **Presets and looks.** The pack's earlier characters aren't made of the
  generator's parts, so they stay whole pictures (presets), each with the
  look nearest it, so changing one part changes only that. The generator's
  own premades are looks (18 of its 20 exactly).
- **Layers compose exactly**: body, eyes, outfit, hair, accessories, in that
  order, on every frame.
- **Whole pixels only**: off the floor a character is drawn at two or three
  times its size, never in between.
- **Cheap to load**: every part and preset is one strip of the two rows the
  floor uses, with a palette, a kilobyte or two each.

Everyone starts as a preset, picked at their first door; the creator has
sixteen presets, the generator's characters and every part, with
accessories in slots that go together. Someone's character is one short
string on their account, the same in every office: `Adam`, or
`body.1/eyes.1/outfit.1-2/hair.4-3/glasses.15-1`.
`shared-protocol/src/character.ts` says what's valid, for the creator, the
API and the room alike. Every character anywhere is drawn by
`web-shared/src/lib/characterSheet.ts`, its layers stacked once into a sheet.
The creator shows you on the office's floor at three times your size,
trying on whatever the pointer is over.

## The lab and the pipeline

`lab/` is a local tool, never deployed (its README says how to run it), and
the only way art reaches the floor:

1. **Cut** an item from a pack's sheet or singles, or layer it from pieces.
2. **Fit** its colliders, sort line, seats and surface on a floor a
   character walks round and sits in.
3. **Lay out** an office in the layout editor: furnish, paint walls and
   floors, or move rooms. Or by script: `lab/campus.mjs` writes the campus's
   shell (with its plan) and layout.
4. **Check**: `pnpm --dir lab check`, which needs no art.
5. **Bake** a layout into a template (Bake template, or `node lab/bake.mjs
   <id>`): a new version only when something changed.
6. **Build**: `pnpm --dir lab build` bakes every item into the atlas, writes
   the floor sheet, and works each template out into `floors/<id>.json`.
7. **Upload** what changed to R2 with the commands it prints.

## The offices

Each office is on one floor, `offices.floor`, and the demo office on
`LOBBY_FLOOR`. The room ticket says which: the room keeps its desks to it
(a move settles each claim on the nearest desk of the new floor's size), and
the page draws it, remembering it in the browser so the next load draws it
straight away; a browser that has never been on a floor draws Campus, where
most first visits now land. A page that drew the wrong one loads once more.
The team moves an office from its admin page, and everyone on it reconnects
to the new floor.

**Startup**, where every office began: the hand-made map's rooms and walls
(48×32), four two-sided banks of maple desks (16), a meeting room with its
whiteboard, a break room with its kitchen. Drawn tile by tile, with no plan.

**Campus**, the new one: since 3 November every new office and the demo
office start on it, and older offices move to it one at a time. 82×52 tiles, a
building of rooms round an open hall on grass with trees, a plaza at the
front door and two patios. Twelve single desks, two teams of six on sage
carpets, on the hall's grey squares; a meeting room, a café, a booth, a
lounge, a library, a quiet room and a studio. Built from a plan, so it's what
the builder will start every office from.

Once every office is on Campus, Startup, the floor column and the switch go,
and FLOOR is the one floor again.

## Next

- **Furnishing for admins**: move, add and take away furniture, and the
  rooms, in the office itself.
- **Seats and desks worked out from the pieces** where they're drawn, as
  solids are, rather than baked.
- **More themes** on the same rules.
