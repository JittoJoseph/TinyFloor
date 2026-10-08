/**
 * The office this browser was last in, so opening the app goes straight back
 * there (app/[locale]/(app)/page.tsx). Only a hint: the app checks it is still
 * one of yours before going.
 */
const KEY = "tf-last-office";

export function rememberOffice(officeId: string) {
  try {
    localStorage.setItem(KEY, officeId);
  } catch {}
}

export function lastOffice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
