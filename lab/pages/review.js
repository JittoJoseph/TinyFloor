// Every item in the catalog at once, drawn twice its size on a floor tile
// pattern with its colliders, sort lines, seats and surfaces, and the house
// rules' verdict at the top: one page to look the whole catalog over.
// ?category= or ?q= narrow it.
import { drawSprite } from "./common.js";
import { bounds, check, expand, isBundle, spriteSize } from "./catalog.js";

const SCALE = 2;
const PAD = 8;
const params = new URLSearchParams(location.search);
const catalog = await (await fetch("/api/catalog")).json();
const byId = new Map(catalog.items.map((item) => [item.id, item]));
const query = params.get("q")?.toLowerCase();
const category = params.get("category");
const items = catalog.items.filter(
  (item) => (!category || item.category === category) && (!query || `${item.id} ${item.name}`.toLowerCase().includes(query)),
);
const problems = check(catalog);
document.querySelector("#count").textContent = `${items.length} items · ${problems.length ? `${problems.length} problems` : "no problems"}`;
document.querySelector("#problems").replaceChildren(...problems.map((text) => Object.assign(document.createElement("li"), { textContent: text })));

for (const item of items) {
  const [bx, by, w, h] = bounds(byId, item.id);
  const canvas = document.createElement("canvas");
  canvas.width = (w + PAD * 2) * SCALE;
  canvas.height = (h + PAD * 2) * SCALE;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.scale(SCALE, SCALE);
  for (let ty = 0; ty < h + PAD * 2; ty += 16) {
    for (let tx = 0; tx < w + PAD * 2; tx += 16) {
      c.fillStyle = ((tx + ty) / 16) % 2 ? "#d9d5cc" : "#e2ded5";
      c.fillRect(tx, ty, 16, 16);
    }
  }
  const pieces = expand(byId, item.id, PAD - bx, PAD - by).sort((a, b) => a.y + a.item.sortY - (b.y + b.item.sortY));
  for (const { item: piece, x, y } of pieces) await drawSprite(c, piece.sprite, x, y);
  c.lineWidth = 1 / SCALE;
  for (const { item: piece, x, y } of pieces) {
    const [pw] = spriteSize(piece.sprite);
    for (const [cx, cy, cw, ch] of piece.colliders) {
      c.fillStyle = "rgba(229,72,77,0.28)";
      c.fillRect(x + cx, y + cy, cw, ch);
      c.strokeStyle = "#e5484d";
      c.strokeRect(x + cx + 0.25, y + cy + 0.25, cw - 0.5, ch - 0.5);
    }
    c.strokeStyle = "#f5b700";
    c.setLineDash([2, 1]);
    c.beginPath();
    c.moveTo(x - 4, y + piece.sortY);
    c.lineTo(x + pw + 4, y + piece.sortY);
    c.stroke();
    c.setLineDash([]);
    if (piece.surface) {
      const [sx, sy, sw, sh] = piece.surface;
      c.strokeStyle = "#30a46c";
      c.strokeRect(x + sx + 0.25, y + sy + 0.25, sw - 0.5, sh - 0.5);
    }
    for (const seat of piece.seats) {
      c.fillStyle = "#3e63dd";
      c.beginPath();
      c.arc(x + seat.x, y + seat.y, 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#3e63dd";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + seat.x, y + seat.y);
      c.lineTo(x + seat.x, y + seat.y + (seat.dir === "up" ? -7 : 7));
      c.stroke();
      c.lineWidth = 1 / SCALE;
    }
  }
  const figure = document.createElement("figure");
  figure.innerHTML = `<figcaption><b></b><small></small></figcaption>`;
  figure.prepend(canvas);
  figure.querySelector("b").textContent = item.id;
  figure.querySelector("small").textContent = isBundle(item)
    ? `bundle · ${item.parts.map((p) => p.slot ? `${p.slot} (${p.options.length})` : p.item).join(" + ")}`
    : `${item.part ? "part" : item.category} · ${item.mount} · ${w}×${h}`;
  figure.addEventListener("click", () => window.open(`/lab/index.html?item=${encodeURIComponent(item.id)}`, "lab"));
  document.querySelector("#items").append(figure);
}
