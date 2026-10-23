import looks from "./catalog/looks.json";

/**
 * How someone looks, made in the creator from the pack's character parts
 * (lab/looks.mjs): a skin, eyes and an outfit, and if they like hair, facial
 * hair, glasses, a hat and a backpack, each a style in one of its colours.
 * Kept and sent as a short string, "body.1/eyes.3/outfit.7-3/hair.12-5", in
 * the same place as the eight characters people picked before it, which still
 * work as they did.
 */
export const LOOK_PARTS = ["body", "eyes", "outfit", "hair", "beard", "glasses", "hat", "bag"] as const;
export type LookPart = (typeof LOOK_PARTS)[number];
export type Look = Partial<Record<LookPart, string>>;

interface LookCatalog {
  frame: [number, number];
  frames: number;
  parts: Record<LookPart, { required: boolean; options: Record<string, string> }>;
  premades: string[];
}
export const LOOKS = looks as unknown as LookCatalog;

/** The pack's premade characters, as looks: where the creator starts. */
export const PREMADE_LOOKS = LOOKS.premades;

/** Longer than any look can be. */
const LOOK_MAX_LENGTH = 120;

/** The look a string says, or null if it isn't one we offer. */
export function parseLook(value: unknown): Look | null {
  if (typeof value !== "string" || value.length > LOOK_MAX_LENGTH || !value.startsWith("body.")) return null;
  const look: Look = {};
  let last = -1;
  for (const token of value.split("/")) {
    const dot = token.indexOf(".");
    const part = token.slice(0, dot) as LookPart;
    const id = token.slice(dot + 1);
    const at = LOOK_PARTS.indexOf(part);
    // Each part once, in order, and one we offer.
    if (at <= last || !Object.hasOwn(LOOKS.parts[part].options, id)) return null;
    look[part] = id;
    last = at;
  }
  return LOOK_PARTS.every((part) => !LOOKS.parts[part].required || look[part]) ? look : null;
}

export const isLook = (value: unknown): value is string => parseLook(value) !== null;

/** A look as a string: its parts in order. */
export const lookString = (look: Look): string =>
  LOOK_PARTS.filter((part) => look[part]).map((part) => `${part}.${look[part]}`).join("/");

const pickOne = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

/** Someone new: everyday clothes, hair most of the time, now and then a beard, glasses or a cap. */
export function randomLook(): Look {
  const any = (part: LookPart) => pickOne(Object.keys(LOOKS.parts[part].options));
  const look: Look = { body: any("body"), eyes: any("eyes"), outfit: any("outfit") };
  if (Math.random() < 0.95) look.hair = any("hair");
  if (Math.random() < 0.2) look.beard = any("beard");
  if (Math.random() < 0.25) look.glasses = any("glasses");
  if (Math.random() < 0.12) look.hat = any("hat");
  if (Math.random() < 0.1) look.bag = any("bag");
  return look;
}

/** The pictures a look is drawn from, bottom first: paths under the site's root. */
export const lookLayers = (look: Look): string[] =>
  LOOK_PARTS.filter((part) => look[part]).map((part) => `/looks/${part}/${look[part]}.png`);
