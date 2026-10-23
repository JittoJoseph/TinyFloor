// A character creator from the pack's character generator: a body, eyes, an
// outfit, a hairstyle and an accessory, each a sheet laid over the last in that
// order, every sheet on the same grid of 32x64 frames. Pick a style, then its
// colour; the preview walks, stands and sits in all four directions.
const G = "moderninteriors/2_Characters/Character_Generator";
const FRAME_W = 32;
const FRAME_H = 64;
// Rows of the generator's sheets: idle, walk, sit (see Spritesheet_animations_GUIDE.png).
const ROW = { idle: 1, walk: 2 };
// Each row runs right, up, left, down; idle and walk take six frames a direction.
// Sitting is drawn from the side only (right, then left); facing up or down, a seated
// character is their standing pose, as the floor's own characters are (tools/buildcharacters.py).
const SIT = { right: [0, 4], left: [6, 4], up: [6, 1], down: [18, 1] };
const DIRS = ["right", "up", "left", "down"];
const SCALE = 2;
// The character fills the lower 48px of each 64px frame; the band above is for tall hats and hair.
const TOP = 12;
const SHOWN = FRAME_H - TOP;

const $ = (selector) => document.querySelector(selector);
const files = async (dir) => (await fetch(`/api/files?dir=${encodeURIComponent(`${G}/${dir}/32x32`)}`)).json();

/**
 * The parts, each as styles of colours: Outfit_07_32x32_03 is outfit 7 in its
 * third colour. Bodies and eyes are one style in many colours.
 */
const PARTS = [
  { key: "body", label: "Skin", dir: "Bodies", parse: (n) => ["skin", n.match(/_(\d+)\.png$/)[1]], required: true },
  { key: "eyes", label: "Eyes", dir: "Eyes", parse: (n) => ["eyes", n.match(/_(\d+)\.png$/)[1]], required: true },
  { key: "outfit", label: "Outfit", dir: "Outfits", parse: (n) => n.match(/Outfit_(\d+)_32x32_(\d+)/).slice(1), required: true },
  { key: "hair", label: "Hair", dir: "Hairstyles", parse: (n) => n.match(/Hairstyle_(\d+)_32x32_(\d+)/).slice(1) },
  { key: "accessory", label: "Accessory", dir: "Accessories", parse: (n) => n.match(/Accessory_(\d+_[A-Za-z_]+?)_32x32_(\d+)/).slice(1) },
];

const catalog = {};
for (const part of PARTS) {
  const styles = new Map();
  for (const name of await files(part.dir)) {
    const parsed = part.parse(name);
    if (!parsed) continue;
    const [style, colour] = parsed;
    if (!styles.has(style)) styles.set(style, []);
    styles.get(style).push({ colour, src: `${G}/${part.dir}/32x32/${name}` });
  }
  catalog[part.key] = styles;
}

const images = new Map();
const image = (src) => {
  if (!images.has(src)) images.set(src, new Promise((resolve) => Object.assign(new Image(), { onload() { resolve(this); }, src: `/pack/${src}` })));
  return images.get(src);
};

const choice = {};
const pick = (part, style, index = 0) => {
  const colours = catalog[part].get(style);
  choice[part] = style == null ? null : { style, index: Math.min(index, colours.length - 1) };
};
const randomize = () => {
  for (const part of PARTS) {
    const styles = [...catalog[part.key].keys()];
    if (!part.required && Math.random() < (part.key === "accessory" ? 0.75 : 0.08)) {
      choice[part.key] = null;
      continue;
    }
    const style = styles[Math.floor(Math.random() * styles.length)];
    pick(part.key, style, Math.floor(Math.random() * catalog[part.key].get(style).length));
  }
};
randomize();
// Kept to the faces people would pick for work.
pick("body", "skin", 0);

/** The chosen layers' sources, bottom first. */
const layers = (override = {}) =>
  PARTS.map((part) => {
    const c = part.key in override ? override[part.key] : choice[part.key];
    return c && catalog[part.key].get(c.style)[c.index].src;
  }).filter(Boolean);

/** One frame of the character, drawn layer by layer. */
async function drawFrame(canvas, srcs, col, row) {
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const src of srcs) {
    context.drawImage(await image(src), col * FRAME_W, row * FRAME_H + TOP, FRAME_W, SHOWN, 0, 0, canvas.width, canvas.height);
  }
}

let part = "outfit";
function renderParts() {
  $("#parts").replaceChildren(
    ...PARTS.map((p) => {
      const button = document.createElement("button");
      button.textContent = p.label;
      button.setAttribute("aria-selected", String(p.key === part));
      button.addEventListener("click", () => {
        part = p.key;
        renderParts();
        renderOptions();
      });
      return button;
    }),
  );
}

/** A swatch's colour: the most used opaque colour in a style's sheet, on the front-facing frame. */
async function swatchColour(src) {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W;
  canvas.height = SHOWN;
  await drawFrame(canvas, [src], 3, 0);
  const data = canvas.getContext("2d").getImageData(0, 0, FRAME_W, SHOWN).data;
  const counts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r + g + b < 120) continue; // outlines
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "200,200,200";
  return `rgb(${best})`;
}

async function renderOptions() {
  const styles = catalog[part];
  const current = choice[part];
  const swatches = $("#swatches");
  swatches.replaceChildren();
  if (current) {
    for (const [index, { src }] of styles.get(current.style).entries()) {
      const button = document.createElement("button");
      button.setAttribute("aria-pressed", String(index === current.index));
      button.title = `Colour ${index + 1}`;
      swatchColour(src).then((colour) => (button.style.background = colour));
      button.addEventListener("click", () => {
        pick(part, current.style, index);
        update();
      });
      swatches.append(button);
    }
  }
  const grid = $("#styles");
  grid.replaceChildren();
  const isPart = PARTS.find((p) => p.key === part);
  if (!isPart.required) {
    const none = document.createElement("button");
    none.textContent = "None";
    none.setAttribute("aria-pressed", String(!current));
    none.addEventListener("click", () => {
      choice[part] = null;
      update();
    });
    grid.append(none);
  }
  for (const [style] of styles) {
    const button = document.createElement("button");
    button.setAttribute("aria-pressed", String(current?.style === style));
    button.title = style;
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * 2;
    canvas.height = SHOWN * 2;
    button.append(canvas);
    // Each style shown on the character as they are now, in the colour they have if it exists.
    const index = current ? Math.min(current.index, styles.get(style).length - 1) : 0;
    drawFrame(canvas, layers({ [part]: { style, index } }), 3, 0);
    button.addEventListener("click", () => {
      pick(part, style, current?.index ?? 0);
      update();
    });
    grid.append(button);
  }
}

let mode = "walk";
const previews = [];
function buildStage() {
  const stage = $("#stage");
  stage.replaceChildren();
  for (const dir of DIRS) {
    const cell = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = FRAME_W * SCALE;
    canvas.height = SHOWN * SCALE;
    cell.append(canvas, Object.assign(document.createElement("small"), { textContent: dir }));
    stage.append(cell);
    previews.push({ dir, canvas });
  }
}

let tick = 0;
async function animate() {
  const srcs = layers();
  for (const [d, { canvas }] of previews.entries()) {
    if (mode === "sit") await drawFrame(canvas, srcs, ...SIT[DIRS[d]]);
    else await drawFrame(canvas, srcs, d * 6 + (tick % 6), mode === "walk" ? ROW.walk : ROW.idle);
  }
  tick++;
}

function update() {
  renderOptions();
  $("#recipe").textContent = JSON.stringify(Object.fromEntries(PARTS.map((p) => [p.key, choice[p.key] && `${choice[p.key].style}/${choice[p.key].index + 1}`])));
  animate();
}

$("#randomize").addEventListener("click", () => {
  randomize();
  update();
});
$("#mode").addEventListener("click", () => {
  mode = { walk: "idle", idle: "sit", sit: "walk" }[mode];
  $("#mode").textContent = { walk: "Walking", idle: "Standing", sit: "Sitting" }[mode];
  animate();
});

renderParts();
buildStage();
update();
setInterval(animate, 110);
