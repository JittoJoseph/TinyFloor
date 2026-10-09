/**
 * web-shared has no packages of its own: its code uses those of the frontend
 * being built. Node, TypeScript and the bundlers look for packages in a
 * node_modules beside the file, so web-shared/node_modules is made a link to
 * that frontend's (a junction on Windows). Run from the frontend's folder,
 * before every dev server and build (fetch-assets.mjs imports this).
 */
import { lstat, rm, symlink } from "node:fs/promises";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const link = path.join(here, "..", "node_modules");
const target = path.join(process.cwd(), "node_modules");

const existing = await lstat(link).catch(() => null);
if (existing && !existing.isSymbolicLink()) {
  console.warn(`${link} is a folder, not a link: leaving it, and web-shared resolves packages from there`);
} else {
  if (existing) await rm(link, { force: true });
  await symlink(target, link, "junction");
}
