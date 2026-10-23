// Characters compared on a patch of floor, at the floor's scale: the pack's
// earlier characters at 16px (what the floor draws) and at 32px, and the
// character generator's premades at 32px and 16px. Each walks or stands at a
// chosen zoom, drawn in whole pixels.
const C = "/pack/moderninteriors/2_Characters";
const LEGACY = `${C}/Old/Single_Characters_Legacy`;
const GEN = `${C}/Character_Generator/0_Premade_Characters`;
const OURS = ["Adam", "Alex", "Amelia", "Ash", "Bob", "Dan", "Lucy", "Molly"];
const MORE = ["Bruce", "Samuel", "Edward", "Rob", "Roki", "Pier", "Conference_man", "Conference_woman", "Old_man_Josh", "Old_woman_Jenny", "Doctor_1", "Nurse_1", "Chef_Lucy", "Bouncer"];
const DIRS = ["right", "up", "left", "down"];

/** A character's frames: idle and walking, six a direction, from wherever the pack keeps them. */
const legacy = (name, size) => ({
  name: name.replace(/_/g, " "),
  size,
  idle: { url: `${LEGACY}/${size}x${size}/${name}_idle_anim_${size}x${size}.png`, y: 0 },
  walk: { url: `${LEGACY}/${size}x${size}/${name}_run_${size}x${size}.png`, y: 0 },
});
const generated = (n, size) => {
  const id = String(n).padStart(2, "0");
  const url = size === 16 ? `${GEN}/16x16/Premade_Character_${id}.png` : `${GEN}/32x32/Premade_Character_32x32_${id}.png`;
  return { name: `Premade ${id}`, size, idle: { url, y: size * 2 }, walk: { url, y: size * 4 } };
};
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
/** What the lab builds (characters.mjs): strips of 48 frames, idle then walking, one picture or a look's layers. */
const strips = (name, urls) => ({ name, size: 32, idle: { urls, x0: 0 }, walk: { urls, x0: 24 } });
const PARTS = ["body", "eyes", "outfit", "hair", "face", "glasses", "hat", "gloves", "bag"];
const layers = (look) =>
  look.split("/").map((token) => token.split(".")).sort((a, b) => PARTS.indexOf(a[0]) - PARTS.indexOf(b[0])).map(([part, id]) => `/private/characters/parts/${part}/${id}.png`);
const catalog = await (await fetch("/shared-protocol/src/catalog/characters.json")).json();

const ROWS = [
  { title: "Presets, as the floor will draw them", list: Object.keys(catalog.presets).map((id) => strips(id, [`/private/characters/presets/${id}.png`])) },
  { title: "The look nearest each preset: where changing a part starts", list: Object.entries(catalog.presets).map(([id, { nearest }]) => strips(id, layers(nearest))) },
  { title: "The generator's premades, as looks", list: catalog.starts.map((look, n) => strips(`Look ${n + 1}`, layers(look))) },
  { title: "Ours today: the earlier characters at 16px, drawn twice their size", list: OURS.map((n) => legacy(n, 16)) },
  { title: "The same characters at 32px", list: OURS.map((n) => legacy(n, 32)) },
  { title: "More of the earlier characters at 32px", list: MORE.map((n) => legacy(n, 32)) },
  { title: "The generator's premades at 32px", list: range(20).map((n) => generated(n, 32)) },
  { title: "The generator's premades at 16px, drawn twice their size", list: range(20).map((n) => generated(n, 16)) },
];

const images = new Map();
const image = (url) => {
  if (!images.has(url)) images.set(url, new Promise((resolve) => Object.assign(new Image(), { onload() { resolve(this); }, onerror() { resolve(null); }, src: url })));
  return images.get(url);
};

let zoom = 2;
let motion = "walk";
const cells = [];

function bar(id, options, value, set) {
  const el = document.getElementById(id);
  const render = () =>
    el.replaceChildren(
      ...options.map(([v, label]) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.setAttribute("aria-pressed", String(v === value()));
        b.onclick = () => {
          set(v);
          render();
          layout();
        };
        return b;
      }),
    );
  render();
}
bar("zoom", [[1, "1×"], [1.5, "1.5×"], [2, "2×"], [3, "3×"]], () => zoom, (v) => (zoom = v));
bar("motion", [["walk", "Walking"], ["idle", "Standing"], ["turn", "Turning"]], () => motion, (v) => (motion = v));

function layout() {
  const rows = document.getElementById("rows");
  rows.replaceChildren();
  cells.length = 0;
  rows.style.setProperty("--tile", `${32 * zoom}px`);
  for (const row of ROWS) {
    const h = document.createElement("h2");
    h.textContent = row.title;
    const patch = document.createElement("div");
    patch.className = "row";
    patch.style.setProperty("--tile", `${32 * zoom}px`);
    for (const character of row.list) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const canvas = document.createElement("canvas");
      // A cell is a tile and a half wide and two tiles tall, in the floor's pixels.
      const scale = (32 / character.size) * zoom * devicePixelRatio;
      canvas.width = Math.round(character.size * 1.5 * scale);
      canvas.height = Math.round(character.size * 2 * scale);
      canvas.style.width = `${canvas.width / devicePixelRatio}px`;
      canvas.style.height = `${canvas.height / devicePixelRatio}px`;
      const label = document.createElement("small");
      label.textContent = character.name;
      cell.append(canvas, label);
      patch.append(cell);
      cells.push({ character, canvas, scale });
    }
    rows.append(h, patch);
  }
}

let tick = 0;
async function draw() {
  for (const { character, canvas, scale } of cells) {
    const kind = motion === "idle" ? character.idle : character.walk;
    const sheets = await Promise.all((kind.urls ?? [kind.url]).map(image));
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const dir = motion === "turn" ? Math.floor(tick / 12) % 4 : 3;
    const frame = (kind.x0 ?? 0) + dir * 6 + (tick % 6);
    const s = character.size;
    const w = s * scale;
    for (const sheet of sheets) {
      if (sheet) context.drawImage(sheet, frame * s, kind.y ?? 0, s, s * 2, Math.round((canvas.width - w) / 2), 0, Math.round(w), Math.round(s * 2 * scale));
    }
  }
  tick++;
}

layout();
setInterval(draw, 110);
