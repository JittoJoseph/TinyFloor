/**
 * Whether this browser had a session (an account's or a guest's) when it last
 * asked. A prebuilt door can't know who is at it, so the page is sent with the
 * door; the first script on it (lib/theme-script.ts) puts `known` on <html>
 * when this is set, and the door gives way to a quiet "coming in" until the
 * session says who it is. Someone new sees the door at once, as before.
 */
export const SESSION_HINT_KEY = "tf-session";

export function rememberSession(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {}
  document.documentElement.classList.toggle("known", signedIn);
}

/** For an app page reached from the site, where the first script has already run. */
export function recallSession() {
  try {
    if (localStorage.getItem(SESSION_HINT_KEY)) document.documentElement.classList.add("known");
  } catch {}
}
