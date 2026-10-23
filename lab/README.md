# Lab

The local tool the floor's furniture is made in: cut items from the art packs,
fit their colliders, sort lines and seats while a character walks round them
and sits in them, bundle desks with their chairs, lay out template offices,
and bake it all for the floor. Kept in the repository, never deployed. What it
found and the rules it keeps are in `docs/customization.md`.

## Running it

```
pnpm lab
```

Then open http://localhost:4400. It needs:

- the packs unpacked in `assets-pack/` (ignored by git) as `moderninteriors/`
  and `modernoffice/`;
- the app's `public/` filled (`pnpm --dir app-frontend assets`), for the
  office walls, floors and characters.

## Pages

- **Item lab** (`/lab/index.html`): cut an item from a pack's singles or a whole
  sheet, then drag its colliders, sort line, seats and surface into place on
  the floor; arrows or WASD walk, E sits. Bundles (a desk and its chair slot)
  are made here too: drag their parts. The house rules are checked on every
  change, at the bottom of the list.
- **Review** (`/lab/review.html`): the whole catalog at once with every shape
  drawn and the rules' verdict. `?category=desks` or `?q=chair` narrow it.
- **Layout editor** (`/lab/layout.html`): an office's walls and floors and
  what's in it. Furnish: place, move and delete; size a desk bank by dragging
  its handles (right edge for more desks, top edge for the far side), choose
  its chairs, shuffle what's on its desks; walk and sit. Walls: paint
  rectangles of wall, floor or nothing, and the walls work themselves out
  (`pages/shell.js`). New seed picks every desk's things again. **Bake
  template** freezes the office into a template (`templates/<id>.json`):
  what the seed made written down as pieces, so offices never run a
  generator; a new version only when something changed.
- **Character creator** (`/lab/avatar.html`): the packs' character generator
  layers combined and previewed walking, standing and sitting.

Each page keeps a handle on `window` (`lab`, `layoutLab`) for driving it from a
script: stepping the game, sitting, placing.

## From the lab to the floor

```
pnpm --dir lab check   # the house rules, on the catalog, layouts and templates; needs no art
pnpm --dir lab build   # bakes the atlas and the floors (floors/<id>.json), updates the asset manifest
pnpm --dir lab characters   # the presets and the character parts as strips, and characters.json
```

Each says what to upload to R2 when something changed. The
data (`shared-protocol/src/catalog/`) is ours and lives in git; the art leaves
`assets-pack/` only as the baked atlas and the cropped character parts.

## Files

- `server.mjs`: serves the pages, Phaser, the packs and the app's public
  files, and reads and writes the catalog, layouts, shells and templates.
- `pages/catalog.js`: the rules, bundles and desk banks (with their seeded
  desk things), shared by the pages and the scripts.
- `pages/floor.js`: an office from what's stored to what's drawn, every
  piece with a stable key: in the lab from a layout and its seed (the wall
  dressing lives here), on the floor from a template and its changes
  (`officeFloor`, no seed); `bake` turns the one into the other.
- `characters.mjs`, `png8.mjs`: the presets and character parts, as 8-bit strips, and what's offered.
- `pages/characters.html`: characters compared on a patch of floor, at the floor's scale.
- `manifest.mjs`: records what the scripts bake in the asset manifest.
- `pages/art.js`: what's drawn rather than cut (windows).
- `pages/shell.js`: walls and floors drawn from a plain map, by
  `shared-protocol/src/shell.ts` (the app draws the floor's walls with it
  too; the server strips its types for the browser).
- `check.mjs`, `build.mjs`: the pipeline above.
