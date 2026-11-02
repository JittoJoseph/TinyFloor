// The layout editor (lab/README.md): an office as the floor will draw it
// (floor.js), and the controls to make one. What's placed is moved, sized
// and removed directly; what the office generated (the things on desks,
// what stands along the walls) is changed through overrides, kept by each
// piece's key, which is how anyone's changes to their office stay changed.
/* global Phaser */
import { TILE, SPEED, SEAT, SIT_FRAME, loadAvatar, avatarAnims, itemFrame, drawItem, heldDirection } from "./common.js";
import { bounds, check, clusterSize, deskStep, expand, giveWay, isCluster, spriteSize } from "./catalog.js";
import { bake, buildFloor, checkTemplate, seatsOf, solidsOf } from "./floor.js";
import { FLOORS, GROUNDS, WALLS, attach, attachPatio, exitPatio, paint, planShell, renderShell, roomAt, wallSolids } from "./shell.js";

const $ = (selector) => document.querySelector(selector);
const loadImage = (url) => new Promise((resolve, reject) => Object.assign(new Image(), { onload() { resolve(this); }, onerror: reject, src: url }));
const COLS = 48;
const ROWS = 32;
const typing = () => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
const newId = () => Math.random().toString(36).slice(2, 8);
/** How a bank is shown while you place it, and the size it starts at. */
const GHOST = { size: { cols: 1, sides: 1 }, key: "ghost" };
const snap = (v, step) => Math.round(v / step) * step;

let catalog = { items: [] };
let byId = new Map();
let layout = null;
let placing = null;
/** What's selected: { entry } for something placed, { key } for a generated piece. */
let selected = null;
let dirty = false;
let scene = null;
/** "furnish" places and changes things; "walls" paints the shell's walls and floors; "rooms" moves a planned shell's rooms. */
let mode = "furnish";
let brush = "#";
let shellDirty = false;

function setDirty(value) {
  dirty = value;
  $("#save").disabled = !dirty;
  if (!layout) return ($("#status").textContent = "");
  const problems = check(catalog, [layout]).filter((p) => p.startsWith("layout"));
  const pieces = scene?.pieces ?? [];
  const generated = pieces.filter((p) => !p.entry).length + pieces.filter((p) => p.entry && p.key !== p.entry.id).length;
  const changed = Object.keys(layout.overrides ?? {}).length;
  $("#status").textContent = `${layout.items.length} placed · ${generated} generated · ${changed} changed${dirty ? " · unsaved" : ""}${problems.length ? ` · ${problems.length} problems` : ""}`;
  $("#status").title = problems.join("\n");
}

// ---------- layouts ----------

async function loadLayouts(wanted) {
  const ids = await (await fetch("/api/layouts")).json();
  $("#layout-id").replaceChildren(...ids.map((id) => new Option(id, id)));
  const id = wanted ?? new URLSearchParams(location.search).get("id") ?? ids[0];
  if (id) await openLayout(id);
  else newLayout("startup");
}

async function openLayout(id) {
  layout = await (await fetch(`/api/layouts/${id}`)).json();
  layout.seed ??= Math.floor(Math.random() * 1e6);
  layout.overrides ??= {};
  for (const entry of layout.items) entry.id ??= newId();
  $("#layout-id").value = id;
  $("#layout-name").value = layout.name ?? "";
  history.replaceState(null, "", `?id=${id}`);
  select(null);
  await scene?.loadShell();
  setDirty(false);
}

function newLayout(id) {
  layout = { id, name: "", shell: "office", seed: Math.floor(Math.random() * 1e6), items: [], overrides: {} };
  if (![...$("#layout-id").options].some((o) => o.value === id)) $("#layout-id").add(new Option(id, id));
  $("#layout-id").value = id;
  $("#layout-name").value = "";
  select(null);
  scene?.loadShell();
  setDirty(true);
}

async function save() {
  layout.name = $("#layout-name").value;
  if (shellDirty && scene?.shell) {
    const response = await fetch(`/api/shells/${layout.shell}`, { method: "PUT", body: JSON.stringify(scene.shell) });
    if (!response.ok) return alert(`Shell not saved: ${await response.text()}`);
    shellDirty = false;
  }
  const response = await fetch(`/api/layouts/${layout.id}`, { method: "PUT", body: JSON.stringify(layout) });
  if (!response.ok) return alert(`Not saved: ${await response.text()}`);
  setDirty(false);
}

/** A change to the office: redraw, and remember it needs saving. */
function changed() {
  scene?.refresh();
  setDirty(true);
}

// ---------- palette ----------

async function thumbnail(item, canvas) {
  const shown = { size: { cols: 1, sides: 1 }, key: "palette" };
  const [bx, by, w, h] = bounds(byId, item.id, {}, shown);
  const scale = Math.min(2, 52 / w, 52 / h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  await drawItem(canvas.getContext("2d"), byId, item.id, -bx * scale, -by * scale, scale, {}, shown);
}

function renderPalette() {
  const query = $("#search").value.trim().toLowerCase();
  const groups = new Map();
  // Parts only go in their bundles, and desk things on desks: neither is placed on its own.
  for (const item of catalog.items.filter((i) => !i.part && !i.generated && !i.desk)) {
    if (query && !`${item.id} ${item.name} ${item.category}`.toLowerCase().includes(query)) continue;
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  const palette = $("#palette");
  palette.replaceChildren();
  for (const [category, items] of groups) {
    const group = document.createElement("div");
    group.className = "palette-group";
    group.innerHTML = `<h3></h3><div class="grid"></div>`;
    group.querySelector("h3").textContent = category;
    for (const item of items) {
      const button = document.createElement("button");
      button.title = item.name || item.id;
      button.dataset.id = item.id;
      button.setAttribute("aria-pressed", String(placing === item));
      button.append(document.createElement("canvas"));
      thumbnail(item, button.querySelector("canvas"));
      button.addEventListener("click", () => startPlacing(item));
      group.querySelector(".grid").append(button);
    }
    palette.append(group);
  }
}

function startPlacing(item) {
  placing = placing === item ? null : item;
  select(null);
  document.querySelectorAll("#palette button").forEach((b) => b.setAttribute("aria-pressed", String(placing?.id === b.dataset.id)));
  scene?.updateGhost();
}

/**
 * Selecting a bank offers its chairs (near and far, from the chairs that suit;
 * never none) and a shuffle; selecting a generated piece offers putting it back
 * if it was changed.
 */
function select(next) {
  selected = next;
  const item = next?.entry && byId.get(next.entry.item);
  const slots = isCluster(item)
    ? Object.entries(item.cluster.chairs).filter(([side]) => side === "front" || clusterSize(next.entry.size).sides === 2)
    : (item?.parts ?? []).filter((part) => part.slot === "chair").map((part) => ["chair", part]);
  $("#chairs").replaceChildren(
    ...slots.map(([key, slot]) => {
      const chooser = document.createElement("select");
      chooser.title = key === "back" ? "Far side chairs" : "Chairs";
      chooser.append(...slot.options.map((id) => new Option(`${key === "back" ? "Far: " : ""}${byId.get(id)?.name ?? id}`, id)));
      chooser.value = next.entry.choose?.[key] ?? slot.default;
      chooser.addEventListener("change", () => {
        next.entry.choose = { ...next.entry.choose, [key]: chooser.value };
        changed();
      });
      return chooser;
    }),
  );
  $("#shuffle").hidden = !isCluster(item);
  $("#put-back").hidden = !(next?.key && layout?.overrides?.[next.key]);
  scene?.drawOverlay();
}

// ---------- walls and floors ----------

/**
 * The brushes: every wall and floor material, and nothing. A material not yet
 * in the shell's legend gets a character of its own when it is first used.
 */
function renderBrushes(shell) {
  const select = $("#brush");
  const options = [
    ...Object.keys(WALLS).map((material) => ({ label: `Wall, ${material}`, entry: { kind: "wall", material } })),
    ...Object.keys(FLOORS).map((material) => ({ label: `Floor, ${material}`, entry: { kind: "floor", material } })),
    ...GROUNDS.map((material) => ({ label: `Outside, ${material}`, entry: { kind: "floor", material } })),
    { label: "Nothing", entry: { kind: "void" } },
  ];
  const charFor = (entry) => Object.entries(shell.legend).find(([, e]) => e.kind === entry.kind && (e.material ?? null) === (entry.material ?? null))?.[0] ?? null;
  select.replaceChildren(...options.map(({ label, entry }) => new Option(label, JSON.stringify(entry))));
  const current = shell.legend[brush] ?? { kind: "wall", material: "lavender" };
  select.value = JSON.stringify({ kind: current.kind, ...(current.material ? { material: current.material } : {}) });
  select.onchange = () => {
    const entry = JSON.parse(select.value);
    let char = charFor(entry);
    if (!char) {
      char = [..."#%&@$abcdefghijklmnopqrstuvwxyz"].find((c) => !(c in shell.legend) && (entry.kind === "wall" ? "#%&@$".includes(c) : !"#%&@$".includes(c)));
      shell.legend[char] = entry;
    }
    brush = char;
  };
}

// ---------- rooms ----------

/**
 * Rooms to add, each with what's in it, from its top-left corner (its wall's)
 * in tiles. Its walls, doorway, what's on its walls and its sitting area are
 * worked out where it's put down (shared-protocol/src/plan.ts, floor.js).
 */
const ROOM_PRESETS = [
  {
    name: "Meeting room",
    kind: "meeting",
    size: [12, 11],
    floor: "cream",
    items: [["meeting-table", 3, 5], ...[0, 1, 2].flatMap((i) => [["chair-black-mesh", 4 + i * 2, 4], ["chair-black-back", 4 + i * 2, 7]])],
  },
  // A lounge and a library get their sitting area by themselves (floor.js): an even width inside centres it.
  { name: "Lounge", kind: "lounge", size: [7, 12], floor: "rose", items: [] },
  { name: "Quiet room", kind: "quiet", size: [8, 8], floor: "sage", items: [["rug-small-blue", 3, 4], ["sofa-two", 3, 3]] },
  { name: "Library", kind: "library", size: [7, 10], floor: "cream", items: [] },
  { name: "Café", kind: "kitchen", size: [13, 9], floor: "oak", items: [["meeting-table-small", 2, 4], ["meeting-table-small", 7, 4]] },
];

function renderRoomPresets() {
  const select = $("#add-room");
  select.replaceChildren(new Option("Add a room", ""), ...ROOM_PRESETS.map((preset, i) => new Option(preset.name, String(i))), new Option("Patio, with a door", "patio"));
  select.onchange = () => {
    const value = select.value;
    select.value = "";
    if (!scene?.shell?.plan) return;
    if (value === "patio") return scene.pickUpPatio();
    const preset = ROOM_PRESETS[Number(value)];
    if (preset) scene.pickUp(null, preset);
  };
}

function setMode(next) {
  if (mode === "rooms" && next !== "rooms") scene?.putBack();
  mode = next;
  $("#brush").hidden = mode !== "walls";
  $("#add-room").hidden = mode !== "rooms" || !scene?.shell?.plan;
  if (placing) startPlacing(placing);
  select(null);
  document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
}

// ---------- the floor ----------

class Floor extends Phaser.Scene {
  constructor() {
    super("floor");
    this.images = new Map();
    this.pieces = [];
    this.drag = null;
    this.seated = null;
    this.facing = "down";
  }

  preload() {
    loadAvatar(this);
  }

  create() {
    scene = this;
    this.wallSolids = [];
    this.shellImage = this.add.image(0, 0, "__DEFAULT").setOrigin(0, 0).setDepth(0);
    this.overlay = this.add.graphics().setDepth(100000);
    this.ghost = this.add.container(0, 0).setAlpha(0.6).setDepth(99999).setVisible(false);
    avatarAnims(this);
    this.avatar = this.add.sprite(23 * TILE, 13 * TILE, "avatar", 0).setOrigin(0.5, 1);
    this.avatar.play("idle-down");
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,E", false);
    this.keys.E.on("down", () => !typing() && this.toggleSit());
    this.input.keyboard.on("keydown-DELETE", () => this.removeSelected());
    this.input.keyboard.on("keydown-BACKSPACE", () => this.removeSelected());
    this.input.keyboard.on("keydown-ESC", () => {
      this.putBack();
      if (placing) startPlacing(placing);
      select(null);
    });
    // The camera: the wheel zooms where the pointer is, a right or middle drag moves the view.
    this.input.mouse.disableContextMenu();
    this.input.on("wheel", (pointer, _over, _dx, dy) => {
      const camera = this.cameras.main;
      const before = camera.getWorldPoint(pointer.x, pointer.y);
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 1 / 1.15 : 1.15), 0.25, 3));
      const after = camera.getWorldPoint(pointer.x, pointer.y);
      camera.scrollX += before.x - after.x;
      camera.scrollY += before.y - after.y;
    });
    this.input.on("pointermove", (pointer) => this.pointerMove(pointer));
    this.input.on("pointerdown", (pointer) => this.pointerDown(pointer));
    this.input.on("pointerup", (pointer) => {
      if (this.panning) {
        // A right click that didn't move the view puts down what's being placed, as in Gather.
        const moved = Math.hypot(pointer.x - this.panning.x, pointer.y - this.panning.y) > 4;
        this.panning = null;
        this.input.setDefaultCursor("");
        if (!moved && placing) startPlacing(placing);
        return;
      }
      if (this.drag?.entry && this.drag.moved) this.makeRoom(this.drag.entry);
      this.drag = null;
      if (this.painting) this.paintDone();
    });
    if (layout) this.loadShell();
  }

  /** The walls and floors, drawn from the layout's shell (shell.js) into one picture, then everything on them. */
  async loadShell(reload = true) {
    if (!layout) return;
    if (reload || !this.shell) this.shell = await (await fetch(`/api/shells/${layout.shell}`)).json();
    const canvas = await renderShell(this.shell, loadImage);
    const old = this.shellImage.texture.key;
    const key = `shell:${layout.shell}:${performance.now()}`;
    this.textures.addCanvas(key, canvas);
    this.shellImage.setTexture(key);
    if (old.startsWith("shell:")) this.textures.remove(old);
    this.wallSolids = wallSolids(this.shell);
    renderBrushes(this.shell);
    await this.refresh();
  }

  /**
   * Works the office out again (floor.js) and brings the picture up to date:
   * a piece keeps its image while it is the same thing in the same place, so
   * a change redraws only what changed.
   */
  async refresh() {
    if (!layout || !this.shell) return;
    const pieces = buildFloor(byId, this.shell, layout);
    this.pieces = pieces;
    const seen = new Set();
    for (const piece of pieces) {
      seen.add(piece.key);
      const { key, frame } = await itemFrame(this, piece.item);
      if (pieces !== this.pieces) return;
      let image = this.images.get(piece.key);
      if (!image || image.texture.key !== key || image.frame.name !== (frame ?? "__BASE")) {
        image?.destroy();
        image = this.add.image(0, 0, key, frame).setOrigin(0, 0);
        this.images.set(piece.key, image);
      }
      image.setPosition(piece.x, piece.y).setFlipX(!!piece.item.sprite.flip).setDepth(piece.depth);
    }
    for (const [k, image] of this.images) {
      if (!seen.has(k)) {
        image.destroy();
        this.images.delete(k);
      }
    }
    this.drawOverlay();
    setDirty(dirty);
  }

  solids() {
    return [...this.wallSolids, ...solidsOf(this.pieces)];
  }

  blocked(px, py) {
    const [w, h] = this.shell?.size ?? [COLS, ROWS];
    if (px < 0 || py < 0 || px > w * TILE || py > h * TILE) return true;
    return this.solids().some(([x, y, w, h]) => px >= x && px <= x + w && py >= y && py <= y + h);
  }

  outlineOf(sel) {
    if (sel?.entry) {
      const [bx, by, w, h] = bounds(byId, sel.entry.item, sel.entry.choose, { size: sel.entry.size, key: sel.entry.id, seed: layout.seed, overrides: layout.overrides });
      return [sel.entry.x + bx, sel.entry.y + by, w, h];
    }
    const piece = this.pieces.find((p) => p.key === sel?.key);
    if (!piece) return null;
    const [w, h] = spriteSize(piece.item.sprite);
    return [piece.x, piece.y, w, h];
  }

  /**
   * What's under the pointer, the one in front, by its pixels rather than its
   * box: a desk row's box covers the far desks behind it, but you click what
   * you can see.
   */
  pieceAt(px, py) {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      const [w, h] = spriteSize(piece.item.sprite);
      if (px < piece.x || px >= piece.x + w || py < piece.y || py >= piece.y + h) continue;
      const image = this.images.get(piece.key);
      if (!image) continue;
      const lx = Math.floor(piece.item.sprite.flip ? piece.x + w - 1 - px : px - piece.x);
      const ly = Math.floor(py - piece.y);
      if (this.textures.getPixelAlpha(lx, ly, image.texture.key, image.frame.name) > 0) return piece;
    }
    return null;
  }

  async updateGhost(pointer = this.input.activePointer) {
    if (!placing) return this.ghost.setVisible(false);
    if (this.ghost.getData("id") !== placing.id) {
      this.ghost.removeAll(true);
      for (const piece of expand(byId, placing.id, 0, 0, {}, GHOST)) {
        const { key, frame } = await itemFrame(this, piece.item);
        this.ghost.add(this.add.image(piece.x, piece.y, key, frame).setOrigin(0, 0).setFlipX(!!piece.item.sprite.flip));
      }
      this.ghost.setData("id", placing.id);
    }
    const [bx, by, w, h] = bounds(byId, placing.id, {}, GHOST);
    // Everything goes on whole tiles.
    const x = snap(pointer.worldX - w / 2 - bx, TILE), y = snap(pointer.worldY - h / 2 - by, TILE);
    // Green where it can go, red where it would stand on a wall or on something that doesn't give way.
    const blocked = this.wouldBlock(placing.id, x, y);
    this.ghost.setVisible(true).setPosition(x, y).setData("blocked", blocked);
    this.ghost.each((image) => image.setTint(blocked ? 0xff8a8a : 0xb6f2c4));
  }

  pointerMove(pointer) {
    if (this.panning) {
      const camera = this.cameras.main;
      camera.scrollX = this.panning.sx - (pointer.x - this.panning.x) / camera.zoom;
      camera.scrollY = this.panning.sy - (pointer.y - this.panning.y) / camera.zoom;
      return;
    }
    if (mode === "rooms") return this.carry(pointer);
    if (mode === "walls") {
      if (this.painting) {
        this.painting.to = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
        this.drawOverlay();
      }
      return;
    }
    if (placing) return this.updateGhost(pointer);
    if (!this.drag || !pointer.isDown) return;
    if (this.drag.resize) return this.resize(pointer);
    // A placed thing lands on whole tiles; what the office put up itself (on a wall, by a desk) moves by whole tiles from where it was.
    const x = this.drag.entry ? snap(this.drag.x0 + pointer.worldX - this.drag.px, TILE) : this.drag.x0 + snap(pointer.worldX - this.drag.px, TILE);
    const y = this.drag.entry ? snap(this.drag.y0 + pointer.worldY - this.drag.py, TILE) : this.drag.y0 + snap(pointer.worldY - this.drag.py, TILE);
    if (this.drag.entry) {
      const entry = this.drag.entry;
      if (x === entry.x && y === entry.y) return;
      entry.x = x;
      entry.y = y;
      this.drag.moved = true;
    } else {
      // A generated piece moved by hand: kept as an override on its key.
      const current = layout.overrides[this.drag.key]?.at ?? [this.drag.x0, this.drag.y0];
      if (x === current[0] && y === current[1]) return;
      layout.overrides[this.drag.key] = { ...layout.overrides[this.drag.key], at: [x, y] };
    }
    changed();
  }

  async pointerDown(pointer) {
    if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
      const camera = this.cameras.main;
      this.panning = { x: pointer.x, y: pointer.y, sx: camera.scrollX, sy: camera.scrollY };
      this.input.setDefaultCursor("grabbing");
      return;
    }
    if (mode === "rooms") {
      if (this.carrying) return this.putDown();
      const [tx, ty] = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
      // A patio picked up takes its door with it.
      const plan = this.shell?.plan;
      const patio = plan && planShell(plan).patios.find(({ rect: [x0, y0, x1, y1] }) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1);
      if (patio) {
        const owner = plan.rooms.find((r) => r.id === patio.room);
        return this.pickUpPatio(owner.exits.find((exit) => String(exitPatio(owner.rect, exit)) === String(patio.rect)));
      }
      const room = plan && roomAt(plan, tx, ty);
      if (room && room.id !== this.shell.plan.main) this.pickUp(room);
      return;
    }
    if (mode === "walls") {
      const cell = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
      this.painting = { from: cell, to: cell };
      this.drawOverlay();
      return;
    }
    if (placing) {
      if (this.ghost.getData("blocked")) return;
      const entry = { id: newId(), item: placing.id, x: this.ghost.x, y: this.ghost.y, ...(isCluster(placing) ? { size: { ...GHOST.size } } : {}) };
      layout.items.push(entry);
      this.makeRoom(entry);
      changed();
      if (!pointer.event.shiftKey) startPlacing(placing);
      return;
    }
    const handle = this.handleAt(pointer.worldX, pointer.worldY);
    if (handle) return (this.drag = { entry: selected.entry, resize: handle });
    const piece = this.pieceAt(pointer.worldX, pointer.worldY);
    if (!piece) return select(null);
    // A placed thing's own pieces select the whole thing; a generated piece is selected alone.
    const own = piece.entry && (piece.key === piece.entry.id || !/\/(things|end-)/.test(piece.key));
    if (own) {
      select({ entry: piece.entry });
      this.drag = { entry: piece.entry, x0: piece.entry.x, y0: piece.entry.y, px: pointer.worldX, py: pointer.worldY };
    } else {
      select({ key: piece.key });
      const at = layout.overrides[piece.key]?.at ?? [piece.x, piece.y];
      this.drag = { key: piece.key, x0: at[0], y0: at[1], px: pointer.worldX, py: pointer.worldY };
    }
  }

  /**
   * A selected bank's handles, like a widget's: the right edge makes the row
   * longer or shorter, the top edge adds or takes away the far side.
   */
  handles() {
    const entry = selected?.entry;
    if (!entry || !isCluster(byId.get(entry.item))) return [];
    const { cols, sides } = clusterSize(entry.size);
    const width = cols * deskStep(byId.get(entry.item)) + 32;
    return [
      { axis: "cols", x: entry.x + width, y: entry.y + 48 },
      { axis: "sides", x: entry.x + width / 2, y: entry.y + (sides === 2 ? -48 : 0) },
    ];
  }

  handleAt(px, py) {
    return this.handles().find((h) => Math.abs(px - h.x) <= 12 && Math.abs(py - h.y) <= 12)?.axis ?? null;
  }

  resize(pointer) {
    const entry = this.drag.entry;
    const was = clusterSize(entry.size);
    const size = { ...was };
    if (this.drag.resize === "cols") size.cols = clusterSize({ cols: (pointer.worldX - entry.x - 32) / deskStep(byId.get(entry.item)) }).cols;
    else size.sides = pointer.worldY < entry.y - 24 ? 2 : 1;
    if (size.cols === was.cols && size.sides === was.sides) return;
    entry.size = size;
    changed();
    select({ entry });
  }

  /** Whether something put here would stand on a wall or on something that doesn't give way. */
  wouldBlock(id, x, y) {
    const item = byId.get(id);
    if (!item || ["wall", "wallside", "rug"].includes(item.mount)) return false;
    const solids = [...this.wallSolids, ...solidsOf(this.pieces.filter((piece) => !piece.item.givesWay))];
    const own = solidsOf(expand(byId, id, x, y, {}, GHOST));
    return own.some(([ax, ay, aw, ah]) => solids.some(([bx, by, bw, bh]) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by));
  }

  /** Trees, rocks and flowers under something just put down or moved give way to it. */
  makeRoom(entry) {
    if (byId.get(entry.item)?.givesWay) return;
    const [bx, by, w, h] = bounds(byId, entry.item, entry.choose, { size: entry.size, key: entry.id });
    layout.items = giveWay(byId, layout.items, [entry.x + bx, entry.y + by, w, h], entry);
    changed();
  }

  /** The painted rectangle goes into the shell, and the walls and floors are worked out again; trees and rocks there give way. */
  async paintDone() {
    const { from, to } = this.painting;
    this.painting = null;
    paint(this.shell, from[0], from[1], to[0], to[1], brush);
    const [x0, y0] = [Math.min(from[0], to[0]), Math.min(from[1], to[1])];
    const [x1, y1] = [Math.max(from[0], to[0]), Math.max(from[1], to[1])];
    if (!GROUNDS.includes(this.shell.legend[brush]?.material)) {
      layout.items = giveWay(byId, layout.items, [x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE]);
    }
    shellDirty = true;
    setDirty(true);
    await this.loadShell(false);
  }

  /** Delete: something placed goes; something generated is hidden, as an override, so it stays gone. */
  removeSelected() {
    if (this.carrying && !typing()) return this.removeRoom();
    if (!selected || typing()) return;
    if (selected.entry) layout.items = layout.items.filter((entry) => entry !== selected.entry);
    else layout.overrides[selected.key] = { hidden: true };
    select(null);
    changed();
  }

  /**
   * Picks up a room, or a new one from a preset: it follows the pointer, held
   * against the hall's walls (plan.ts, attach), and everything in it comes
   * along; walls, doorways and what's on the walls are worked out again each
   * time it moves a tile, as a builder would.
   */
  pickUp(room, preset = null) {
    if (preset) {
      room = { id: `${preset.kind}-${newId()}`, kind: preset.kind, rect: null, floor: preset.floor };
      const items = preset.items.map(([item, x, y]) => ({ id: newId(), item, x: x * TILE, y: y * TILE }));
      this.carrying = { room, size: preset.size, was: null, items, anchors: [] };
    } else {
      const [x0, y0, x1, y1] = room.rect;
      const inside = (x, y) => x >= x0 * TILE && x < (x1 + 1) * TILE && y >= y0 * TILE && y < (y1 + 1) * TILE;
      const anchors = [...(layout.anchors?.zones ?? []), layout.anchors?.table, layout.anchors?.whiteboard].filter((a) => a && inside(a.x, a.y));
      this.carrying = { room, size: [x1 - x0, y1 - y0], was: [...room.rect], items: layout.items.filter((e) => inside(e.x, e.y)), anchors };
    }
    select(null);
    this.input.setDefaultCursor("grabbing");
    this.drawOverlay();
  }

  /**
   * Picks up a patio, or a new one: it keeps to the outside wall nearest the
   * pointer (plan.ts, attachPatio), and its door goes through that wall
   * wherever it's put down; the door and its paving are one thing.
   */
  pickUpPatio(exit = null) {
    const room = exit ? this.shell.plan.rooms.find((r) => r.exits?.includes(exit)) : null;
    this.carrying = { patio: exit ?? { side: "right", at: 4 }, room, was: room ? { room: room.id, side: exit.side, at: exit.at } : null };
    select(null);
    this.input.setDefaultCursor("grabbing");
    this.drawOverlay();
  }

  /** Moves the carried patio, and its door, to a room's wall. */
  placePatio(spot) {
    const carrying = this.carrying;
    if (carrying.room) carrying.room.exits = carrying.room.exits.filter((exit) => exit !== carrying.patio);
    const room = this.shell.plan.rooms.find((r) => r.id === spot.room);
    Object.assign(carrying.patio, { side: spot.side, at: spot.at });
    (room.exits ??= []).push(carrying.patio);
    carrying.room = room;
  }

  /** The carried room against the hall nearest the pointer, if there's room for it there; a patio against the nearest outside wall. */
  async carry(pointer) {
    const carrying = this.carrying;
    if (!carrying) return;
    const tile = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
    if (carrying.patio) {
      const spot = attachPatio(this.shell.plan, tile, { width: carrying.patio.width }, carrying.patio);
      carrying.lost = !spot;
      const same = spot && carrying.room?.id === spot.room && carrying.patio.side === spot.side && carrying.patio.at === spot.at;
      if (!spot || same) return this.drawOverlay();
      this.placePatio(spot);
      return this.replan();
    }
    const rect = attach(this.shell.plan, carrying.size, tile, carrying.room.id);
    carrying.lost = !rect;
    if (!rect || String(rect) === String(carrying.room.rect)) return this.drawOverlay();
    this.moveRoom(rect);
    await this.replan();
  }

  /** Moves the carried room, and what's in it, to a rect. */
  moveRoom(rect) {
    const { room, items, anchors } = this.carrying;
    // A new room's things start from its corner: where it first lands is the move.
    const [fx, fy] = room.rect ? [room.rect[0], room.rect[1]] : [0, 0];
    const [dx, dy] = [(rect[0] - fx) * TILE, (rect[1] - fy) * TILE];
    if (!room.rect) {
      this.shell.plan.rooms.push(room);
      layout.items.push(...items);
    }
    room.rect = rect;
    for (const thing of [...items, ...anchors]) (thing.x += dx), (thing.y += dy);
  }

  /** The shell worked out from the plan again, then everything on it; the latest move wins when moves come faster than that. */
  async replan() {
    if (this.replanning) return (this.replanAgain = true);
    this.replanning = true;
    do {
      this.replanAgain = false;
      const { problems, doors, patios, ...shell } = planShell(this.shell.plan);
      Object.assign(this.shell, shell);
      this.planProblems = problems;
      shellDirty = true;
      setDirty(true);
      await this.loadShell(false);
    } while (this.replanAgain);
    this.replanning = false;
    if (this.planProblems.length) $("#status").textContent += ` · ${this.planProblems.join("; ")}`;
  }

  /** Puts the carried room (or patio) down where it is; trees and rocks under it give way. */
  putDown() {
    const carrying = this.carrying;
    const area = carrying?.patio ? carrying.room && exitPatio(carrying.room.rect, carrying.patio) : carrying?.room.rect;
    if (!area) return;
    this.carrying = null;
    this.input.setDefaultCursor("");
    const [x0, y0, x1, y1] = area;
    layout.items = giveWay(byId, layout.items, [x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE]);
    changed();
  }

  /** Puts the carried room back where it was picked up from (a new one goes). */
  async putBack() {
    const carrying = this.carrying;
    if (!carrying) return;
    if (!carrying.was) return this.removeRoom(carrying);
    if (carrying.patio) this.placePatio(carrying.was);
    else this.moveRoom(carrying.was);
    this.carrying = null;
    this.input.setDefaultCursor("");
    await this.replan();
  }

  /** Takes the carried room away, and what's in it: the hall's wall closes where its doorway was. */
  async removeRoom(carrying = this.carrying) {
    if (!carrying) return;
    this.carrying = null;
    this.input.setDefaultCursor("");
    const plan = this.shell.plan;
    if (carrying.patio) {
      // A patio taken away takes its door: the wall closes.
      if (carrying.room) carrying.room.exits = carrying.room.exits.filter((exit) => exit !== carrying.patio);
      return this.replan();
    }
    plan.rooms = plan.rooms.filter((room) => room !== carrying.room);
    const gone = new Set(carrying.items);
    layout.items = layout.items.filter((entry) => !gone.has(entry));
    await this.replan();
  }

  drawOverlay() {
    const g = this.overlay;
    if (!g) return;
    g.clear();
    if ($("#show-colliders").checked) {
      for (const [x, y, w, h] of this.solids()) g.fillStyle(0xe5484d, 0.25).fillRect(x, y, w, h);
      for (const seat of seatsOf(this.pieces)) g.fillStyle(0x3e63dd, 1).fillCircle(seat.x, seat.y, 3);
    }
    if (this.painting) {
      const { from, to } = this.painting;
      const [x0, y0] = [Math.min(from[0], to[0]), Math.min(from[1], to[1])];
      const [x1, y1] = [Math.max(from[0], to[0]), Math.max(from[1], to[1])];
      g.lineStyle(2, 0xe5484d, 1).strokeRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    }
    const carried = this.carrying && (this.carrying.patio ? this.carrying.room && exitPatio(this.carrying.room.rect, this.carrying.patio) : this.carrying.room.rect);
    if (carried) {
      const [x0, y0, x1, y1] = carried;
      g.lineStyle(3, this.carrying.lost ? 0xe5484d : 0x3e63dd, 1).strokeRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    }
    const box = selected && this.outlineOf(selected);
    if (box) {
      const [x, y, w, h] = box;
      g.lineStyle(2, 0x1c1c1e, 1).strokeRect(x - 1, y - 1, w + 2, h + 2);
      g.lineStyle(1, 0xffffff, 1).strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
      for (const handle of this.handles()) {
        g.fillStyle(0xffffff, 1).fillCircle(handle.x, handle.y, 8);
        g.lineStyle(2, 0x1c1c1e, 1).strokeCircle(handle.x, handle.y, 8);
      }
    }
  }

  toggleSit() {
    if (this.seated) {
      const { x, y, dir } = this.seated;
      this.seated = null;
      this.avatar.setPosition(x, y + SEAT[dir].exit);
      this.avatar.play(`idle-${this.facing}`);
      return;
    }
    let best = null;
    for (const seat of seatsOf(this.pieces)) {
      const distance = Math.hypot(seat.x - this.avatar.x, seat.y - this.avatar.y);
      if (distance < 56 && (!best || distance < best.distance)) best = { ...seat, distance };
    }
    if (!best) return;
    const shift = SEAT[best.dir];
    this.seated = best;
    this.avatar.anims.stop();
    this.avatar.setFrame(SIT_FRAME[best.dir]);
    this.avatar.setPosition(best.x + shift.dx, best.y + shift.dy);
    this.avatar.setDepth(best.y + shift.depth);
  }

  update(_, delta) {
    if (this.seated) return;
    const { dx, dy } = heldDirection(this.keys);
    if (dx || dy) {
      const step = (SPEED * delta) / 1000 / Math.hypot(dx, dy);
      let { x, y } = this.avatar;
      if (dx && !this.blocked(x + dx * step, y)) x += dx * step;
      if (dy && !this.blocked(x, y + dy * step)) y += dy * step;
      this.avatar.setPosition(x, y);
      this.facing = dx ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      if (this.avatar.anims.currentAnim?.key !== `run-${this.facing}`) this.avatar.play(`run-${this.facing}`);
    } else if (!this.avatar.anims.currentAnim?.key.startsWith("idle")) {
      this.avatar.play(`idle-${this.facing}`);
    }
    this.avatar.setDepth(this.avatar.y);
  }
}

// ---------- start ----------

catalog = await (await fetch("/api/catalog")).json();
byId = new Map(catalog.items.map((item) => [item.id, item]));
renderPalette();
renderRoomPresets();
$("#search").addEventListener("input", renderPalette);
$("#save").addEventListener("click", save);
$("#layout-id").addEventListener("change", (event) => openLayout(event.target.value));
$("#layout-name").addEventListener("input", () => setDirty(true));
$("#show-colliders").addEventListener("change", () => scene?.drawOverlay());
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
$("#shuffle").addEventListener("click", () => {
  if (!selected?.entry) return;
  selected.entry.salt = (selected.entry.salt ?? 0) + 1;
  changed();
});
$("#put-back").addEventListener("click", () => {
  if (!selected?.key) return;
  delete layout.overrides[selected.key];
  select(null);
  changed();
});
$("#reseed").addEventListener("click", () => {
  layout.seed = Math.floor(Math.random() * 1e6);
  changed();
});
/**
 * Freezes the office into a template (floor.js, bake), under the layout's id:
 * a new version when anything in it changed, the same one when nothing did.
 * Templates are what offices are made from; layouts and seeds stay in the lab.
 */
async function bakeTemplate() {
  if (!layout || !scene?.shell) return null;
  const old = await fetch(`/api/templates/${layout.id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const template = bake(byId, scene.shell, layout, { version: old?.version ?? 1, theme: old?.theme ?? "startup" });
  const same = old && JSON.stringify({ ...old, version: 0 }) === JSON.stringify({ ...template, version: 0 });
  if (old && !same) template.version = old.version + 1;
  const problems = checkTemplate(byId, template);
  if (problems.length) return alert(`Not baked:\n${problems.join("\n")}`), null;
  if (!same) await fetch(`/api/templates/${layout.id}`, { method: "PUT", body: JSON.stringify(template) });
  $("#status").textContent += ` · ${same ? "unchanged" : "baked"} ${template.id}@${template.version}`;
  return template;
}
$("#bake").addEventListener("click", () => bakeTemplate());
$("#new-layout").addEventListener("click", () => {
  const id = prompt("Layout id (a-z, 0-9, -)")?.trim().toLowerCase();
  if (id && /^[a-z0-9-]+$/.test(id)) newLayout(id);
});
addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault();
    if (dirty) save();
  }
});
addEventListener("beforeunload", (event) => dirty && event.preventDefault());

window.layoutLab = {
  scene: () => scene,
  layout: () => layout,
  catalog: () => catalog,
  place: (id, x, y, extra = {}) => {
    const entry = { id: newId(), item: id, x, y, ...extra };
    layout.items.push(entry);
    changed();
    return entry;
  },
  clear: () => {
    layout.items = [];
    layout.overrides = {};
    changed();
  },
  refresh: () => scene.refresh(),
  bake: bakeTemplate,
  save,
  newLayout,
};
window.layoutLab.game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: COLS * TILE,
  height: ROWS * TILE,
  pixelArt: true,
  backgroundColor: "#1c1c1e",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Floor,
});
await loadLayouts();
