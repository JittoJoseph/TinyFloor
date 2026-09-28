/**
 * Whether this browser has signed in to an account before, remembered here so
 * the site's own pages can tell without asking the API (which would be a
 * worker request on every visit). Only used to keep Google One Tap away from
 * people who already have an account; it proves nothing and guards nothing.
 */
const KEY = "tinyfloorAccount";

export function rememberAccount(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
}

export function hasAccountHint(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
