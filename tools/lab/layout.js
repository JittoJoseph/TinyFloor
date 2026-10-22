// The layout editor (tools/lab/README.md): today's office walls and floors
// with catalog items placed on them, by hand. A layout is a list of items and
// where each stands; the first ones are the template offices.
/* global Phaser */
import { TILE, SPEED, SEAT, SIT_FRAME, down16, image, loadAvatar, avatarAnims, itemFrame, heldDirection } from "./common.js";

const $ = (selector) => document.querySelector(selector);
const COLS = 48;
const ROWS = 32;

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
  $("#status").textContent = layout ? `${layout.items.length} items${dirty ? " · unsaved" : ""}` : "";
}

// ---------- layouts ----------

async function loadLayouts(wanted) {
  const ids = await (await fetch("/api/layouts")).json();
  const select = $("#layout-id");
  select.replaceChildren(...ids.map((id) => new Option(id, id)));
  const id = wanted ?? new URLSearchParams(location.search).get("id") ?? ids[0];
  if (id) await openLayout(id);
  else newLayout("startup");
}

async function openLayout(id) {
  layout = await (await fetch(`/api/layouts/${id}`)).json();
  $("#layout-id").value = id;
  $("#layout-name").value = layout.name ?? "";
  history.replaceState(null, "", `?id=${id}`);
  selected = null;
  setDirty(false);
  scene?.rebuild();
}

function newLayout(id) {
  layout = { id, name: "", shell: "office-map", items: [] };
  if (![...$("#layout-id").options].some((o) => o.value === id)) $("#layout-id").add(new Option(id, id));
  $("#layout-id").value = id;
  $("#layout-name").value = "";
  selected = null;
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
  const img = await image(item.sprite.src);
  const [x, y, w, h] = item.sprite.rect;
  const scale = Math.min(2, 52 / w, 52 / h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  if (item.sprite.flip) context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  context.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
}

function renderPalette() {
  const query = $("#search").value.trim().toLowerCase();
  const groups = new Map();
  for (const item of catalog.items) {
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
  selected = null;
  document.querySelectorAll("#palette button").forEach((b) => b.setAttribute("aria-pressed", String(placing?.id === b.dataset.id)));
  scene?.updateGhost();
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
    this.ghost = this.add.image(0, 0, "__DEFAULT").setOrigin(0, 0).setAlpha(0.6).setDepth(99999).setVisible(false);
    avatarAnims(this);
    this.avatar = this.add.sprite(23 * TILE, 16 * TILE, "avatar", 0).setScale(2).setOrigin(0.5, 1);
    this.avatar.play("idle-down");
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,E", false);
    this.keys.E.on("down", () => this.toggleSit());
    this.input.keyboard.on("keydown-DELETE", () => this.removeSelected());
    this.input.keyboard.on("keydown-BACKSPACE", () => this.removeSelected());
    this.input.keyboard.on("keydown-ESC", () => {
      if (placing) startPlacing(placing);
      selected = null;
      this.drawOverlay();
    });
    this.input.on("pointermove", (pointer) => this.pointerMove(pointer));
    this.input.on("pointerdown", (pointer) => this.pointerDown(pointer));
    this.input.on("pointerup", () => (this.drag = null));
    this.rebuild();
  }

  async rebuild() {
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites.clear();
    if (!layout) return;
    for (const entry of layout.items) await this.addSprite(entry);
    this.sortAll();
    this.drawOverlay();
    setDirty(dirty);
  }

  async addSprite(entry) {
    const item = byId.get(entry.item);
    if (!item) return;
    const { key, frame } = await itemFrame(this, item);
    const sprite = this.add.image(entry.x, entry.y, key, frame).setOrigin(0, 0).setFlipX(!!item.sprite.flip);
    this.sprites.set(entry, sprite);
  }

  /**
   * Draw order, as the floor does it: by where each thing stands. Things on a
   * wall sit just over the wall, and things on a desk just over that desk.
   */
  depthOf(entry) {
    const item = byId.get(entry.item);
    if (item.mount === "wall") return 2;
    if (item.mount === "surface") {
      const [, , w, h] = item.sprite.rect;
      const foot = { x: entry.x + w / 2, y: entry.y + h - 2 };
      for (const other of layout.items) {
        const host = byId.get(other.item);
        if (!host?.surface) continue;
        const [sx, sy, sw, sh] = host.surface;
        if (foot.x >= other.x + sx && foot.x <= other.x + sx + sw && foot.y >= other.y + sy && foot.y <= other.y + sy + sh) {
          return other.y + host.sortY + 0.5;
        }
      }
    }
    return entry.y + item.sortY;
  }

  sortAll() {
    for (const [entry, sprite] of this.sprites) sprite.setDepth(this.depthOf(entry));
  }

  solids() {
    const out = [...this.wallSolids];
    for (const entry of layout?.items ?? []) {
      const item = byId.get(entry.item);
      for (const [x, y, w, h] of item?.colliders ?? []) out.push([entry.x + x, entry.y + y, w, h]);
    }
    return out;
  }

  blocked(px, py) {
    if (px < 0 || py < 0 || px > COLS * TILE || py > ROWS * TILE) return true;
    return this.solids().some(([x, y, w, h]) => px >= x && px <= x + w && py >= y && py <= y + h);
  }

  /** The placed item under the pointer, the one drawn on top. */
  itemAt(px, py) {
    let best = null;
    for (const [entry, sprite] of this.sprites) {
      const [, , w, h] = byId.get(entry.item).sprite.rect;
      if (px >= entry.x && px < entry.x + w && py >= entry.y && py < entry.y + h && (!best || sprite.depth >= best.depth)) {
        best = { entry, depth: sprite.depth };
      }
    }
    return best?.entry ?? null;
  }

  async updateGhost(pointer = this.input.activePointer) {
    if (!placing) return this.ghost.setVisible(false);
    const { key, frame } = await itemFrame(this, placing);
    const [, , w, h] = placing.sprite.rect;
    this.ghost.setTexture(key, frame).setFlipX(!!placing.sprite.flip).setVisible(true);
    this.ghost.setPosition(down16(pointer.worldX - w / 2 + 8), down16(pointer.worldY - h / 2 + 8));
  }

  pointerMove(pointer) {
    if (placing) return this.updateGhost(pointer);
    if (!this.drag || !pointer.isDown) return;
    const entry = this.drag.entry;
    const x = down16(pointer.worldX - this.drag.dx + 8);
    const y = down16(pointer.worldY - this.drag.dy + 8);
    if (x === entry.x && y === entry.y) return;
    entry.x = x;
    entry.y = y;
    this.sprites.get(entry).setPosition(x, y);
    this.sortAll();
    this.drawOverlay();
    setDirty(true);
  }

  async pointerDown(pointer) {
    if (placing) {
      const entry = { item: placing.id, x: this.ghost.x, y: this.ghost.y };
      layout.items.push(entry);
      await this.addSprite(entry);
      this.sortAll();
      setDirty(true);
      if (!pointer.event.shiftKey) startPlacing(placing);
      return;
    }
    const entry = this.itemAt(pointer.worldX, pointer.worldY);
    selected = entry;
    if (entry) this.drag = { entry, dx: pointer.worldX - entry.x, dy: pointer.worldY - entry.y };
    this.drawOverlay();
  }

  removeSelected() {
    if (!selected || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    layout.items = layout.items.filter((entry) => entry !== selected);
    this.sprites.get(selected)?.destroy();
    this.sprites.delete(selected);
    selected = null;
    this.sortAll();
    this.drawOverlay();
    setDirty(true);
  }

  drawOverlay() {
    const g = this.overlay;
    g.clear();
    if ($("#show-colliders").checked) {
      for (const [x, y, w, h] of this.solids()) g.fillStyle(0xe5484d, 0.25).fillRect(x, y, w, h);
      for (const entry of layout?.items ?? []) {
        const item = byId.get(entry.item);
        for (const seat of item?.seats ?? []) g.fillStyle(0x3e63dd, 1).fillCircle(entry.x + seat.x, entry.y + seat.y, 3);
      }
    }
    if (selected) {
      const [, , w, h] = byId.get(selected.item).sprite.rect;
      g.lineStyle(2, 0x1c1c1e, 1).strokeRect(selected.x - 1, selected.y - 1, w + 2, h + 2);
      g.lineStyle(1, 0xffffff, 1).strokeRect(selected.x - 2.5, selected.y - 2.5, w + 5, h + 5);
    }
  }

  toggleSit() {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (this.seated) {
      const { x, y, dir } = this.seated;
      this.seated = null;
      this.avatar.setPosition(x, y + SEAT[dir].exit);
      this.avatar.play(`idle-${this.facing}`);
      return;
    }
    let best = null;
    for (const entry of layout?.items ?? []) {
      for (const seat of byId.get(entry.item)?.seats ?? []) {
        const sx = entry.x + seat.x, sy = entry.y + seat.y;
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
  place: async (id, x, y) => {
    const entry = { item: id, x, y };
    layout.items.push(entry);
    await scene.addSprite(entry);
    scene.sortAll();
    setDirty(true);
    return entry;
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
