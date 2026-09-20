import { CHARACTER_IDS } from "@/components/entry/CharacterPicker";

const KEY = "tinyfloorIdentity";
const DEFAULT_CHARACTER = "Adam";

export interface Identity {
  name: string;
  character: string;
}

/**
 * The name and character someone last walked in with, kept in this browser.
 * It carries them from the lobby to an invite, and through signing up, so
 * nobody types their name twice.
 */
export function readIdentity(): Identity {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Identity>;
    return {
      name: typeof saved.name === "string" ? saved.name.slice(0, 30) : "",
      character: character(saved.character),
    };
  } catch {
    return { name: "", character: DEFAULT_CHARACTER };
  }
}

export function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: identity.name.slice(0, 30), character: character(identity.character) }));
  } catch {}
}

/** One of the characters we have art for, or the default. */
export function character(value: unknown): string {
  return typeof value === "string" && CHARACTER_IDS.includes(value) ? value : DEFAULT_CHARACTER;
}
