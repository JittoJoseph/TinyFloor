/**
 * Names the demo office's door suggests, so someone can walk in with one press
 * (docs/analytics.md). Common American first names, short enough to read
 * above a character on the floor. Offices never suggest one: a teammate's
 * name there is their own.
 */
const NAMES = [
  "Emma", "Olivia", "Ava", "Sophia", "Mia", "Harper", "Evelyn", "Abigail", "Emily", "Ella",
  "Grace", "Chloe", "Lily", "Hannah", "Zoe", "Nora", "Riley", "Claire", "Avery", "Madison",
  "Liam", "Noah", "Oliver", "James", "Elijah", "Lucas", "Mason", "Logan", "Ethan", "Jacob",
  "Jack", "Henry", "Owen", "Ryan", "Nathan", "Caleb", "Dylan", "Tyler", "Austin", "Jordan",
];

/** A name to suggest, never the one already there. */
export function suggestName(not?: string): string {
  const choices = NAMES.filter((name) => name !== not);
  return choices[Math.floor(Math.random() * choices.length)];
}
