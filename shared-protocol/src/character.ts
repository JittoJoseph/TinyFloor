import catalog from "./catalog/characters.json";

/**
 * Who someone walks in as, the same in every office: kept on their account
 * (users.character), carried on the room ticket and to everyone on the floor.
 * It's one short string, either
 *
 * - a preset: one of the pack's characters by name, "Adam"; everyone starts
 *   as one, picked at their first door, and the eight the floor began with
 *   are the first eight; or
 * - a look they made in the creator: the character generator's parts,
 *   "body.1/eyes.3/outfit.7-3/hair.12-5/glasses.15-1".
 *
 * Both are drawn the same way, from strips of the same 48 frames (lab
 * characters.mjs): a preset is one strip, a look one a part, stacked
 * (characterLayers). What's offered is in catalog/characters.json, which the
 * creator shows and the API and the room check against.
 */
export const CHARACTER_PARTS = ["body", "eyes", "outfit", "hair", "face", "glasses", "hat", "gloves", "bag"] as const;
export type CharacterPart = (typeof CHARACTER_PARTS)[number];
export type Look = Partial<Record<CharacterPart, string>>;

interface CharacterCatalog {
  /** A frame's size, in the art's pixels. */
  frame: [number, number];
  frames: number;
  presets: Record<string, { nearest: string }>;
  parts: Record<CharacterPart, { required: boolean; options: Record<string, string> }>;
  /** The character generator's own premade characters, as looks: where making your own starts. */
  starts: string[];
}
export const CHARACTER_CATALOG = catalog as unknown as CharacterCatalog;

/** Every preset, the eight the floor began with first. */
export const PRESETS = Object.keys(CHARACTER_CATALOG.presets);
/** Who people pick from at their first door: those eight. The rest are in the creator. */
export const DOOR_PRESETS = PRESETS.slice(0, 8);
export const DEFAULT_CHARACTER = PRESETS[0];

/** Longer than any look can be. */
const LOOK_MAX_LENGTH = 160;

export const isPreset = (value: unknown): value is string => typeof value === "string" && Object.hasOwn(CHARACTER_CATALOG.presets, value);

/** The look a string says, or null if it isn't one we offer. */
export function parseLook(value: unknown): Look | null {
  if (typeof value !== "string" || value.length > LOOK_MAX_LENGTH || !value.startsWith("body.")) return null;
  const look: Look = {};
  let last = -1;
  for (const token of value.split("/")) {
    const dot = token.indexOf(".");
    const part = token.slice(0, dot) as CharacterPart;
    const at = CHARACTER_PARTS.indexOf(part);
    // Each part once, in order, and one we offer.
    if (at <= last || !Object.hasOwn(CHARACTER_CATALOG.parts[part].options, token.slice(dot + 1))) return null;
    look[part] = token.slice(dot + 1);
    last = at;
  }
  return CHARACTER_PARTS.every((part) => !CHARACTER_CATALOG.parts[part].required || look[part]) ? look : null;
}

export const isLook = (value: unknown): value is string => parseLook(value) !== null;

/** How someone can look: a preset, or a look made in the creator. */
export const isCharacter = (value: unknown): value is string => isPreset(value) || isLook(value);

/** A character we can draw: theirs, or the default for anything else. */
export const characterOrDefault = (value: unknown): string => (isCharacter(value) ? value : DEFAULT_CHARACTER);

/** A look as a string: its parts in order. */
export const lookString = (look: Look): string =>
  CHARACTER_PARTS.filter((part) => look[part]).map((part) => `${part}.${look[part]}`).join("/");

/**
 * Where changing a part starts: a look as it is, a preset as the look nearest
 * it (its skin, eyes, outfit and hair, as close as the parts come).
 */
export function lookFrom(character: unknown): Look {
  return parseLook(character) ?? parseLook(CHARACTER_CATALOG.presets[characterOrDefault(character)]?.nearest) ?? parseLook(CHARACTER_CATALOG.starts[0])!;
}

/** The pictures a character is drawn from, bottom first: paths under the site's root. */
export function characterLayers(character: unknown): string[] {
  const look = parseLook(character);
  if (look) return CHARACTER_PARTS.filter((part) => look[part]).map((part) => `/characters/parts/${part}/${look[part]}.png`);
  return [`/characters/presets/${characterOrDefault(character)}.png`];
}

const pickOne = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** Someone new: everyday clothes, hair most of the time, now and then a beard, glasses or a hat. */
export function randomLook(): Look {
  const any = (part: CharacterPart) => pickOne(Object.keys(CHARACTER_CATALOG.parts[part].options));
  const look: Look = { body: any("body"), eyes: any("eyes"), outfit: any("outfit") };
  if (Math.random() < 0.95) look.hair = any("hair");
  if (Math.random() < 0.2) look.face = any("face");
  if (Math.random() < 0.25) look.glasses = any("glasses");
  if (Math.random() < 0.15) look.hat = any("hat");
  if (Math.random() < 0.1) look.bag = any("bag");
  return look;
}
