import { isLook } from "./look";

/** The premade characters players could pick before looks (look.ts). Matches the sprites in the frontend. */
export const CHARACTERS = ["Adam", "Alex", "Amelia", "Ash", "Bob", "Dan", "Lucy", "Molly"] as const;
export type Character = (typeof CHARACTERS)[number];
export const DEFAULT_CHARACTER: Character = "Adam";

export const DISPLAY_NAME_MAX_LENGTH = 32;

/** One of the premade characters. */
export function isPremade(value: unknown): value is Character {
  return CHARACTERS.includes(value as Character);
}

/** How someone can look: a premade character, or a look made in the creator. */
export function isCharacter(value: unknown): value is string {
  return isPremade(value) || isLook(value);
}

/** Collapses whitespace, drops control characters and trims to length. Empty when nothing usable is left. */
export function cleanDisplayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DISPLAY_NAME_MAX_LENGTH)
    .trim();
}
