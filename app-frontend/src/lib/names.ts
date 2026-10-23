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
/** The earlier characters drawn as women (public/characters), and as men; a look could be anyone. */
const DRAWN_AS_WOMEN = new Set(["Amelia", "Lucy", "Molly"]);
const DRAWN_AS_MEN = new Set(["Adam", "Alex", "Ash", "Bob", "Dan"]);
const ANYONE = [...WOMEN, ...MEN];

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
  return { character, name: pick(DRAWN_AS_WOMEN.has(character) ? WOMEN : DRAWN_AS_MEN.has(character) ? MEN : ANYONE, not?.name) };
}
