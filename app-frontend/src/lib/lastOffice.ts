/**
 * The office this browser was last in, so opening the app goes straight back
 * there (AppHome), without first reading which offices are yours. Only a hint:
 * the office, read on the way, says if it isn't one of yours any more, and is forgotten.
 */
const KEY = "tf-last-office";

export function rememberOffice(officeId: string) {
  try {
    localStorage.setItem(KEY, officeId);
  } catch {}
}

/** It isn't one of yours any more (you left, or were let go): opening the app reads your offices instead. */
export function forgetOffice(officeId: string) {
  try {
    if (localStorage.getItem(KEY) === officeId) localStorage.removeItem(KEY);
  } catch {}
}

export function lastOffice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
