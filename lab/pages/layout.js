// The layout editor (lab/README.md): today's office walls and floors with
// catalog items placed on them, by hand. A layout is a list of placed items
// and bundles, each where it stands and, for a desk, which chair it has; the
// first ones are the template offices.
/* global Phaser */
import { TILE, SPEED, SEAT, SIT_FRAME, down16, loadAvatar, avatarAnims, itemFrame, drawItem, heldDirection } from "./common.js";
import { DESK_STEP, bounds, check, clusterSize, depthOf as pieceDepth, expand, isCluster, spriteSize } from "./catalog.js";
import { FLOORS, WALLS, paint, renderShell, wallSolids } from "./shell.js";

const $ = (selector) => document.querySelector(selector);
const loadImage = (url) => new Promise((resolve, reject) => Object.assign(new Image(), { onload() { resolve(this); }, onerror: reject, src: url }));
const COLS = 48;
const ROWS = 32;
const typing = () => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);

let catalog = { items: [] };
let byId = new Map();
let layout = null;
let placing = null;
let selected = null;
let dirty = false;
let scene = null;
/** "furnish" places items; "walls" paints the shell's walls and floors. */
let mode = "furnish";
let brush = "#";
let shellDirty = false;

function setDirty(value) {
  dirty = value;
  $("#save").disabled = !dirty;
  const problems = layout ? check(catalog, [layout]).filter((p) => p.startsWith("layout")) : [];
  $("#status").textContent = layout ? `${layout.items.length} placed${dirty ? " · unsaved" : ""}${problems.length ? ` · ${problems.length} problems` : ""}` : "";
  $("#status").title = problems.join("\n");
}

/**
 * What a placed thing needs besides where it is: a cluster's size, the
 * office's seed, a key that stays put when it moves (so its desks keep their
 * things), a shuffle count, and any desks decorated by hand.
 */
const place = (entry) => ({ size: entry.size, seed: layout?.seed ?? 0, key: entry.id, salt: entry.salt, decor: entry.decor });
const newId = () => Math.random().toString(36).slice(2, 8);
/** How a cluster is shown while you place it, and the size it starts at. */
const GHOST = { size: { cols: 2, sides: 1 }, key: "ghost" };

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
  for (const entry of layout.items) entry.id ??= newId();
  $("#layout-id").value = id;
  $("#layout-name").value = layout.name ?? "";
  history.replaceState(null, "", `?id=${id}`);
  select(null);
  setDirty(false);
  scene?.rebuild();
}

function newLayout(id) {
  layout = { id, name: "", shell: "office", seed: Math.floor(Math.random() * 1e6), items: [] };
  if (![...$("#layout-id").options].some((o) => o.value === id)) $("#layout-id").add(new Option(id, id));
  $("#layout-id").value = id;
  $("#layout-name").value = "";
  select(null);
  setDirty(true);
  scene?.rebuild();
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
  // Parts are only placed inside their bundles: a desk top never without its chair.
  for (const item of catalog.items.filter((i) => !i.part && !i.generated)) {
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

/** Selecting desks offers their chairs, near side and far, from the chairs that suit; never none. */
function select(entry) {
  selected = entry;
  const item = entry && byId.get(entry.item);
  const slots = isCluster(item)
    ? Object.entries(item.cluster.chairs).filter(([side]) => side === "front" || clusterSize(entry.size).sides === 2)
    : (item?.parts ?? []).filter((part) => part.slot === "chair").map((part) => ["chair", part]);
  $("#chairs").replaceChildren(
    ...slots.map(([key, slot]) => {
      const chooser = document.createElement("select");
      chooser.title = key === "back" ? "Far side chairs" : "Chairs";
      chooser.append(...slot.options.map((id) => new Option(`${key === "back" ? "Far: " : ""}${byId.get(id)?.name ?? id}`, id)));
      chooser.value = entry.choose?.[key] ?? slot.default;
      chooser.addEventListener("change", () => scene?.choose(key, chooser.value));
      return chooser;
    }),
  );
  $("#shuffle").hidden = !isCluster(item);
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
  const charFor = (entry) => {
    const found = Object.entries(shell.legend).find(([, e]) => e.kind === entry.kind && (e.material ?? null) === (entry.material ?? null));
    return found?.[0] ?? null;
  };
  select.replaceChildren(...options.map(({ label, entry }) => new Option(label, JSON.stringify(entry))));
  const current = Object.entries(shell.legend).find(([c]) => c === brush)?.[1] ?? { kind: "wall", material: "lavender" };
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
    this.sprites = new Map();
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
    this.avatar = this.add.sprite(23 * TILE, 16 * TILE, "avatar", 0).setScale(2).setOrigin(0.5, 1);
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
    this.rebuild();
  }

  /** Every piece on the floor: [{ entry, item, x, y }], a bundle's or cluster's parts each their own. */
  pieces() {
    return (layout?.items ?? []).flatMap((entry) => expand(byId, entry.item, entry.x, entry.y, entry.choose, place(entry)).map((piece) => ({ entry, ...piece })));
  }

  /** The walls and floors, drawn from the layout's shell (shell.js) into one picture. */
  async drawShell(reload = true) {
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
  }

  async rebuild() {
    this.sprites.forEach((images) => images.forEach((image) => image.destroy()));
    this.sprites.clear();
    if (!layout) return;
    await this.drawShell();
    for (const entry of layout.items) await this.draw(entry);
    this.sortAll();
    this.drawOverlay();
    setDirty(dirty);
  }

  /** (Re)draws one placed thing. */
  async draw(entry) {
    this.sprites.get(entry)?.forEach((image) => image.destroy());
    const pieces = expand(byId, entry.item, entry.x, entry.y, entry.choose, place(entry));
    const images = [];
    for (const piece of pieces) {
      const { key, frame } = await itemFrame(this, piece.item);
      images.push(this.add.image(piece.x, piece.y, key, frame).setOrigin(0, 0).setFlipX(!!piece.item.sprite.flip));
    }
    this.sprites.set(entry, images);
  }

  /**
   * Draw order, as the floor does it: by where each thing stands. Things on a
   * wall sit just over the wall, and things on a desk just over that desk.
   */
  depthOf(piece, all) {
    const { item, x, y } = piece;
    if (piece.host) return pieceDepth(piece, all);
    if (item.mount === "wall") return 2;
    // A rug lies on the floor, under everything that stands on it.
    if (item.mount === "rug") return 1.5;
    if (item.mount === "surface") {
      const [w, h] = spriteSize(item.sprite);
      const foot = { x: x + w / 2, y: y + h - 2 };
      for (const host of all) {
        if (!host.item.surface) continue;
        const [sx, sy, sw, sh] = host.item.surface;
        if (foot.x >= host.x + sx && foot.x <= host.x + sx + sw && foot.y >= host.y + sy && foot.y <= host.y + sy + sh) return host.y + host.item.sortY + 0.5;
      }
    }
    return y + item.sortY;
  }

  sortAll() {
    const all = this.pieces();
    for (const [entry, images] of this.sprites) {
      const pieces = all.filter((piece) => piece.entry === entry);
      images.forEach((image, i) => pieces[i] && image.setDepth(this.depthOf(pieces[i], all)));
    }
  }

  solids() {
    return [...this.wallSolids, ...this.pieces().flatMap(({ item, x, y }) => item.colliders.map(([cx, cy, w, h]) => [x + cx, y + cy, w, h]))];
  }

  blocked(px, py) {
    if (px < 0 || py < 0 || px > COLS * TILE || py > ROWS * TILE) return true;
    return this.solids().some(([x, y, w, h]) => px >= x && px <= x + w && py >= y && py <= y + h);
  }

  outline(entry) {
    const [bx, by, w, h] = bounds(byId, entry.item, entry.choose, place(entry));
    return [entry.x + bx, entry.y + by, w, h];
  }

  /** The placed thing under the pointer, the one in front. */
  entryAt(px, py) {
    let best = null;
    for (const entry of layout?.items ?? []) {
      const [x, y, w, h] = this.outline(entry);
      if (px < x || px >= x + w || py < y || py >= y + h) continue;
      const front = y + h;
      if (!best || front >= best.front) best = { entry, front };
    }
    return best?.entry ?? null;
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
    const entry = this.drag.entry;
    const x = down16(pointer.worldX - this.drag.dx + 8);
    const y = down16(pointer.worldY - this.drag.dy + 8);
    if (x === entry.x && y === entry.y) return;
    const [dx, dy] = [x - entry.x, y - entry.y];
    entry.x = x;
    entry.y = y;
    this.sprites.get(entry)?.forEach((image) => image.setPosition(image.x + dx, image.y + dy));
    this.sortAll();
    this.drawOverlay();
    setDirty(true);
  }

  async pointerDown(pointer) {
    if (mode === "walls") {
      const cell = [Math.floor(pointer.worldX / TILE), Math.floor(pointer.worldY / TILE)];
      this.painting = { from: cell, to: cell };
      this.drawOverlay();
      return;
    }
    if (placing) {
      const entry = { id: newId(), item: placing.id, x: this.ghost.x, y: this.ghost.y, ...(isCluster(placing) ? { size: GHOST.size } : {}) };
      layout.items.push(entry);
      await this.draw(entry);
      this.sortAll();
      setDirty(true);
      if (!pointer.event.shiftKey) startPlacing(placing);
      return;
    }
    const handle = this.handleAt(pointer.worldX, pointer.worldY);
    if (handle) return (this.drag = { entry: selected, resize: handle });
    const entry = this.entryAt(pointer.worldX, pointer.worldY);
    select(entry);
    if (entry) this.drag = { entry, dx: pointer.worldX - entry.x, dy: pointer.worldY - entry.y };
  }

  /**
   * A selected cluster's handles, like a widget's: the right edge makes the
   * row longer or shorter, the top edge adds or takes away the far side.
   */
  handles() {
    if (!selected || !isCluster(byId.get(selected.item))) return [];
    const { cols, sides } = clusterSize(selected.size);
    const width = cols * DESK_STEP + 32;
    return [
      { axis: "cols", x: selected.x + width, y: selected.y + 48 },
      { axis: "sides", x: selected.x + width / 2, y: selected.y + (sides === 2 ? -48 : 0) },
    ];
  }

  handleAt(px, py) {
    return this.handles().find((h) => Math.abs(px - h.x) <= 12 && Math.abs(py - h.y) <= 12)?.axis ?? null;
  }

  async resize(pointer) {
    const entry = this.drag.entry;
    const was = clusterSize(entry.size);
    const size = { ...was };
    if (this.drag.resize === "cols") size.cols = clusterSize({ cols: (pointer.worldX - entry.x - 32) / DESK_STEP }).cols;
    else size.sides = pointer.worldY < entry.y - 24 ? 2 : 1;
    if (size.cols === was.cols && size.sides === was.sides) return;
    entry.size = size;
    await this.draw(entry);
    this.sortAll();
    select(entry);
    setDirty(true);
  }

  /** The painted rectangle goes into the shell, and the walls and floors are worked out again. */
  async paintDone() {
    const { from, to } = this.painting;
    this.painting = null;
    paint(this.shell, from[0], from[1], to[0], to[1], brush);
    shellDirty = true;
    setDirty(true);
    await this.drawShell(false);
    this.drawOverlay();
  }

  removeSelected() {
    if (!selected || typing()) return;
    layout.items = layout.items.filter((entry) => entry !== selected);
    this.sprites.get(selected)?.forEach((image) => image.destroy());
    this.sprites.delete(selected);
    select(null);
    this.sortAll();
    setDirty(true);
  }

  async choose(key, id) {
    if (!selected) return;
    selected.choose = { ...selected.choose, [key]: id };
    await this.draw(selected);
    this.sortAll();
    this.drawOverlay();
    setDirty(true);
  }

  drawOverlay() {
    const g = this.overlay;
    if (!g) return;
    g.clear();
    if ($("#show-colliders").checked) {
      for (const [x, y, w, h] of this.solids()) g.fillStyle(0xe5484d, 0.25).fillRect(x, y, w, h);
      for (const { item, x, y } of this.pieces()) for (const seat of item.seats) g.fillStyle(0x3e63dd, 1).fillCircle(x + seat.x, y + seat.y, 3);
    }
    if (this.painting) {
      const { from, to } = this.painting;
      const [x0, y0] = [Math.min(from[0], to[0]), Math.min(from[1], to[1])];
      const [x1, y1] = [Math.max(from[0], to[0]), Math.max(from[1], to[1])];
      g.lineStyle(2, 0xe5484d, 1).strokeRect(x0 * TILE, y0 * TILE, (x1 - x0 + 1) * TILE, (y1 - y0 + 1) * TILE);
    }
    if (selected) {
      const [x, y, w, h] = this.outline(selected);
      g.lineStyle(2, 0x1c1c1e, 1).strokeRect(x - 1, y - 1, w + 2, h + 2);
      g.lineStyle(1, 0xffffff, 1).strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
      for (const h of this.handles()) {
        g.fillStyle(0xffffff, 1).fillCircle(h.x, h.y, 8);
        g.lineStyle(2, 0x1c1c1e, 1).strokeCircle(h.x, h.y, 8);
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
    for (const { item, x, y } of this.pieces()) {
      for (const seat of item.seats) {
        const sx = x + seat.x, sy = y + seat.y;
        const distance = Math.hypot(sx - this.avatar.x, sy - this.avatar.y);
        if (distance < 56 && (!best || distance < best.distance)) best = { x: sx, y: sy, dir: seat.dir, distance };
      }
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
$("#shuffle").addEventListener("click", async () => {
  if (!selected) return;
  selected.salt = (selected.salt ?? 0) + 1;
  await scene.draw(selected);
  scene.sortAll();
  setDirty(true);
});
$("#reseed").addEventListener("click", () => {
  layout.seed = Math.floor(Math.random() * 1e6);
  scene.rebuild();
  setDirty(true);
});
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
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
  place: async (id, x, y, extra = {}) => {
    const entry = { id: newId(), item: id, x, y, ...extra };
    layout.items.push(entry);
    await scene.draw(entry);
    scene.sortAll();
    setDirty(true);
    return entry;
  },
  clear: () => {
    layout.items = [];
    scene.rebuild();
    setDirty(true);
  },
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
