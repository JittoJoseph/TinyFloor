// Records baked pictures for the build: each one goes in private-assets/ and
// in web-shared/assets.manifest.json with its size and hash, so every build
// pulls it from R2 and checks it like the rest of the art (ASSETS.md). Says
// which changed, to be uploaded.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PRIVATE = join(ROOT, "private-assets");
const MANIFEST = join(ROOT, "web-shared", "assets.manifest.json");

/** Writes the pictures ({ key, png }) and their manifest entries; `under` drops entries under it that aren't among them. */
export async function record(pictures, under) {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const keys = new Set(pictures.map((picture) => picture.key));
  if (under) manifest.files = manifest.files.filter((file) => !file.key.startsWith(under) || keys.has(file.key));
  const changed = [];
  for (const { key, png } of pictures) {
    await mkdir(join(PRIVATE, key, ".."), { recursive: true });
    await writeFile(join(PRIVATE, key), png);
    const entry = { key, sha256: createHash("sha256").update(png).digest("hex"), bytes: png.length };
    const known = manifest.files.findIndex((file) => file.key === key);
    if (known >= 0 && manifest.files[known].sha256 === entry.sha256) continue;
    if (known < 0) manifest.files.push(entry);
    else manifest.files[known] = entry;
    changed.push(key);
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  return { bucket: manifest.bucket, changed };
}
