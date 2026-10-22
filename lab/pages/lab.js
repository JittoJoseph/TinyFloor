// The item lab's page (lab/README.md). One item or bundle on a small floor at
// a time, with a character to walk round it and sit in it: colliders, sort
// line, seats and surface drawn over it and dragged into place, the house
// rules checked as you go (catalog.js), then saved to the catalog.
/* global Phaser */

import { TILE, SPEED, SEAT, SIT_FRAME, down16, up16, image, loadAvatar, avatarAnims, itemFrame, drawItem, heldDirection } from "./common.js";
import { SEAT_DIRECTIONS, bounds, check, expand, isBundle, isComposite, spriteSize } from "./catalog.js";

const COLS = 16;
const ROWS = 11;
const SNAP = 4;

const $ = (selector) => document.querySelector(selector);
const show = { colliders: true, sort: true, seats: true, surface: true, grid: true };

let catalog = { version: 1, tile: TILE, items: [] };
let byId = new Map();
let current = null;
let copies = [];
let choose = {};
let dirty = false;
let scene = null;

// ---------- catalog ----------

async function loadCatalog() {
  catalog = await (await fetch("/api/catalog")).json();
  catalog.items ??= [];
  reindex();
  renderList();
  const wanted = new URLSearchParams(location.search).get("item");
  const first = byId.get(wanted) ?? catalog.items[0];
  if (first) select(first);
}

function reindex() {
  byId = new Map(catalog.items.map((item) => [item.id, item]));
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
  renderProblems();
}

function changed() {
  setDirty(true);
  scene?.rebuild();
  renderListRow(current);
}

/** The house rules (catalog.js), checked on every change. */
function renderProblems() {
  const problems = check(catalog);
  const box = $("#problems");
  box.querySelector("summary").textContent = problems.length ? `${problems.length} problem${problems.length === 1 ? "" : "s"}` : "No problems";
  box.dataset.ok = String(!problems.length);
  box.querySelector("ul").replaceChildren(
    ...problems.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      const id = text.split(":")[0];
      if (byId.has(id)) li.addEventListener("click", () => select(byId.get(id)));
      return li;
    }),
  );
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

/** The opaque part of a rectangle on a pack image, widened to the 16px grid: a loose selection still cuts tight. */
async function gridBox(src, within) {
  const img = await image(src);
  const [rx, ry, rw, rh] = within ?? [0, 0, img.width, img.height];
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
  const [w, h] = spriteSize(item.sprite);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  await drawItem(canvas.getContext("2d"), byId, item.id, 0, 0);
  const box = opaque(canvas.getContext("2d").getImageData(0, 0, w, h));
  if (!box) return [0, 0, w, h];
  const [x, y, bw, bh] = box;
  const band = Math.max(8, Math.min(bh, Math.round((bh * 0.35) / 4) * 4));
  const inset = bw > 12 ? 2 : 0;
  return [x + inset, y + bh - band, bw - inset * 2, band];
}

// ---------- items ----------

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniqueId(base) {
  let id = base, n = 2;
  while (byId.has(id)) id = `${base}-${n++}`;
  return id;
}

function add(item) {
  catalog.items.push(item);
  reindex();
  renderList();
  select(item);
  setDirty(true);
}

async function fromSource(src, label, within) {
  const rect = await gridBox(src, within);
  const number = src.match(/(\d+)\.png$/)?.[1] ?? rect.slice(0, 2).join("-");
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
  catalog.items.push(item);
  reindex();
  const collider = await guessCollider(item);
  item.colliders.push(collider);
  item.sortY = collider[1] + collider[3];
  catalog.items.pop();
  add(item);
  if (!within) selectTab("items");
}

function newBundle() {
  const desk = catalog.items.find((item) => item.part && item.category === "desks");
  const chairs = catalog.items.filter((item) => item.seats.length === 1 && item.seats[0].dir === "up").map((item) => item.id);
  add({
    id: uniqueId("desk"),
    name: "Desk",
    category: "desks",
    themes: ["office"],
    parts: [
      ...(desk ? [{ item: desk.id, at: [0, 0] }] : []),
      ...(chairs.length ? [{ slot: "chair", at: [96, 48], options: chairs, default: chairs[0] }] : []),
    ],
    notes: "",
  });
}

function select(item) {
  if (!item) return;
  current = item;
  copies = [];
  choose = {};
  history.replaceState(null, "", `?item=${encodeURIComponent(item.id)}`);
  document.querySelectorAll("#item-list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.id === item.id)));
  renderProps();
  scene?.rebuild();
}

// ---------- item list ----------

async function thumbnail(item, canvas) {
  const [, , w, h] = bounds(byId, item.id);
  const scale = Math.min(1, 32 / Math.max(w, h));
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 32, 32);
  await drawItem(context, byId, item.id, (32 - w * scale) / 2, 32 - h * scale, scale);
}

const describe = (item) => `${isBundle(item) ? "bundle" : item.part ? "part" : item.category} · ${item.themes.join(", ")}`;

function renderListRow(item) {
  const li = document.querySelector(`#item-list li[data-id="${CSS.escape(item.id)}"]`);
  if (!li) return renderList();
  li.querySelector("b").textContent = item.name || item.id;
  li.querySelector("small").textContent = describe(item);
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
    li.querySelector("small").textContent = describe(item);
    li.addEventListener("click", () => select(item));
    thumbnail(item, li.querySelector("canvas"));
    list.append(li);
  }
  renderProblems();
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
}

const usedSources = () => new Set(catalog.items.flatMap((item) => (isBundle(item) ? [] : isComposite(item.sprite) ? item.sprite.layers.map((l) => l.src) : [item.sprite.src])));

async function renderSources() {
  const select = $("#source-dir");
  const dir = select.value;
  const label = select.selectedOptions[0]?.textContent ?? "";
  if (select.selectedOptions[0]?.hasAttribute("data-sheet")) return renderSheet(dir, label.replace(/ sheet$/, ""));
  const names = await (await fetch(`/api/files?dir=${encodeURIComponent(dir)}`)).json();
  const grid = $("#source-grid");
  grid.replaceChildren();
  const used = usedSources();
  for (const name of names) {
    const src = `${dir}/${name}`;
    const button = document.createElement("button");
    button.title = name;
    button.innerHTML = `<canvas></canvas><span></span>`;
    trimmedThumbnail(src, button.querySelector("canvas"));
    button.querySelector("span").textContent = name.match(/(\d+)\.png$/)?.[1] ?? "";
    if (used.has(src)) button.dataset.used = "";
    button.addEventListener("click", () => fromSource(src, label.replace(/ singles$/, "")));
    grid.append(button);
  }
}

/**
 * A whole sheet to cut from: drag a rectangle round an object and it becomes
 * an item, trimmed to its pixels on the 16px grid. What's already cut from the
 * sheet is outlined.
 */
async function renderSheet(src, label) {
  const img = await image(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.className = "sheet";
  canvas.style.width = `${img.width * Math.min(1, 512 / img.width)}px`;
  $("#source-grid").replaceChildren(canvas);
  const context = canvas.getContext("2d");
  let drag = null;
  const normalize = ({ x0, y0, x1, y1 }) => {
    const ax = down16(Math.min(x0, x1)), ay = down16(Math.min(y0, y1));
    return [ax, ay, Math.max(16, up16(Math.max(x0, x1)) - ax), Math.max(16, up16(Math.max(y0, y1)) - ay)];
  };
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);
    context.strokeStyle = "rgba(48,164,108,0.9)";
    for (const item of catalog.items) {
      if (isBundle(item)) continue;
      const cuts = isComposite(item.sprite) ? item.sprite.layers : [item.sprite];
      for (const cut of cuts.filter((c) => c.src === src)) context.strokeRect(cut.rect[0] + 0.5, cut.rect[1] + 0.5, cut.rect[2] - 1, cut.rect[3] - 1);
    }
    if (drag) {
      context.strokeStyle = "#e5484d";
      const [x, y, w, h] = normalize(drag);
      context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  };
  const at = (event) => {
    const r = canvas.getBoundingClientRect();
    return [((event.clientX - r.left) / r.width) * canvas.width, ((event.clientY - r.top) / r.height) * canvas.height];
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
  const [x, y, w, h] = opaque(pixels(img, [0, 0, img.width, img.height])) ?? [0, 0, img.width, img.height];
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
    row.append(
      numberInput(value, (v) => {
        rect[index] = v;
        changed();
      }),
    ),
  );
  if (onRemove) row.append(removeButton(onRemove));
  return row;
}

function itemSelect(value, filter, onChange) {
  const select = document.createElement("select");
  for (const item of catalog.items.filter(filter)) select.add(new Option(item.name ? `${item.name} (${item.id})` : item.id, item.id));
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function renderProps() {
  const form = $("#props");
  form.hidden = !current;
  $("#prop-title").textContent = current ? current.name || current.id : "No item";
  if (!current) return;
  const item = current;
  const bundle = isBundle(item);
  $("#item-fields").hidden = bundle;
  $("#bundle-fields").hidden = !bundle;
  document.querySelectorAll(".item-only").forEach((el) => (el.hidden = bundle));
  form.id.value = item.id;
  form.name.value = item.name;
  form.category.value = item.category;
  form.themes.value = item.themes.join(", ");
  form.notes.value = item.notes ?? "";
  if (bundle) return renderParts();
  form.mount.value = item.mount;
  form.part.checked = !!item.part;
  form.sortY.value = item.sortY;
  const layered = isComposite(item.sprite);
  $("#sprite-rect").hidden = layered;
  $("#sprite-src").textContent = layered ? `${item.sprite.layers.length} layers, ${item.sprite.size.join("×")}` : item.sprite.src;
  if (!layered) [form.rx.value, form.ry.value, form.rw.value, form.rh.value] = item.sprite.rect;
  form.flip.checked = !!item.sprite.flip;
  renderShapes();
}

function renderShapes() {
  const item = current;
  if (isBundle(item)) return;
  $("#colliders").replaceChildren(
    ...item.colliders.map((rect, index) =>
      rectRow(rect, () => {
        item.colliders.splice(index, 1);
        renderShapes();
        changed();
      }),
    ),
  );
  $("#seats").replaceChildren(
    ...item.seats.map((seat, index) => {
      const row = document.createElement("div");
      row.className = "seat";
      row.append(
        numberInput(seat.x, (v) => ((seat.x = v), changed())),
        numberInput(seat.y, (v) => ((seat.y = v), changed())),
      );
      const dir = document.createElement("select");
      for (const d of SEAT_DIRECTIONS) dir.add(new Option(d, d));
      dir.value = seat.dir;
      dir.addEventListener("change", () => ((seat.dir = dir.value), changed()));
      row.append(dir, removeButton(() => (item.seats.splice(index, 1), renderShapes(), changed())));
      return row;
    }),
  );
  $("#surface").replaceChildren(...(item.surface ? [rectRow(item.surface, null)] : []));
  $("#toggle-surface").textContent = item.surface ? "Remove" : "Add";
}

/** A bundle's parts: each an item at a place, or a slot of interchangeable items (the chair). */
function renderParts() {
  const item = current;
  const chairs = (candidate) => candidate.seats?.length === 1 && candidate.seats[0].dir === "up";
  $("#parts").replaceChildren(
    ...item.parts.map((part, index) => {
      const row = document.createElement("div");
      row.className = "part";
      const remove = removeButton(() => {
        item.parts.splice(index, 1);
        renderParts();
        changed();
      });
      const at = [numberInput(part.at[0], (v) => ((part.at[0] = v), changed())), numberInput(part.at[1], (v) => ((part.at[1] = v), changed()))];
      if (!part.slot) {
        row.append(itemSelect(part.item, (i) => !isBundle(i), (v) => ((part.item = v), changed())), ...at, remove);
        return row;
      }
      const label = document.createElement("b");
      label.textContent = `${part.slot} slot`;
      const options = document.createElement("div");
      options.className = "options";
      for (const candidate of catalog.items.filter(chairs)) {
        const box = Object.assign(document.createElement("label"), { className: "inline" });
        const input = Object.assign(document.createElement("input"), { type: "checkbox", checked: part.options.includes(candidate.id) });
        input.addEventListener("change", () => {
          part.options = input.checked ? [...part.options, candidate.id] : part.options.filter((id) => id !== candidate.id);
          if (!part.options.includes(part.default)) part.default = part.options[0];
          renderParts();
          changed();
        });
        box.append(input, candidate.name ? `${candidate.name} (${candidate.id})` : candidate.id);
        options.append(box);
      }
      row.append(label, ...at, remove, options);
      return row;
    }),
  );
  const slot = item.parts.find((part) => part.slot === "chair");
  const preview = $("#preview-chair");
  preview.replaceChildren(...(slot?.options ?? []).map((id) => new Option(byId.get(id)?.name ? `${byId.get(id).name} (${id})` : id, id)));
  preview.value = choose.chair ?? slot?.default ?? "";
  preview.parentElement.hidden = !slot;
}

function bindForm() {
  const form = $("#props");
  form.addEventListener("input", (event) => {
    const item = current;
    if (!item || event.target.closest("#parts")) return;
    const { name, value } = event.target;
    if (name === "id") {
      const id = slug(value);
      if (!id || byId.has(id)) return;
      const li = document.querySelector(`#item-list li[data-id="${CSS.escape(item.id)}"]`);
      // A renamed item keeps its place in every bundle that holds it.
      for (const other of catalog.items) {
        for (const part of other.parts ?? []) {
          if (part.item === item.id) part.item = id;
          if (part.options?.includes(item.id)) part.options = part.options.map((o) => (o === item.id ? id : o));
          if (part.default === item.id) part.default = id;
        }
      }
      item.id = id;
      reindex();
      if (li) li.dataset.id = id;
    } else if (name === "name") item.name = value;
    else if (name === "category") item.category = value;
    else if (name === "mount") item.mount = value;
    else if (name === "themes") item.themes = value.split(",").map((t) => t.trim()).filter(Boolean);
    else if (name === "notes") item.notes = value;
    else if (name === "sortY") item.sortY = Number(value);
    else if (name === "part") item.part = event.target.checked || undefined;
    else if (name === "flip") item.sprite.flip = event.target.checked || undefined;
    else if (["rx", "ry", "rw", "rh"].includes(name)) item.sprite.rect[["rx", "ry", "rw", "rh"].indexOf(name)] = Number(value);
    else return;
    $("#prop-title").textContent = item.name || item.id;
    changed();
  });
  $("#add-collider").addEventListener("click", () => {
    const [w, h] = spriteSize(current.sprite);
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
    const [w, h] = spriteSize(current.sprite);
    current.seats.push({ x: w / 2, y: h - 2, dir: "up" });
    renderShapes();
    changed();
  });
  $("#toggle-surface").addEventListener("click", () => {
    const [w] = spriteSize(current.sprite);
    current.surface = current.surface ? null : [2, 2, w - 4, 16];
    renderShapes();
    changed();
  });
  $("#add-part").addEventListener("click", () => {
    const first = catalog.items.find((i) => !isBundle(i));
    current.parts.push({ item: first.id, at: [0, 0] });
    renderParts();
    changed();
  });
  $("#add-slot").addEventListener("click", () => {
    if (current.parts.some((p) => p.slot === "chair")) return;
    const chairs = catalog.items.filter((i) => i.seats?.length === 1 && i.seats[0].dir === "up").map((i) => i.id);
    current.parts.push({ slot: "chair", at: [0, 32], options: chairs, default: chairs[0] });
    renderParts();
    changed();
  });
  $("#preview-chair").addEventListener("change", (event) => {
    choose = { chair: event.target.value };
    scene?.rebuild();
  });
  $("#new-bundle").addEventListener("click", newBundle);
  $("#duplicate").addEventListener("click", () => {
    const copy = structuredClone(current);
    copy.id = uniqueId(current.id);
    add(copy);
  });
  $("#delete").addEventListener("click", () => {
    const users = catalog.items.filter((i) => i.parts?.some((p) => p.item === current.id || p.options?.includes(current.id)));
    if (users.length) return alert(`${current.id} is part of ${users.map((u) => u.id).join(", ")}; take it out of those first.`);
    if (!confirm(`Delete ${current.id}?`)) return;
    catalog.items = catalog.items.filter((item) => item !== current);
    reindex();
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
  const step = (dx, dy) => {
    const [, , w, h] = bounds(byId, current.id, choose);
    const last = copies.at(-1) ?? { dx: 0, dy: 0 };
    copies.push({ dx: last.dx + dx * w, dy: last.dy + dy * h });
    scene?.rebuild();
  };
  $("#copy-right").addEventListener("click", () => step(1, 0));
  $("#copy-below").addEventListener("click", () => step(0, 1));
  $("#clear-copies").addEventListener("click", () => {
    copies = [];
    scene?.rebuild();
  });
  addEventListener("beforeunload", (event) => dirty && event.preventDefault());
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
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) this.floor.fillStyle((x + y) % 2 ? 0xd9d5cc : 0xe2ded5, 1).fillRect(x * TILE, y * TILE, TILE, TILE);
    }
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

  /** Where the item or bundle sits on this floor: its top left, on the grid, about the middle. */
  origin() {
    const [bx, by, w, h] = bounds(byId, current.id, choose);
    return { x: down16(COLS * TILE * 0.5 - w / 2) - bx, y: down16(ROWS * TILE * 0.45 - h / 2) - by };
  }

  /** Everything drawn: each copy's pieces (a bundle's parts, or the item itself), with `main` on the first copy's. */
  pieces() {
    if (!current) return [];
    const { x, y } = this.origin();
    return [{ dx: 0, dy: 0 }, ...copies].flatMap((offset, index) =>
      expand(byId, current.id, x + offset.dx, y + offset.dy, choose).map((piece, n) => ({ ...piece, main: index === 0, n })),
    );
  }

  async rebuild() {
    const target = current;
    const pieces = this.pieces();
    const frames = await Promise.all(pieces.map((piece) => itemFrame(this, piece.item)));
    if (target !== current) return;
    this.placed.forEach((image) => image.destroy());
    this.placed = pieces.map((piece, i) =>
      this.add
        .image(piece.x, piece.y, frames[i].key, frames[i].frame)
        .setOrigin(0, 0)
        .setFlipX(!!piece.item.sprite.flip)
        .setDepth(piece.y + piece.item.sortY),
    );
    this.placedPieces = pieces;
    this.drawOverlays();
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
    const editable = current && !isBundle(current);
    for (const { item, x, y, main } of this.pieces()) {
      const [w, h] = spriteSize(item.sprite);
      g.lineStyle(1, 0xffffff, main ? 0.7 : 0.3).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      const handles = main && editable;
      if (show.colliders) {
        for (const [cx, cy, cw, ch] of item.colliders) {
          g.fillStyle(0xe5484d, 0.28).fillRect(x + cx, y + cy, cw, ch);
          g.lineStyle(1, 0xe5484d, 0.95).strokeRect(x + cx + 0.5, y + cy + 0.5, cw - 1, ch - 1);
          if (handles) g.fillStyle(0xe5484d, 1).fillRect(x + cx + cw - 3, y + cy + ch - 3, 4, 4);
        }
      }
      if (show.sort) {
        g.lineStyle(1, 0xf5b700, 1);
        for (let sx = x - 6; sx < x + w + 6; sx += 4) g.lineBetween(sx, y + item.sortY, sx + 2, y + item.sortY);
      }
      if (show.surface && item.surface) {
        const [sx, sy, sw, sh] = item.surface;
        g.lineStyle(1, 0x30a46c, 1).strokeRect(x + sx + 0.5, y + sy + 0.5, sw - 1, sh - 1);
        if (handles) g.fillStyle(0x30a46c, 1).fillRect(x + sx + sw - 3, y + sy + sh - 3, 4, 4);
      }
      if (show.seats) {
        for (const seat of item.seats) {
          const sx = x + seat.x, sy = y + seat.y;
          g.fillStyle(0x3e63dd, 1).fillCircle(sx, sy, 3);
          g.lineStyle(2, 0x3e63dd, 1).lineBetween(sx, sy, sx, sy + (seat.dir === "up" ? -10 : 10));
        }
      }
    }
  }

  /** The colliders of everything placed, in floor coordinates. */
  solids() {
    return this.pieces().flatMap(({ item, x, y }) => item.colliders.map(([cx, cy, cw, ch]) => [x + cx, y + cy, cw, ch]));
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
    let best = null;
    for (const { item, x, y } of this.pieces()) {
      for (const seat of item.seats) {
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

  // On an item, its shapes are dragged: a corner handle resizes, inside moves; seats and the sort line move too.
  // On a bundle, its parts are.
  pointerDown(pointer) {
    if (!current) return;
    if (isBundle(current)) {
      const hit = this.pieces()
        .filter((piece) => piece.main)
        .filter(({ item, x, y }) => {
          const [w, h] = spriteSize(item.sprite);
          return pointer.worldX >= x && pointer.worldX < x + w && pointer.worldY >= y && pointer.worldY < y + h;
        })
        .sort((a, b) => b.y + b.item.sortY - (a.y + a.item.sortY))[0];
      const part = hit && current.parts[hit.n];
      if (part) this.drag = { kind: "part", target: part, start: { px: pointer.worldX, py: pointer.worldY, at: [...part.at] } };
      return;
    }
    const { x, y } = this.origin();
    const px = pointer.worldX - x, py = pointer.worldY - y;
    const near = (a, b, r = 4) => Math.abs(a - b) <= r;
    const hit = ([rx, ry, rw, rh]) => {
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
    const fine = pointer.event.shiftKey;
    const snap = (v) => (fine ? Math.round(v) : Math.round(v / SNAP) * SNAP);
    if (drag.kind === "part") {
      // Parts stay on the floor's 16px grid, so a bundle lands on it whole.
      const dx = Math.round((pointer.worldX - drag.start.px) / 16) * 16, dy = Math.round((pointer.worldY - drag.start.py) / 16) * 16;
      const next = [drag.start.at[0] + dx, drag.start.at[1] + dy];
      if (next[0] === drag.target.at[0] && next[1] === drag.target.at[1]) return;
      drag.target.at = next;
      setDirty(true);
      return this.rebuild();
    }
    const { x, y } = this.origin();
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
    for (const [i, image] of this.placed.entries()) image.setDepth(this.placedPieces[i].y + this.placedPieces[i].item.sortY);
    this.drawOverlays();
  }

  pointerUp() {
    if (!this.drag) return;
    const kind = this.drag.kind;
    this.drag = null;
    if (kind === "part") renderParts();
    else renderShapes();
  }
}

bindForm();
// Kept on the window for driving the lab from a script: walking, sitting, screenshots.
window.lab = {
  scene: () => scene,
  catalog: () => catalog,
  select: (id) => select(byId.get(id)),
  add,
  reindex,
  save,
  choose: (value) => {
    choose = value;
    scene?.rebuild();
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
