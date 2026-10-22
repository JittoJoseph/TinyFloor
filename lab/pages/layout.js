// The layout editor (lab/README.md): today's office walls and floors with
// catalog items placed on them, by hand. A layout is a list of placed items
// and bundles, each where it stands and, for a desk, which chair it has; the
// first ones are the template offices.
/* global Phaser */
import { TILE, SPEED, SEAT, SIT_FRAME, down16, loadAvatar, avatarAnims, itemFrame, drawItem, heldDirection } from "./common.js";
import { bounds, check, expand, isBundle, spriteSize } from "./catalog.js";

const $ = (selector) => document.querySelector(selector);
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

function setDirty(value) {
  dirty = value;
  $("#save").disabled = !dirty;
  const problems = layout ? check(catalog, [layout]).filter((p) => p.startsWith("layout")) : [];
  $("#status").textContent = layout ? `${layout.items.length} placed${dirty ? " · unsaved" : ""}${problems.length ? ` · ${problems.length} problems` : ""}` : "";
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
  $("#layout-id").value = id;
  $("#layout-name").value = layout.name ?? "";
  history.replaceState(null, "", `?id=${id}`);
  select(null);
  setDirty(false);
  scene?.rebuild();
}

function newLayout(id) {
  layout = { id, name: "", shell: "office-map", items: [] };
  if (![...$("#layout-id").options].some((o) => o.value === id)) $("#layout-id").add(new Option(id, id));
  $("#layout-id").value = id;
  $("#layout-name").value = "";
  select(null);
  setDirty(true);
  scene?.rebuild();
}

async function save() {
  layout.name = $("#layout-name").value;
  const response = await fetch(`/api/layouts/${layout.id}`, { method: "PUT", body: JSON.stringify(layout) });
  if (!response.ok) return alert(`Not saved: ${await response.text()}`);
  setDirty(false);
}

// ---------- palette ----------

async function thumbnail(item, canvas) {
  const [, , w, h] = bounds(byId, item.id);
  const scale = Math.min(2, 52 / w, 52 / h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  await drawItem(canvas.getContext("2d"), byId, item.id, 0, 0, scale);
}

function renderPalette() {
  const query = $("#search").value.trim().toLowerCase();
  const groups = new Map();
  // Parts are only placed inside their bundles: a desk top never without its chair.
  for (const item of catalog.items.filter((i) => !i.part)) {
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

/** Selecting a placed desk offers its chair: the slot's options, never none. */
function select(entry) {
  selected = entry;
  const slot = entry && byId.get(entry.item)?.parts?.find((part) => part.slot === "chair");
  const chooser = $("#chair");
  chooser.hidden = !slot;
  if (slot) {
    chooser.replaceChildren(...slot.options.map((id) => new Option(byId.get(id)?.name ?? id, id)));
    chooser.value = entry.choose?.chair ?? slot.default;
  }
  scene?.drawOverlay();
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
    this.load.tilemapTiledJSON("shell", "/app/tilesets/office-map.tmj");
    this.load.image("RoomBuilderTiles", "/app/tilesets/textures/Room_Builder_Office_32x32.png");
    this.load.image("ModernOfficeTiles", "/app/tilesets/textures/Modern_Office_Black_Shadow_32x32.png");
  }

  create() {
    scene = this;
    const map = this.make.tilemap({ key: "shell" });
    const tiles = [map.addTilesetImage("Room_Builder_Office_32x32", "RoomBuilderTiles"), map.addTilesetImage("Modern_Office_Black_Shadow_32x32", "ModernOfficeTiles")];
    map.createLayer("Ground", tiles, 0, 0).setDepth(0);
    const walls = map.createLayer("Walls", tiles, 0, 0).setDepth(1);
    // The walls are what you can't walk through in the shell: every tile on that layer.
    this.wallSolids = [];
    walls.forEachTile((tile) => tile.index > 0 && this.wallSolids.push([tile.pixelX, tile.pixelY, TILE, TILE]));

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
    this.input.on("pointerup", () => (this.drag = null));
    this.rebuild();
  }

  /** Every piece on the floor: [{ entry, item, x, y }], a bundle's parts each their own. */
  pieces() {
    return (layout?.items ?? []).flatMap((entry) => expand(byId, entry.item, entry.x, entry.y, entry.choose).map((piece) => ({ entry, ...piece })));
  }

  async rebuild() {
    this.sprites.forEach((images) => images.forEach((image) => image.destroy()));
    this.sprites.clear();
    if (!layout) return;
    for (const entry of layout.items) await this.draw(entry);
    this.sortAll();
    this.drawOverlay();
    setDirty(dirty);
  }

  /** (Re)draws one placed thing. */
  async draw(entry) {
    this.sprites.get(entry)?.forEach((image) => image.destroy());
    const pieces = expand(byId, entry.item, entry.x, entry.y, entry.choose);
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
    if (item.mount === "wall") return 2;
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
    const [bx, by, w, h] = bounds(byId, entry.item, entry.choose);
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
      for (const piece of expand(byId, placing.id, 0, 0)) {
        const { key, frame } = await itemFrame(this, piece.item);
        this.ghost.add(this.add.image(piece.x, piece.y, key, frame).setOrigin(0, 0).setFlipX(!!piece.item.sprite.flip));
      }
      this.ghost.setData("id", placing.id);
    }
    const [bx, by, w, h] = bounds(byId, placing.id);
    this.ghost.setVisible(true).setPosition(down16(pointer.worldX - w / 2 - bx + 8), down16(pointer.worldY - h / 2 - by + 8));
  }

  pointerMove(pointer) {
    if (placing) return this.updateGhost(pointer);
    if (!this.drag || !pointer.isDown) return;
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
    if (placing) {
      const entry = { item: placing.id, x: this.ghost.x, y: this.ghost.y };
      layout.items.push(entry);
      await this.draw(entry);
      this.sortAll();
      setDirty(true);
      if (!pointer.event.shiftKey) startPlacing(placing);
      return;
    }
    const entry = this.entryAt(pointer.worldX, pointer.worldY);
    select(entry);
    if (entry) this.drag = { entry, dx: pointer.worldX - entry.x, dy: pointer.worldY - entry.y };
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

  async chooseChair(id) {
    if (!selected) return;
    selected.choose = { ...selected.choose, chair: id };
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
    if (selected) {
      const [x, y, w, h] = this.outline(selected);
      g.lineStyle(2, 0x1c1c1e, 1).strokeRect(x - 1, y - 1, w + 2, h + 2);
      g.lineStyle(1, 0xffffff, 1).strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
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
$("#chair").addEventListener("change", (event) => scene?.chooseChair(event.target.value));
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
  place: async (id, x, y, choose) => {
    const entry = { item: id, x, y, ...(choose ? { choose } : {}) };
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
