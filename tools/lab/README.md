# Item lab

Local pages for turning the bought art into things on the floor, and checking
them with a character walking round them. Nothing here ships.

```
node tools/lab/server.mjs
```

Then open http://localhost:4400. It needs the packs unpacked in `assets-pack/`
(ignored by git) as `moderninteriors/` and `modernoffice/`, and the frontend's
`public/` filled (`pnpm assets`) for the office walls and floors.

- **Item lab** (`/lab/index.html`): cut an item from a pack's singles or from a
  whole sheet, then set its colliders, sort line, seats and surface by dragging
  them on the floor while you walk round it (arrows or WASD, E to sit).
  Saves to `shared-protocol/src/catalog/items.json`.
- **Review** (`/lab/review.html`): every item at once with its shapes drawn, to
  look over the catalog. `?category=seating` or `?q=chair` narrow it.
- **Layout editor** (`/lab/layout.html`): today's office walls and floors with
  catalog items placed on them. Saves to `shared-protocol/src/catalog/layouts/`.
- **Character creator** (`/lab/avatar.html`): the pack's character generator
  layers (body, eyes, outfit, hair, accessory) combined and previewed walking,
  standing and sitting.

Each page keeps a handle on `window` (`lab`, `layoutLab`) for driving it from a
script: stepping the game, sitting, placing.
