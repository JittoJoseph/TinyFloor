// The layout editor (lab/README.md): an office as the floor will draw it
// (floor.js), and the controls to make one. What's placed is moved, sized
// and removed directly; what the office generated (the things on desks,
// what stands along the walls) is changed through overrides, kept by each
// piece's key, which is how anyone's changes to their office stay changed.
/* global Phaser */
import { TILE, SPEED, SEAT, SIT_FRAME, down16, loadAvatar, avatarAnims, itemFrame, drawItem, heldDirection } from "./common.js";
import { DESK_STEP, bounds, check, clusterSize, expand, isCluster, spriteSize } from "./catalog.js";
import { buildFloor, seatsOf, solidsOf } from "./floor.js";
import { FLOORS, WALLS, paint, renderShell, wallSolids } from "./shell.js";

const $ = (selector) => document.querySelector(selector);
const loadImage = (url) => new Promise((resolve, reject) => Object.assign(new Image(), { onload() { resolve(this); }, onerror: reject, src: url }));
const COLS = 48;
const ROWS = 32;
const typing = () => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
const newId = () => Math.random().toString(36).slice(2, 8);
/** How a bank is shown while you place it, and the size it starts at. */
const GHOST = { size: { cols: 2, sides: 2 }, key: "ghost" };

let catalog = { items: [] };
let byId = new Map();
let layout = null;
let placing = null;
/** What's selected: { entry } for something placed, { key } for a generated piece. */
let selected = null;
let dirty = false;
let scene = null;
/** "furnish" places and changes things; "walls" paints the shell's walls and floors. */
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

function setMode(next) {
  mode = next;
  $("#brush").hidden = mode !== "walls";
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
    this.avatar = this.add.sprite(23 * TILE, 13 * TILE, "avatar", 0).setScale(2).setOrigin(0.5, 1);
    this.avatar.play("idle-down");
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,E", false);
    this.keys.E.on("down", () => !typing() && this.toggleSit());
    this.input.keyboard.on("keydown-DELETE", () => this.removeSelected());
    this.input.keyboard.on("keydown-BACKSPACE", () => this.removeSelected());
    this.input.keyboard.on("keydown-ESC", () => {
      if (placing) startPlacing(placing);
      select(null);
    });
    this.input.on("pointermove", (pointer) => this.pointerMove(pointer));
    this.input.on("pointerdown", (pointer) => this.pointerDown(pointer));
    this.input.on("pointerup", () => {
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
    if (px < 0 || py < 0 || px > COLS * TILE || py > ROWS * TILE) return true;
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
    this.ghost.setVisible(true).setPosition(down16(pointer.worldX - w / 2 - bx + 8), down16(pointer.worldY - h / 2 - by + 8));
  }

  pointerMove(pointer) {
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
    const x = down16(pointer.worldX - this.drag.dx + 8);
    const y = down16(pointer.worldY - this.drag.dy + 8);
    if (this.drag.entry) {
      const entry = this.drag.entry;
      if (x === entry.x && y === entry.y) return;
      entry.x = x;
      entry.y = y;
    } else {
      // A generated piece moved by hand: kept as an override on its key.
      const current = layout.overrides[this.drag.key]?.at ?? [this.drag.x0, this.drag.y0];
      if (x === current[0] && y === current[1]) return;
      layout.overrides[this.drag.key] = { ...layout.overrides[this.drag.key], at: [x, y] };
    }
    changed();
  }

  async pointerDown(pointer) {
    if (mode === "walls") {
      const cell = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
      this.painting = { from: cell, to: cell };
      this.drawOverlay();
      return;
    }
    if (placing) {
      const entry = { id: newId(), item: placing.id, x: this.ghost.x, y: this.ghost.y, ...(isCluster(placing) ? { size: { ...GHOST.size } } : {}) };
      layout.items.push(entry);
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
      this.drag = { entry: piece.entry, dx: pointer.worldX - piece.entry.x, dy: pointer.worldY - piece.entry.y };
    } else {
      select({ key: piece.key });
      this.drag = { key: piece.key, x0: piece.x, y0: piece.y, dx: pointer.worldX - piece.x, dy: pointer.worldY - piece.y };
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
    const width = cols * DESK_STEP + 32;
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
    if (this.drag.resize === "cols") size.cols = clusterSize({ cols: (pointer.worldX - entry.x - 32) / DESK_STEP }).cols;
    else size.sides = pointer.worldY < entry.y - 24 ? 2 : 1;
    if (size.cols === was.cols && size.sides === was.sides) return;
    entry.size = size;
    changed();
    select({ entry });
  }

  /** The painted rectangle goes into the shell, and the walls and floors are worked out again. */
  async paintDone() {
    const { from, to } = this.painting;
    this.painting = null;
    paint(this.shell, from[0], from[1], to[0], to[1], brush);
    shellDirty = true;
    setDirty(true);
    await this.loadShell(false);
  }

  /** Delete: something placed goes; something generated is hidden, as an override, so it stays gone. */
  removeSelected() {
    if (!selected || typing()) return;
    if (selected.entry) layout.items = layout.items.filter((entry) => entry !== selected.entry);
    else layout.overrides[selected.key] = { hidden: true };
    select(null);
    changed();
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
