// Writes a picture of at most 256 colours as an 8-bit palette PNG: a third of
// the size of the same picture in full colour, which is all pngjs writes.
// Every browser and Phaser read it the same.
import { deflateSync } from "node:zlib";

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buffer) => {
  let c = -1;
  for (const byte of buffer) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "latin1");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** The PNG, or null when the picture has more than 256 colours. */
export function png8({ width, height, data }) {
  const index = new Map();
  const pixels = new Uint8Array(width * height);
  for (let p = 0; p < pixels.length; p++) {
    // Every fully clear pixel is the same colour, whatever its RGB.
    const key = data[p * 4 + 3] === 0 ? 0 : data.readUInt32BE(p * 4);
    let n = index.get(key);
    if (n === undefined) {
      if (index.size === 256) return null;
      index.set(key, (n = index.size));
    }
    pixels[p] = n;
  }
  const colours = [...index.keys()];
  const palette = Buffer.alloc(colours.length * 3);
  const alpha = Buffer.alloc(colours.length);
  colours.forEach((rgba, n) => {
    palette[n * 3] = rgba >>> 24;
    palette[n * 3 + 1] = (rgba >>> 16) & 0xff;
    palette[n * 3 + 2] = (rgba >>> 8) & 0xff;
    alpha[n] = rgba & 0xff;
  });
  // Rows unfiltered: palette indices don't predict from their neighbours.
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 3;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("PLTE", palette),
    chunk("tRNS", alpha),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
