// Things drawn rather than cut from a pack (windows, trees, rocks, flowers,
// the single desks, the grounds' tiles) are ours and not open: their code
// lives with the packs, in assets-pack/drawn/art.js, out of git, and what it
// draws reaches the floor only baked, through R2 (the atlas and the floor
// sheet). This loads it, in the build (Node) and in the lab (the browser,
// where the lab serves assets-pack/ as /pack/); without the packs, nothing
// drawn can be built, as nothing cut can.

const source = typeof window === "undefined" ? new URL("../../assets-pack/drawn/art.js", import.meta.url).href : "/pack/drawn/art.js";
const art = await import(source).catch(() => null);

/** A drawn picture, w×h pixels: { width, height, data } (RGBA). */
export function drawn(name, width, height) {
  if (!art) throw new Error(`can't draw ${name}: the drawn art isn't here (assets-pack/drawn/art.js)`);
  return art.drawn(name, width, height);
}

/** The grounds' tiles for the floor sheet (shell.ts GROUND_TILES). */
export function groundTiles(layout) {
  if (!art) throw new Error("can't draw the grounds: the drawn art isn't here (assets-pack/drawn/art.js)");
  return art.groundTiles(layout);
}
