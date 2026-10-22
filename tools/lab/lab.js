// The item lab's page (tools/lab/README.md). One item on a small floor at a
// time, with a character to walk round it: colliders, sort line, seats and
// surface drawn over it and dragged into place, then saved to the catalog.
/* global Phaser */

import { TILE, SPEED, SEAT, SIT_FRAME, down16, up16, image, loadAvatar, avatarAnims, itemFrame } from "./common.js";

const COLS = 16;
const ROWS = 11;
const SNAP = 4;

const $ = (selector) => document.querySelector(selector);
const show = { colliders: true, sort: true, seats: true, surface: true, grid: true };

let catalog = { version: 1, tile: TILE, items: [] };
let current = null;
let copies = [];
let dirty = false;
let scene = null;

// ---------- catalog ----------

async function loadCatalog() {
  catalog = await (await fetch("/api/catalog")).json();
  catalog.items ??= [];
  renderList();
  const wanted = new URLSearchParams(location.search).get("item");
  const first = catalog.items.find((item) => item.id === wanted) ?? catalog.items[0];
  if (first) select(first);
}

async function save() {
  catalog.items.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  const response = await fetch("/api/catalog", { method: "PUT", body: JSON.stringify(catalog) });
  if (!response.ok) return alert(`Not saved: ${await response.text()}`);
  setDirty(false);
  renderList();
}

function setDirty(value) {
  dirty = value;
  $("#save").disabled = !dirty;
  $("#save").textContent = dirty ? "Save catalog" : "Saved";
}

function changed() {
  setDirty(true);
  scene?.rebuild();
  renderListRow(current);
}

// ---------- images ----------

function pixels(img, [x, y, w, h]) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(img, x, y, w, h, 0, 0, w, h);
  return context.getImageData(0, 0, w, h);
}

/** The opaque part of an image region, as [x, y, w, h] inside it, or null when it's empty. */
function opaque({ data, width, height }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}


/** The source's objects drawn on a 16px grid: its opaque box, widened out to that grid so it lands on the floor's grid too. */
async function gridBox(src) {
  const img = await image(src);
  const box = opaque(pixels(img, [0, 0, img.width, img.height]));
  if (!box) return [0, 0, img.width, img.height];
  const [x, y, w, h] = box;
  const x0 = down16(x), y0 = down16(y);
  return [x0, y0, up16(x + w) - x0, up16(y + h) - y0];
}

/** The opaque part of a rectangle drawn on a sheet, widened to the 16px grid: a loose selection still cuts tight. */
async function gridBoxWithin(src, [rx, ry, rw, rh]) {
  const img = await image(src);
  const box = opaque(pixels(img, [rx, ry, rw, rh]));
  if (!box) return [rx, ry, rw, rh];
  const [x, y, w, h] = box;
  const x0 = down16(rx + x), y0 = down16(ry + y);
  return [x0, y0, up16(rx + x + w) - x0, up16(ry + y + h) - y0];
}

/**
 * A first guess at what you can't walk through: the bottom band of the
 * object's pixels, a third of its height or at least 8px, in from each side.
 * Things seen from above and in front stand on their lowest rows.
 */
async function guessCollider(item) {
  const img = await image(item.sprite.src);
  const box = opaque(pixels(img, item.sprite.rect));
  if (!box) return [0, 0, item.sprite.rect[2], item.sprite.rect[3]];
  const [x, y, w, h] = box;
  const band = Math.max(8, Math.min(h, Math.round((h * 0.35) / 4) * 4));
  const inset = w > 12 ? 2 : 0;
  return [x + inset, y + h - band, w - inset * 2, band];
}

// ---------- items ----------

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniqueId(base) {
  let id = base, n = 2;
  while (catalog.items.some((item) => item.id === id)) id = `${base}-${n++}`;
  return id;
}

async function fromSource(src, label, within) {
  const rect = within ? await gridBoxWithin(src, within) : await gridBox(src);
  const number = src.match(/(\d+)\.png$/)?.[1] ?? "";
  const item = {
    id: uniqueId(slug(`${label}-${number}`)),
    name: "",
    category: "decor",
    themes: [label.toLowerCase().includes("office") ? "office" : slug(label)],
    mount: "floor",
    sprite: { src, rect },
    sortY: rect[3],
    colliders: [],
    seats: [],
    surface: null,
    notes: "",
  };
  const collider = await guessCollider(item);
  item.colliders.push(collider);
  item.sortY = collider[1] + collider[3];
  catalog.items.push(item);
  renderList();
  select(item);
  setDirty(true);
  if (!within) selectTab("items");
}

function select(item) {
  current = item;
  copies = [];
  history.replaceState(null, "", `?item=${encodeURIComponent(item.id)}`);
  document.querySelectorAll("#item-list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.id === item.id)));
  renderProps();
  scene?.rebuild();
}

// ---------- item list ----------

async function thumbnail(item, canvas) {
  const img = await image(item.sprite.src);
  const [x, y, w, h] = item.sprite.rect;
  const context = canvas.getContext("2d");
  const scale = Math.min(1, 32 / Math.max(w, h));
  canvas.width = 32;
  canvas.height = 32;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 32, 32);
  context.save();
  if (item.sprite.flip) context.setTransform(-1, 0, 0, 1, 32, 0);
  context.drawImage(img, x, y, w, h, (32 - w * scale) / 2, 32 - h * scale, w * scale, h * scale);
  context.restore();
}

function renderListRow(item) {
  const li = document.querySelector(`#item-list li[data-id="${CSS.escape(item.id)}"]`);
  if (!li) return renderList();
  li.querySelector("b").textContent = item.name || item.id;
  li.querySelector("small").textContent = `${item.category} · ${item.themes.join(", ")}`;
  thumbnail(item, li.querySelector("canvas"));
}

function renderList() {
  const query = $("#item-search").value.trim().toLowerCase();
  const list = $("#item-list");
  list.replaceChildren();
  for (const item of catalog.items) {
    if (query && !`${item.id} ${item.name} ${item.category} ${item.themes.join(" ")}`.toLowerCase().includes(query)) continue;
    const li = document.createElement("li");
    li.dataset.id = item.id;
    li.setAttribute("aria-selected", String(item === current));
    li.innerHTML = `<canvas></canvas><div><b></b><small></small></div>`;
    li.querySelector("b").textContent = item.name || item.id;
    li.querySelector("small").textContent = `${item.category} · ${item.themes.join(", ")}`;
    li.addEventListener("click", () => select(item));
    thumbnail(item, li.querySelector("canvas"));
    list.append(li);
  }
}

// ---------- sources ----------

async function loadSources() {
  const sources = await (await fetch("/api/sources")).json();
  const select = $("#source-dir");
  for (const source of sources) {
    const option = new Option(source.label, source.dir ?? source.sheet);
    if (source.sheet) option.dataset.sheet = "";
    select.add(option);
  }
  select.addEventListener("change", renderSources);
  renderSources();
}

async function renderSources() {
  const select = $("#source-dir");
  const dir = select.value;
  const label = select.selectedOptions[0]?.textContent ?? "";
  if (select.selectedOptions[0]?.hasAttribute("data-sheet")) return renderSheet(dir, label.replace(/ sheet$/, ""));
  const names = await (await fetch(`/api/files?dir=${encodeURIComponent(dir)}`)).json();
  const grid = $("#source-grid");
  grid.replaceChildren();
  const used = new Set(catalog.items.map((item) => item.sprite.src));
  for (const name of names) {
    const src = `${dir}/${name}`;
    const button = document.createElement("button");
    button.title = name;
    button.innerHTML = `<canvas></canvas><span></span>`;
    trimmedThumbnail(src, button.querySelector("canvas"));
    button.querySelector("span").textContent = name.match(/(\d+)\.png$/)?.[1] ?? "";
    if (used.has(src)) button.dataset.used = "";
    button.addEventListener("click", () => fromSource(src, label));
    grid.append(button);
  }
}

/**
 * A whole sheet to cut from: drag a rectangle round an object and it becomes
 * an item, trimmed to its pixels on the 16px grid. Items already cut from the
 * sheet are outlined.
 */
async function renderSheet(src, label) {
  const img = await image(src);
  const scale = Math.min(1, 512 / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.className = "sheet";
  canvas.style.width = `${img.width * scale}px`;
  const grid = $("#source-grid");
  grid.replaceChildren(canvas);
  const context = canvas.getContext("2d");
  let drag = null;
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
    context.strokeStyle = "rgba(48,164,108,0.9)";
    for (const item of catalog.items.filter((i) => i.sprite.src === src)) context.strokeRect(item.sprite.rect[0] + 0.5, item.sprite.rect[1] + 0.5, item.sprite.rect[2] - 1, item.sprite.rect[3] - 1);
    if (drag) {
      context.strokeStyle = "#e5484d";
      context.strokeRect(...normalize(drag).map((v, i) => (i < 2 ? v + 0.5 : v - 1)));
    }
  };
  const at = (event) => {
    const r = canvas.getBoundingClientRect();
    return [((event.clientX - r.left) / r.width) * canvas.width, ((event.clientY - r.top) / r.height) * canvas.height];
  };
  const normalize = ({ x0, y0, x1, y1 }) => {
    const ax = down16(Math.min(x0, x1)), ay = down16(Math.min(y0, y1));
    return [ax, ay, Math.max(16, up16(Math.max(x0, x1)) - ax), Math.max(16, up16(Math.max(y0, y1)) - ay)];
  };
  canvas.addEventListener("pointerdown", (event) => {
    const [x, y] = at(event);
    drag = { x0: x, y0: y, x1: x, y1: y };
    canvas.setPointerCapture(event.pointerId);
    draw();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drag) return;
    [drag.x1, drag.y1] = at(event);
    draw();
  });
  canvas.addEventListener("pointerup", async () => {
    if (!drag) return;
    const rect = normalize(drag);
    drag = null;
    draw();
    await fromSource(src, label, rect);
  });
  draw();
}

/** A source drawn by its pixels, not its canvas, so a chair on a big empty sheet still reads as a chair. */
async function trimmedThumbnail(src, canvas) {
  const img = await image(src);
  const box = opaque(pixels(img, [0, 0, img.width, img.height])) ?? [0, 0, img.width, img.height];
  const [x, y, w, h] = box;
  const scale = Math.min(2, 56 / w, 56 / h);
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
}

function selectTab(tab) {
  document.body.dataset.tab = tab;
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab === "sources") renderSources();
}

// ---------- properties ----------

function numberInput(value, onInput) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = value;
  input.addEventListener("input", () => onInput(Number(input.value)));
  return input;
}

function removeButton(onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "×";
  button.title = "Remove";
  button.addEventListener("click", onClick);
  return button;
}

function rectRow(rect, onRemove) {
  const row = document.createElement("div");
  row.className = "rect";
  rect.forEach((value, index) =>
    row.append(numberInput(value, (v) => {
      rect[index] = v;
      changed();
    })),
  );
  if (onRemove) row.append(removeButton(onRemove));
  return row;
}

function renderProps() {
  const form = $("#props");
  form.hidden = !current;
  $("#prop-title").textContent = current ? current.name || current.id : "No item";
  if (!current) return;
  const item = current;
  form.id.value = item.id;
  form.name.value = item.name;
  form.category.value = item.category;
  form.mount.value = item.mount;
  form.themes.value = item.themes.join(", ");
  form.notes.value = item.notes ?? "";
  form.sortY.value = item.sortY;
  [form.rx.value, form.ry.value, form.rw.value, form.rh.value] = item.sprite.rect;
  form.flip.checked = !!item.sprite.flip;
  $("#sprite-src").textContent = item.sprite.src;
  renderShapes();
}

function renderShapes() {
  const item = current;
  const colliders = $("#colliders");
  colliders.replaceChildren(
    ...item.colliders.map((rect, index) =>
      rectRow(rect, () => {
        item.colliders.splice(index, 1);
        renderShapes();
        changed();
      }),
    ),
  );
  const seats = $("#seats");
  seats.replaceChildren(
    ...item.seats.map((seat, index) => {
      const row = document.createElement("div");
      row.className = "seat";
      row.append(
        numberInput(seat.x, (v) => ((seat.x = v), changed())),
        numberInput(seat.y, (v) => ((seat.y = v), changed())),
      );
      const dir = document.createElement("select");
      for (const d of ["down", "up", "left", "right"]) dir.add(new Option(d, d));
      dir.value = seat.dir;
      dir.addEventListener("change", () => ((seat.dir = dir.value), changed()));
      row.append(dir, removeButton(() => (item.seats.splice(index, 1), renderShapes(), changed())));
      return row;
    }),
  );
  $("#surface").replaceChildren(...(item.surface ? [rectRow(item.surface, null)] : []));
  $("#toggle-surface").textContent = item.surface ? "Remove" : "Add";
}

function bindForm() {
  const form = $("#props");
  form.addEventListener("input", (event) => {
    const item = current;
    if (!item) return;
    const { name, value } = event.target;
    if (name === "id") {
      const li = document.querySelector(`#item-list li[data-id="${CSS.escape(item.id)}"]`);
      item.id = slug(value) || item.id;
      if (li) li.dataset.id = item.id;
    } else if (name === "name") item.name = value;
    else if (name === "category") item.category = value;
    else if (name === "mount") item.mount = value;
    else if (name === "themes") item.themes = value.split(",").map((t) => t.trim()).filter(Boolean);
    else if (name === "notes") item.notes = value;
    else if (name === "sortY") item.sortY = Number(value);
    else if (name === "flip") item.sprite.flip = event.target.checked || undefined;
    else if (["rx", "ry", "rw", "rh"].includes(name)) item.sprite.rect[["rx", "ry", "rw", "rh"].indexOf(name)] = Number(value);
    else return;
    $("#prop-title").textContent = item.name || item.id;
    changed();
  });
  $("#add-collider").addEventListener("click", () => {
    const [, , w, h] = current.sprite.rect;
    current.colliders.push([0, Math.max(0, h - 16), w, Math.min(16, h)]);
    renderShapes();
    changed();
  });
  $("#auto-collider").addEventListener("click", async () => {
    const collider = await guessCollider(current);
    current.colliders = [collider];
    current.sortY = collider[1] + collider[3];
    renderProps();
    changed();
  });
  $("#add-seat").addEventListener("click", () => {
    const [, , w, h] = current.sprite.rect;
    current.seats.push({ x: w / 2, y: h, dir: "down" });
    renderShapes();
    changed();
  });
  $("#toggle-surface").addEventListener("click", () => {
    const [, , w] = current.sprite.rect;
    current.surface = current.surface ? null : [2, 2, w - 4, 16];
    renderShapes();
    changed();
  });
  $("#duplicate").addEventListener("click", () => {
    const copy = structuredClone(current);
    copy.id = uniqueId(current.id);
    catalog.items.push(copy);
    renderList();
    select(copy);
    setDirty(true);
  });
  $("#delete").addEventListener("click", () => {
    if (!confirm(`Delete ${current.id}?`)) return;
    catalog.items = catalog.items.filter((item) => item !== current);
    current = null;
    renderList();
    renderProps();
    scene?.rebuild();
    setDirty(true);
  });
  $("#save").addEventListener("click", save);
  $("#item-search").addEventListener("input", renderList);
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => selectTab(b.dataset.tab)));
  document.querySelectorAll("[data-show]").forEach((box) =>
    box.addEventListener("change", () => {
      show[box.dataset.show] = box.checked;
      scene?.drawOverlays();
    }),
  );
  $("#copy-right").addEventListener("click", () => {
    const last = copies.at(-1) ?? { dx: 0, dy: 0 };
    copies.push({ dx: last.dx + current.sprite.rect[2], dy: last.dy });
    scene?.rebuild();
  });
  $("#copy-below").addEventListener("click", () => {
    const last = copies.at(-1) ?? { dx: 0, dy: 0 };
    copies.push({ dx: last.dx, dy: last.dy + current.sprite.rect[3] });
    scene?.rebuild();
  });
  $("#clear-copies").addEventListener("click", () => {
    copies = [];
    scene?.rebuild();
  });
  addEventListener("beforeunload", (event) => {
    if (dirty) event.preventDefault();
  });
  addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      if (dirty) save();
    }
  });
}

// ---------- the stage ----------

const typing = () => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);

class Stage extends Phaser.Scene {
  constructor() {
    super("stage");
    this.placed = [];
    this.drag = null;
    this.seated = null;
    this.facing = "down";
  }

  preload() {
    loadAvatar(this);
  }

  create() {
    scene = this;
    this.floor = this.add.graphics().setDepth(-10);
    this.overlay = this.add.graphics().setDepth(100000);
    this.drawFloor();

    avatarAnims(this);
    this.avatar = this.add.sprite(COLS * TILE * 0.5, ROWS * TILE - 24, "avatar", 0).setScale(2).setOrigin(0.5, 1);
    this.avatar.play("idle-down");
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,E", false);
    this.keys.E.on("down", () => !typing() && this.toggleSit());

    this.input.on("pointerdown", (pointer) => this.pointerDown(pointer));
    this.input.on("pointermove", (pointer) => this.pointerMove(pointer));
    this.input.on("pointerup", () => this.pointerUp());
    this.rebuild();
  }

  drawFloor() {
    const g = this.floor;
    g.clear();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        g.fillStyle((x + y) % 2 ? 0xd9d5cc : 0xe2ded5, 1).fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  /** Where the item sits on this floor: its sprite's top left, on the grid, about the middle. */
  origin() {
    const [, , w, h] = current.sprite.rect;
    return { x: down16(COLS * TILE * 0.5 - w / 2), y: down16(ROWS * TILE * 0.45 - h / 2) };
  }

  async rebuild() {
    this.placed.forEach((image) => image.destroy());
    this.placed = [];
    if (!current) return this.drawOverlays();
    const item = current;
    const { key, frame } = await itemFrame(this, item);
    if (item !== current) return;
    const { x, y } = this.origin();
    for (const offset of [{ dx: 0, dy: 0 }, ...copies]) {
      const px = x + offset.dx, py = y + offset.dy;
      this.placed.push(this.add.image(px, py, key, frame).setOrigin(0, 0).setFlipX(!!item.sprite.flip).setDepth(py + item.sortY));
    }
    this.drawOverlays();
  }

  placements() {
    if (!current) return [];
    const { x, y } = this.origin();
    return [{ dx: 0, dy: 0 }, ...copies].map((o) => ({ x: x + o.dx, y: y + o.dy }));
  }

  drawOverlays() {
    const g = this.overlay;
    g.clear();
    if (show.grid) {
      g.lineStyle(1, 0x000000, 0.07);
      for (let x = 0; x <= COLS * TILE; x += 16) g.lineBetween(x, 0, x, ROWS * TILE);
      for (let y = 0; y <= ROWS * TILE; y += 16) g.lineBetween(0, y, COLS * TILE, y);
      g.lineStyle(1, 0x000000, 0.12);
      for (let x = 0; x <= COLS * TILE; x += TILE) g.lineBetween(x, 0, x, ROWS * TILE);
      for (let y = 0; y <= ROWS * TILE; y += TILE) g.lineBetween(0, y, COLS * TILE, y);
    }
    if (!current) return;
    const item = current;
    const [, , w, h] = item.sprite.rect;
    for (const [index, { x, y }] of this.placements().entries()) {
      const main = index === 0;
      g.lineStyle(1, 0xffffff, main ? 0.7 : 0.3).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      if (show.colliders) {
        for (const [cx, cy, cw, ch] of item.colliders) {
          g.fillStyle(0xe5484d, 0.28).fillRect(x + cx, y + cy, cw, ch);
          g.lineStyle(1, 0xe5484d, 0.95).strokeRect(x + cx + 0.5, y + cy + 0.5, cw - 1, ch - 1);
          if (main) g.fillStyle(0xe5484d, 1).fillRect(x + cx + cw - 3, y + cy + ch - 3, 4, 4);
        }
      }
      if (show.sort) {
        g.lineStyle(1, 0xf5b700, 1);
        for (let sx = x - 6; sx < x + w + 6; sx += 4) g.lineBetween(sx, y + item.sortY, sx + 2, y + item.sortY);
      }
      if (show.surface && item.surface) {
        const [sx, sy, sw, sh] = item.surface;
        g.lineStyle(1, 0x30a46c, 1).strokeRect(x + sx + 0.5, y + sy + 0.5, sw - 1, sh - 1);
        if (main) g.fillStyle(0x30a46c, 1).fillRect(x + sx + sw - 3, y + sy + sh - 3, 4, 4);
      }
      if (show.seats) {
        for (const seat of item.seats) {
          const sx = x + seat.x, sy = y + seat.y;
          g.fillStyle(0x3e63dd, 1).fillCircle(sx, sy, 3);
          const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[seat.dir];
          g.lineStyle(2, 0x3e63dd, 1).lineBetween(sx, sy, sx + v[0] * 10, sy + v[1] * 10);
        }
      }
    }
  }

  /** The colliders of everything placed, in floor coordinates. */
  solids() {
    if (!current) return [];
    return this.placements().flatMap(({ x, y }) => current.colliders.map(([cx, cy, cw, ch]) => [x + cx, y + cy, cw, ch]));
  }

  /** As the floor does it (MapManager.checkCollisionAt): your feet, a point, against each rectangle. */
  blocked(px, py) {
    if (px < 8 || py < 16 || px > COLS * TILE - 8 || py > ROWS * TILE - 2) return true;
    return this.solids().some(([x, y, w, h]) => px >= x && px <= x + w && py >= y && py <= y + h);
  }

  toggleSit() {
    if (this.seated) {
      const { x, y, dir } = this.seated;
      this.seated = null;
      this.avatar.setPosition(x, y + SEAT[dir].exit);
      this.avatar.play(`idle-${this.facing}`);
      return;
    }
    if (!current) return;
    let best = null;
    for (const { x, y } of this.placements()) {
      for (const seat of current.seats) {
        const sx = x + seat.x, sy = y + seat.y;
        const distance = Math.hypot(sx - this.avatar.x, sy - this.avatar.y);
        if (distance < 72 && (!best || distance < best.distance)) best = { x: sx, y: sy, dir: seat.dir, distance };
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
    if (this.seated || typing()) {
      if (!this.seated && this.avatar.anims.currentAnim?.key.startsWith("run")) this.avatar.play(`idle-${this.facing}`);
      return;
    }
    const k = this.keys;
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
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

  // Dragging shapes on the main copy: a corner handle resizes, inside moves; the sort line and seats move too.
  pointerDown(pointer) {
    if (!current) return;
    const { x, y } = this.origin();
    const px = pointer.worldX - x, py = pointer.worldY - y;
    const near = (a, b, r = 4) => Math.abs(a - b) <= r;
    const hit = (rect) => {
      const [rx, ry, rw, rh] = rect;
      if (near(px, rx + rw - 1) && near(py, ry + rh - 1)) return "resize";
      if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) return "move";
      return null;
    };
    const seat = current.seats.find((s) => Math.hypot(px - s.x, py - s.y) <= 5);
    if (seat) return (this.drag = { kind: "seat", target: seat, start: { px, py, x: seat.x, y: seat.y } });
    const shapes = [...current.colliders.map((r) => ["collider", r]), ...(current.surface ? [["surface", current.surface]] : [])];
    for (const [kind, rect] of shapes.reverse()) {
      const mode = hit(rect);
      if (mode) return (this.drag = { kind, mode, target: rect, start: { px, py, rect: [...rect] } });
    }
    if (near(py, current.sortY, 3)) this.drag = { kind: "sort", start: { py, sortY: current.sortY } };
  }

  pointerMove(pointer) {
    const drag = this.drag;
    if (!drag || !pointer.isDown) return;
    const { x, y } = this.origin();
    const fine = pointer.event.shiftKey;
    const snap = (v) => (fine ? Math.round(v) : Math.round(v / SNAP) * SNAP);
    const dx = snap(pointer.worldX - x - drag.start.px), dy = snap(pointer.worldY - y - drag.start.py);
    if (drag.kind === "seat") {
      drag.target.x = drag.start.x + dx;
      drag.target.y = drag.start.y + dy;
    } else if (drag.kind === "sort") {
      current.sortY = drag.start.sortY + dy;
      $("#props").sortY.value = current.sortY;
    } else {
      const [rx, ry, rw, rh] = drag.start.rect;
      const next = drag.mode === "move" ? [rx + dx, ry + dy, rw, rh] : [rx, ry, Math.max(2, rw + dx), Math.max(2, rh + dy)];
      drag.target.splice(0, 4, ...next);
    }
    setDirty(true);
    this.rebuildDepths();
    this.drawOverlays();
  }

  pointerUp() {
    if (!this.drag) return;
    this.drag = null;
    renderShapes();
  }

  rebuildDepths() {
    for (const image of this.placed) image.setDepth(image.y + current.sortY);
  }
}

bindForm();
// Kept on the window for driving the lab from a script: walking, sitting, screenshots.
window.lab = {
  scene: () => scene,
  catalog: () => catalog,
  select: (id) => select(catalog.items.find((item) => item.id === id)),
  /** Cuts an item from a sheet the way dragging a rectangle does, then applies the given properties. */
  cut: async (src, rect, props = {}) => {
    await fromSource(src, props.themes?.[0] ?? "office", rect);
    Object.assign(current, props);
    renderProps();
    renderList();
    scene?.rebuild();
    return current.id;
  },
};
window.lab.game = new Phaser.Game({
  // A 2D canvas shows each frame as soon as it is drawn, so screenshots of a stepped lab are never stale.
  type: Phaser.CANVAS,
  parent: "game",
  width: COLS * TILE,
  height: ROWS * TILE,
  pixelArt: true,
  backgroundColor: "#e2ded5",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Stage,
});
loadSources();
loadCatalog();
