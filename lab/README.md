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
- **Layout editor** (`/lab/layout.html`): today's office walls and floors,
  furnished from the catalog: place, move, delete, choose a desk's chair, walk
  and sit.
- **Character creator** (`/lab/avatar.html`): the packs' character generator
  layers combined and previewed walking, standing and sitting.

Each page keeps a handle on `window` (`lab`, `layoutLab`) for driving it from a
script: stepping the game, sitting, placing.

## From the lab to the floor

```
pnpm --dir lab check   # the house rules, on the catalog and every layout; needs no art
pnpm --dir lab build   # bakes the atlas, writes atlas.json, updates the asset manifest
```

The build prints the command to upload the atlas to R2 when it changed. The
data (`shared-protocol/src/catalog/`) is ours and lives in git; the art leaves
`assets-pack/` only as the baked atlas.

## Files

- `server.mjs`: serves the pages, Phaser, the packs and the app's public
  files, and reads and writes the catalog and layouts.
- `pages/catalog.js`: the rules and bundle logic, shared by the pages and the
  scripts.
- `check.mjs`, `build.mjs`: the pipeline above.
