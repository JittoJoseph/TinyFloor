// What the item lab and the layout editor share: the floor's numbers for
// walking and sitting, the test character, and loading an item's sprite.
/* global Phaser */

export const TILE = 32;
export const SPEED = 120; // the floor's MOVEMENT_SPEED
export const AVATAR = "/private/characters/Adam.png";

// The character atlas (AnimationManager): 24 idle, 24 run, then a seated pose per direction.
export const DIRECTIONS = ["right", "up", "left", "down"];
// The seated poses as drawn: the atlas's second frame faces right and its third left,
// the other way round from SIT_ORDER's names (side chairs aren't on today's floor, so nothing showed it).
export const SIT_FRAME = { down: 48, right: 49, left: 50, up: 51 };
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
  scene.load.spritesheet("avatar", AVATAR, { frameWidth: 32, frameHeight: 32 });
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

/** The item's sprite as a texture frame, loading its sheet the first time: { key, frame }. */
export async function itemFrame(scene, item) {
  const key = item.sprite.src;
  if (!scene.textures.exists(key)) {
    await new Promise((resolve) => {
      scene.load.image(key, `/pack/${key}`);
      scene.load.once("complete", resolve);
      scene.load.start();
    });
  }
  const frame = item.sprite.rect.join(",");
  const texture = scene.textures.get(key);
  if (!texture.has(frame)) texture.add(frame, 0, ...item.sprite.rect);
  return { key, frame };
}

/** Arrow and WASD input as a direction, nothing while you're typing in a field. */
export function heldDirection(keys) {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return { dx: 0, dy: 0 };
  const dx = (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
  const dy = (keys.S.isDown || keys.DOWN.isDown ? 1 : 0) - (keys.W.isDown || keys.UP.isDown ? 1 : 0);
  return { dx, dy };
}
