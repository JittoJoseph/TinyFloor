import { anyCharacter } from "@/lib/identity";

/**
 * Who the demo office's door suggests someone walks in as, so they can be on
 * the floor with one press (docs/analytics.md): a character and a common
 * American first name that suits it, short enough to read above a character
 * on the floor. Offices never suggest one: a teammate's name there is their own.
 */
const WOMEN = [
  "Emma", "Olivia", "Ava", "Sophia", "Mia", "Harper", "Evelyn", "Abigail", "Emily", "Ella",
  "Grace", "Chloe", "Lily", "Hannah", "Zoe", "Nora", "Riley", "Claire", "Avery", "Madison",
];
const MEN = [
  "Liam", "Noah", "Oliver", "James", "Elijah", "Lucas", "Mason", "Logan", "Ethan", "Jacob",
  "Jack", "Henry", "Owen", "Ryan", "Nathan", "Caleb", "Dylan", "Tyler", "Austin", "Jordan",
];
/** The presets drawn as women (shared-protocol character.ts); the rest are men. */
const DRAWN_AS_WOMEN = new Set(["Amelia", "Lucy", "Molly", "Jenny"]);

export interface Persona {
  name: string;
  character: string;
}

const pick = <T,>(choices: readonly T[], not?: T) => {
  const left = choices.filter((one) => one !== not);
  return left[Math.floor(Math.random() * left.length)];
};

/** Someone to walk in as, never quite the one already offered: another character, and a name to go with it. */
export function randomPersona(not?: Persona): Persona {
  let character = anyCharacter();
  while (character === not?.character) character = anyCharacter();
  return { character, name: pick(DRAWN_AS_WOMEN.has(character) ? WOMEN : MEN, not?.name) };
}
