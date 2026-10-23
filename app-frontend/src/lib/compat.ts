import { CHARACTER_CATALOG } from "@shared/character";
import { FLOOR } from "@shared/map";
import { PROTOCOL_VERSION } from "@shared/messages";
import atlas from "@shared/catalog/atlas.json";

/**
 * What an open page has to agree on with everyone else's, as one short key:
 * how the room and pages talk (PROTOCOL_VERSION), the floor (its walls,
 * desks and seats), the things that stand on it, and the parts characters are
 * drawn from. A page from before a change to any of these would draw people
 * where the floor has walls, or someone as nobody; a deploy that changes
 * nothing of these (a screen's look, words, a fix) gives the same key, and
 * open pages stay as they are (lib/updates.ts). The app serves its own at
 * /compat.json.
 */
export const COMPAT = hash(JSON.stringify([PROTOCOL_VERSION, FLOOR, atlas, CHARACTER_CATALOG]));

/** FNV-1a: short and stable, which is all a version key needs. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
