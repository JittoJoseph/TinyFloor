// The campus: an office set in grounds, written as its plan (the rooms, what
// they're for, their carpets and the doors out) and a layout of what's in it,
// then as the shell and the layout the lab edits and the floor draws
// (shared-protocol/src/catalog/shells/campus.json, layouts/campus.json).
// Walls, doorways and the brick outside come from the plan
// (shared-protocol/src/plan.ts); what stands along the walls, from the walls
// (lab/pages/floor.js). Running it again starts both over.
//
//   node lab/campus.mjs

import { writeFile } from "node:fs/promises";
import { planShell } from "../shared-protocol/src/plan.ts";

const W = 82;
const H = 52;
const T_ = 32;
/** The building stands this far in from the grounds' left edge: screens are wide, so there's more grounds either side than above and below. */
const O = 7;
const at = (x0, y0, x1, y1) => [x0 + O, y0, x1 + O, y1];

// ---------- the building ----------
//
// Rooms round an open hall, each a rectangle of its own size, so the outline
// steps in and out the way a real building's does. Each opens onto the hall,
// or onto the room between it and the hall, in the middle of the wall they
// share unless it says where (door.at: tiles from its own left or top wall).
const plan = {
  size: [W, H],
  main: "hall",
  walls: { inside: "lavender", outside: "brick" },
  rooms: [
    {
      id: "hall",
      kind: "open",
      rect: at(16, 17, 51, 36),
      floor: "plank",
      // The teams' carpets, a tile wider than their desks all round; the walk between them stays the hall's floor.
      carpets: [
        [2, 2, 15, 13, "sage"],
        [20, 2, 33, 13, "sage"],
      ],
      exits: [{ side: "bottom", at: 6, width: 4 }], // the front door, onto a plaza
    },
    { id: "meeting", kind: "meeting", rect: at(18, 7, 30, 18), floor: "cream", door: { at: 4 } },
    // The café, wide open to the hall, in line with the walk between the teams.
    { id: "cafe", kind: "kitchen", rect: at(30, 9, 43, 18), floor: "oak", door: { at: 2, width: 4 } },
    { id: "booth", kind: "quiet", rect: at(43, 12, 51, 18), floor: "rose" },
    // The lounge and the library are an even number of tiles across inside, so the sitting area in each (four wide) is
    // in the very middle.
    { id: "lounge", kind: "lounge", rect: at(51, 13, 58, 29), floor: "rose", exits: [{ side: "right", at: 7 }] }, // out to the garden patio
    { id: "library", kind: "library", rect: at(9, 22, 16, 32), floor: "cream", door: { at: 5 }, exits: [{ side: "left", at: 4 }] }, // out to the terrace
    // Under the library and no wider, so the terrace off the library runs past it.
    { id: "quiet", kind: "quiet", rect: at(9, 31, 16, 41), floor: "sage" }, // through the library
    // At the end of the walk between the teams.
    { id: "studio", kind: "meeting", rect: at(31, 35, 43, 44), floor: "cream", door: { at: 2 } },
  ],
  // Every door out has its paving and benches by itself (plan.ts, floor.js); a path runs from the front door's plaza off
  // the bottom edge. Paths run straight: drawn diagonal, pixel paving steps.
  paving: [{ path: [[24 + O, 40], [24 + O, H + 1]], radius: 1.1 }],
};
const shell = planShell(plan);
if (shell.problems.length) throw new Error(`the plan can't be built:\n${shell.problems.join("\n")}`);
const room = (id) => plan.rooms.find((r) => r.id === id).rect;

// ---------- what's in it ----------

const items = [];
/** Places an item at tile (x, y) of the building (O is added); its id says where it is, so it stays put across runs. */
const put = (item, x, y, extra = {}, offset = O) => {
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error(`${item} at ${x},${y} is off the grid`);
  items.push({ id: `${item.replace(/[^a-z0-9]/g, "").slice(0, 10)}-${x + offset}-${y}`, item, x: (x + offset) * T_, y: y * T_, ...extra });
};

/** A meeting table with chairs along both sides: mesh chairs above facing down, backs below facing up. */
const table = (item, x, y, seats, colour = "black") => {
  put(item, x, y);
  for (let i = 0; i < seats; i++) {
    put(`chair-${colour}-mesh`, x + 1 + i * 2, y - 1);
    put(`chair-${colour}-back`, x + 1 + i * 2, y + 2);
  }
};

/** A row of single desks sharing their posts, each its own piece: four tiles wide, the chair on the third. */
const desks = (finish, x, y, count) => {
  for (let i = 0; i < count; i++) put(`desk-single-${finish}`, x + i * 4, y, { size: { cols: 1, sides: 1 } });
};

// Everything stands on whole tiles.
//
// The hall: two teams of six, each two rows of three desks on its carpet,
// with the walk between them clear from the front door to the café. What
// stands along the walls, and the sitting
// areas in the hall, the lounge and the library (a rug, a table, two chairs),
// are the office's own (lab/pages/floor.js).
desks("maple", 19, 20, 3);
desks("maple", 19, 25, 3);
desks("white", 37, 20, 3);
desks("white", 37, 25, 3);
put("ours-bush-slate", 28, 32);
put("ours-bush-sage", 49, 32);

// The meeting room, with the whiteboard over the middle of its table.
table("meeting-table", 21, 12, 3);
// The café: two tables; the office puts the kitchen along its back wall.
table("meeting-table-small", 32, 13, 2, "tan");
table("meeting-table-small", 37, 13, 2, "tan");
// The booth: a sofa, its feet on a rug as wide as it.
put("ours-rug-small-sunset", 46, 15);
put("sofa-two", 46, 14);
// The quiet room.
put("sofa-three", 10, 35);
put("egg-chair-teal", 14, 37);
// The studio, below the hall: a second, bigger table for the whole team.
table("meeting-table", 34, 39, 3, "tan");


// ---------- trees, rocks, flowers and grass ----------
//
// Only on open grass: a treeline round the edges of the grounds, single trees
// and bushes thinning out towards the building, two tiles off any wall or
// path. Then rocks here and there, flowers by the paths, tufts of long
// grass. All of it gives way to anything put over it.
const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "." : shell.rows[y][x]);
let seed = 917;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
/** Open grass: grass, and nothing but grass within `margin` tiles. */
const open = (x, y, margin) => {
  for (let dy = -margin; dy <= margin; dy++) for (let dx = -margin; dx <= margin; dx++) if (tile(x + dx, y + dy) !== ".") return false;
  return true;
};
const taken = [];
const free = (x, y, w, h, gap) => taken.every(([tx, ty, tw, th]) => x + w + gap <= tx || x >= tx + tw + gap || y + h + gap <= ty || y >= ty + th + gap);
/** How far a tile is from the building, 0 by it to 1 at the grounds' edge. */
const [BX0, BY0, BX1, BY1] = plan.rooms.reduce(([a, b, c, d], { rect }) => [Math.min(a, rect[0]), Math.min(b, rect[1]), Math.max(c, rect[2]), Math.max(d, rect[3])], [W, H, 0, 0]);
const out = (x, y) => Math.min(1, Math.max((BX0 - x) / BX0, (x - BX1) / (W - BX1), (BY0 - y) / BY0, (y - BY1) / (H - BY1), 0));
const scatter = (tries, kinds, chance, margin, gapFor) => {
  for (let n = 0; n < tries; n++) {
    const x = Math.floor(rand() * (W + 2)) - 2;
    const y = Math.floor(rand() * (H + 2)) - 3;
    const edge = out(x + 1, y + 2);
    if (rand() > chance(edge)) continue;
    const roll = rand();
    const [item, w, h] = kinds.find(([, , , upTo]) => roll < upTo);
    // Where it stands (its bottom row) has to be open grass, and its trunk clear of walls and paths.
    let ok = true;
    for (let dx = 0; dx < w && ok; dx++) if (!open(x + dx, y + Math.ceil(h) - 1, margin)) ok = false;
    if (!ok || !free(x, y, w, h, gapFor(edge))) continue;
    taken.push([x, y, w, h]);
    put(item, x, y, {}, 0);
  }
};
scatter(
  1600,
  [
    ["tree", 3, 4, 0.55],
    ["tree-small", 2, 3, 0.85],
    ["bush", 2, 1.5, 1],
  ],
  (edge) => 0.04 + edge * 0.8,
  2,
  (edge) => (edge > 0.6 ? 0 : 2),
);
scatter(300, [["rocks", 2, 1, 0.5], ["rocks-small", 1, 1, 1]], () => 0.12, 1, () => 3);
scatter(600, [["flowers", 1, 1, 0.45], ["flowers-pink", 1, 1, 0.75], ["grass", 1, 1, 1]], (edge) => 0.25 + edge * 0.2, 0, () => 1);

// ---------- written out ----------

const ids = new Set(items.map((item) => item.id));
if (ids.size !== items.length) throw new Error("two items with one id");
const [mx0, my0, mx1, my1] = room("meeting");
const layout = {
  id: "campus",
  name: "Campus",
  shell: "campus",
  seed: 52731,
  anchors: {
    zones: [{ name: "meeting", x: (mx0 + 1) * T_, y: (my0 + 2) * T_, width: (mx1 - mx0 - 1) * T_, height: (my1 - my0 - 3) * T_ }],
    table: { x: (21 + O) * T_, y: 12 * T_, width: 224, height: 96 },
    whiteboard: { x: (23 + O) * T_, y: my0 * T_, width: 96, height: 64 },
  },
  items,
  overrides: {},
};
await writeFile(new URL("../shared-protocol/src/catalog/layouts/campus.json", import.meta.url), JSON.stringify(layout, null, 1) + "\n");
console.log("layouts/campus.json", items.length, "items");

const { problems, doors, patios, ...rows } = shell;
await writeFile(new URL("../shared-protocol/src/catalog/shells/campus.json", import.meta.url), JSON.stringify({ id: "campus", name: "Campus", ...rows, plan }, null, 2) + "\n");
console.log("shells/campus.json", `${W}x${H}`);
console.log(shell.rows.join("\n"));
