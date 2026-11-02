// What the lab's pages share in the browser: the floor's numbers for walking
// and sitting, the test character, and drawing items, single, layered or bundled.
/* global Phaser */
import { depthOf, expand, isComposite, spriteSize } from "./catalog.js";
import { drawn } from "./art.js";

export const TILE = 32;
export const SPEED = 120; // the floor's MOVEMENT_SPEED
// A preset as the floor has it: one strip of 32×64 frames, idle then walking (lab/characters.mjs).
export const AVATAR = "/private/characters/presets/Adam.png";

// The character strip: 24 idle, 24 run (the floor adds the seated poses; the lab sits in its idle frame).
export const DIRECTIONS = ["right", "up", "left", "down"];
// Sitting, the lab shows the idle frame facing that way: the strip has no seated poses.
export const SIT_FRAME = { right: 0, up: 6, left: 12, down: 18 };
// Where a seated character sits against its chair, from SeatManager's SEAT.
export const SEAT = {
  down: { dx: 0, dy: -12, depth: -0.5, exit: -54 },
  up: { dx: 0, dy: -32, depth: -2, exit: 20 },
  left: { dx: 0, dy: -20, depth: 2, exit: 20 },
  right: { dx: 0, dy: -20, depth: 2, exit: 20 },
};

export const down16 = (v) => Math.floor(v / 16) * 16;
export const up16 = (v) => Math.ceil(v / 16) * 16;

const images = new Map();
/** A pack image, loaded once. */
export function image(src) {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = `/pack/${src}`;
      }),
    );
  }
  return images.get(src);
}

export function loadAvatar(scene) {
  scene.load.spritesheet("avatar", AVATAR, { frameWidth: 32, frameHeight: 64 });
}

export function avatarAnims(scene) {
  for (const [index, dir] of DIRECTIONS.entries()) {
    for (const [state, base] of [["idle", 0], ["run", 24]]) {
      if (scene.anims.exists(`${state}-${dir}`)) continue;
      scene.anims.create({
        key: `${state}-${dir}`,
        frames: scene.anims.generateFrameNumbers("avatar", { start: base + index * 6, end: base + index * 6 + 5 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}

/** A drawn layer's picture (art.js) as a canvas. */
function drawnCanvas(name, width, height) {
  const { data } = drawn(name, width, height);
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [width, height];
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

/** A layer's cut with some of its colours swapped ({ "#rrggbb": "#rrggbb" }), on a canvas of its own. */
function recolor(from, [sx, sy, sw, sh], swaps) {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  context.drawImage(from, sx, sy, sw, sh, 0, 0, sw, sh);
  const pixels = context.getImageData(0, 0, sw, sh);
  const to = new Map(Object.entries(swaps).map(([a, b]) => [a.toLowerCase(), b]));
  for (let i = 0; i < pixels.data.length; i += 4) {
    const hex = "#" + [0, 1, 2].map((n) => pixels.data[i + n].toString(16).padStart(2, "0")).join("");
    const swap = to.get(hex);
    if (swap) for (let n = 0; n < 3; n++) pixels.data[i + n] = parseInt(swap.slice(1 + n * 2, 3 + n * 2), 16);
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/** Draws a sprite (one cut, or layers of cuts) with its top left at x, y. */
export async function drawSprite(context, sprite, x, y, scale = 1) {
  const [w, h] = spriteSize(sprite);
  context.save();
  context.imageSmoothingEnabled = false;
  context.translate(x, y);
  context.scale(scale, scale);
  if (sprite.flip) {
    context.translate(w, 0);
    context.scale(-1, 1);
  }
  const layers = isComposite(sprite) ? sprite.layers : [{ src: sprite.src, rect: sprite.rect, at: [0, 0] }];
  for (const layer of layers) {
    const [sx, sy, sw, sh] = layer.rect;
    const from = layer.draw ? drawnCanvas(layer.draw, sx + sw, sy + sh) : await image(layer.src);
    context.drawImage(layer.recolor ? recolor(from, layer.rect, layer.recolor) : from, layer.recolor ? 0 : sx, layer.recolor ? 0 : sy, sw, sh, layer.at[0], layer.at[1], sw, sh);
  }
  context.restore();
}

/** Draws a catalog item, a bundle's or cluster's pieces back to front, with its top left at x, y. */
export async function drawItem(context, byId, id, x, y, scale = 1, choose = {}, place = {}) {
  const all = expand(byId, id, 0, 0, choose, place);
  const pieces = all.map((piece) => ({ piece, depth: depthOf(piece, all) })).sort((a, b) => a.depth - b.depth).map(({ piece }) => piece);
  for (const piece of pieces) await drawSprite(context, piece.item.sprite, x + piece.x * scale, y + piece.y * scale, scale);
}

/**
 * The item's sprite as a texture frame: { key, frame }. One cut is a frame of
 * its sheet; layers are drawn once into a canvas texture of their own.
 */
export async function itemFrame(scene, item) {
  const sprite = item.sprite;
  if (isComposite(sprite)) {
    const key = `layers:${item.id}:${hash(JSON.stringify(sprite))}`;
    if (!scene.textures.exists(key)) {
      const canvas = document.createElement("canvas");
      [canvas.width, canvas.height] = sprite.size;
      await drawSprite(canvas.getContext("2d"), { ...sprite, flip: false }, 0, 0);
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
    }
    return { key, frame: undefined };
  }
  const key = sprite.src;
  if (!scene.textures.exists(key)) {
    await new Promise((resolve) => {
      scene.load.image(key, `/pack/${key}`);
      scene.load.once("complete", resolve);
      scene.load.start();
    });
  }
  const frame = sprite.rect.join(",");
  const texture = scene.textures.get(key);
  if (!texture.has(frame)) texture.add(frame, 0, ...sprite.rect);
  return { key, frame };
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Arrow and WASD input as a direction, nothing while you're typing in a field. */
export function heldDirection(keys) {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return { dx: 0, dy: 0 };
  const dx = (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
  const dy = (keys.S.isDown || keys.DOWN.isDown ? 1 : 0) - (keys.W.isDown || keys.UP.isDown ? 1 : 0);
  return { dx, dy };
}
