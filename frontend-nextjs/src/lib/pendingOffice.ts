/**
 * An office name typed before there is an account to own it. It waits in this
 * browser while someone signs up; /create finishes the job when they are back.
 */
const PENDING_KEY = "tinyfloorPendingSpace";

export function rememberOffice(name: string) {
  try {
    localStorage.setItem(PENDING_KEY, name);
  } catch {}
}

export function pendingOffice(): string {
  try {
    return localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    return "";
  }
}

export function forgetOffice() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}
