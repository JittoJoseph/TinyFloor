// Every item in the catalog at once, drawn twice its size on a floor tile
// pattern with its colliders, sort line, seats and surface: one page to look
// over the whole catalog for anything cut or set wrong. ?category= or ?q= narrow it.
const SCALE = 2;
const params = new URLSearchParams(location.search);
const catalog = await (await fetch("/api/catalog")).json();
const query = params.get("q")?.toLowerCase();
const category = params.get("category");
const items = catalog.items.filter(
  (item) => (!category || item.category === category) && (!query || `${item.id} ${item.name}`.toLowerCase().includes(query)),
);
document.querySelector("#count").textContent = `${items.length} items`;

const images = new Map();
const image = (src) => {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `/pack/${src}`;
      }),
    );
  }
  return images.get(src);
};

for (const item of items) {
  const [x, y, w, h] = item.sprite.rect;
  const pad = 8;
  const canvas = document.createElement("canvas");
  canvas.width = (w + pad * 2) * SCALE;
  canvas.height = (h + pad * 2) * SCALE;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  c.scale(SCALE, SCALE);
  for (let ty = 0; ty < h + pad * 2; ty += 16) {
    for (let tx = 0; tx < w + pad * 2; tx += 16) {
      c.fillStyle = ((tx + ty) / 16) % 2 ? "#d9d5cc" : "#e2ded5";
      c.fillRect(tx, ty, 16, 16);
    }
  }
  c.save();
  if (item.sprite.flip) {
    c.translate(pad * 2 + w, 0);
    c.scale(-1, 1);
  }
  c.drawImage(await image(item.sprite.src), x, y, w, h, pad, pad, w, h);
  c.restore();
  c.lineWidth = 1 / SCALE;
  for (const [cx, cy, cw, ch] of item.colliders) {
    c.fillStyle = "rgba(229,72,77,0.28)";
    c.fillRect(pad + cx, pad + cy, cw, ch);
    c.strokeStyle = "#e5484d";
    c.strokeRect(pad + cx + 0.25, pad + cy + 0.25, cw - 0.5, ch - 0.5);
  }
  c.strokeStyle = "#f5b700";
  c.setLineDash([2, 1]);
  c.beginPath();
  c.moveTo(pad - 4, pad + item.sortY);
  c.lineTo(pad + w + 4, pad + item.sortY);
  c.stroke();
  c.setLineDash([]);
  if (item.surface) {
    const [sx, sy, sw, sh] = item.surface;
    c.strokeStyle = "#30a46c";
    c.strokeRect(pad + sx + 0.25, pad + sy + 0.25, sw - 0.5, sh - 0.5);
  }
  for (const seat of item.seats) {
    c.fillStyle = "#3e63dd";
    c.beginPath();
    c.arc(pad + seat.x, pad + seat.y, 2, 0, Math.PI * 2);
    c.fill();
    const [vx, vy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[seat.dir];
    c.strokeStyle = "#3e63dd";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(pad + seat.x, pad + seat.y);
    c.lineTo(pad + seat.x + vx * 7, pad + seat.y + vy * 7);
    c.stroke();
    c.lineWidth = 1 / SCALE;
  }
  const figure = document.createElement("figure");
  figure.innerHTML = `<figcaption><b></b><small></small></figcaption>`;
  figure.prepend(canvas);
  figure.querySelector("b").textContent = item.id;
  figure.querySelector("small").textContent = `${item.category} · ${item.mount} · ${w}×${h}`;
  figure.addEventListener("click", () => window.open(`/lab/index.html?item=${encodeURIComponent(item.id)}`, "lab"));
  document.querySelector("#items").append(figure);
}
