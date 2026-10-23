import { DEFAULT_CHARACTER, DOOR_PRESETS, isCharacter } from "@shared/character";

const KEY = "tinyfloorIdentity";

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

/**
 * Who a door has picked for someone before they choose: one of the presets at
 * random, so a team that presses straight through doesn't arrive as the same
 * person. Only for a door's own state, never in what the server renders.
 */
export function anyCharacter(): string {
  return DOOR_PRESETS[Math.floor(Math.random() * DOOR_PRESETS.length)];
}

/** One of the characters we have art for, or the default. */
export function character(value: unknown): string {
  return isCharacter(value) ? value : DEFAULT_CHARACTER;
}
