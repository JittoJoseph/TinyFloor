export const DISPLAY_NAME_MAX_LENGTH = 32;

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
