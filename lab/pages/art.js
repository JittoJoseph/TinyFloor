// Things drawn rather than cut from a pack: the packs have no office windows,
// so they are drawn here, in the walls' own style (two pixels per art pixel,
// outlined in #3a3a50, white frames like the walls' tops). The same code draws
// them in the lab (into a canvas) and in the build (into the atlas), so a
// drawn layer is just another layer: { draw: "window", rect, at }.

const ART = 2;
const OUTLINE = [0x3a, 0x3a, 0x50];
const FRAME = [0xf8, 0xf8, 0xf8];
const FRAME_SHADE = [0xd2, 0xd2, 0xde];
const GLASS = [[0xcf, 0xea, 0xf5], [0xbd, 0xe2, 0xf1], [0xab, 0xd8, 0xec], [0x9c, 0xcd, 0xe6]];
const GLASS_SHADOW = [0x86, 0xb4, 0xd0];
const SHINE = [0xee, 0xf8, 0xfc];
const SLAT = [0xee, 0xea, 0xe0];
const SLAT_SHADE = [0xcd, 0xc6, 0xb6];

/**
 * A drawn picture, w×h pixels: { width, height, data } (RGBA). "window" is a
 * window in a wall's face, a pane to every tile across; "window-blinds" the
 * same with its blinds part way down. Either fills a wall's face: two tiles
 * tall, the cap above it left clear.
 */
export function drawn(name, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  const aw = width / ART;
  const put = (ax, ay, [r, g, b]) => {
    for (let dy = 0; dy < ART; dy++) {
      for (let dx = 0; dx < ART; dx++) {
        const o = ((ay * ART + dy) * width + ax * ART + dx) * 4;
        data.set([r, g, b, 255], o);
      }
    }
  };
  if (name === "window" || name === "window-blinds") drawWindow(put, aw, name === "window-blinds");
  return { width, height, data };
}

/** Art rows of a window in a wall's face: under the cap (rows 0-5) and clear of the face's foot. */
const TOP = 9, BOTTOM = 26;

function drawWindow(put, aw, blinds) {
  const left = 2, right = aw - 3;
  // Frame: the outline, then white inside it, a bar between panes at every tile.
  for (let y = TOP; y <= BOTTOM; y++) {
    for (let x = left; x <= right; x++) {
      const edge = y === TOP || y === BOTTOM || x === left || x === right;
      put(x, y, edge ? OUTLINE : FRAME);
    }
  }
  // A pane to every tile, split by bars two art pixels wide, as evenly as the width allows.
  const count = Math.round(aw / 16);
  const inner = right - 2 - (left + 2) + 1 - 2 * (count - 1);
  const panes = [];
  for (let n = 0, x = left + 2; n < count; n++) {
    const w = Math.floor(inner / count) + (n < inner % count ? 1 : 0);
    panes.push([x, x + w - 1]);
    x += w + 2;
  }
  const shut = blinds ? 7 : 0;
  for (const [n, [x0, x1]] of panes.entries()) {
    for (let y = TOP + 2; y <= BOTTOM - 2; y++) {
      const row = y - (TOP + 2);
      const rows = BOTTOM - 2 - (TOP + 2);
      for (let x = x0; x <= x1; x++) {
        if (row < shut) {
          put(x, y, row === shut - 1 ? SLAT_SHADE : row % 2 ? SLAT_SHADE : SLAT);
          continue;
        }
        // The frame's shadow along the glass's top and left; the sky lighter at the top.
        if (row === shut || x === x0) put(x, y, GLASS_SHADOW);
        else put(x, y, GLASS[Math.min(GLASS.length - 1, Math.floor((row * GLASS.length) / (rows + 1)))]);
      }
      // Two streaks of light across each pane, leaning right, as the packs draw glass.
      const at = x1 - (y - TOP) - 3 - ((n * 5) % 4);
      if (row > shut) for (const x of [at, at + 1, at + 4]) if (x > x0 && x <= x1) put(x, y, SHINE);
    }
    // A pull cord on the blinds.
    if (blinds) put(x1 - 1, TOP + 2 + shut, OUTLINE);
  }
  // The bars between panes, shaded on their right.
  for (const [, x1] of panes.slice(0, -1)) for (let y = TOP + 2; y <= BOTTOM - 2; y++) put(x1 + 2, y, FRAME_SHADE);
  // The sill: a white ledge a little wider than the frame, outlined.
  for (let x = left - 1; x <= right + 1; x++) {
    put(x, BOTTOM, x === left - 1 || x === right + 1 ? OUTLINE : FRAME);
    put(x, BOTTOM + 1, OUTLINE);
  }
  for (let x = left + 1; x < right; x++) put(x, BOTTOM - 1, FRAME_SHADE);
}
