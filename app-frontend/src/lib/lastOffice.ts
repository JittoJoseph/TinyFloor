/**
 * The office this browser was last in, so opening the app goes straight back
 * there (components/app/Home), without first reading which offices are yours. Only a hint:
 * the office, read on the way, says if it isn't one of yours any more, and is forgotten.
 */
import { SESSION_HINT_KEY } from "@/lib/session-hint";

const KEY = "tf-last-office";

/**
 * The front door's first step, run as its HTML is read, before any of its
 * code has loaded: back to the office you were last in, whose page then
 * arrives with all its own code at once, rather than the front door's code
 * loading, then asking the router for the office's page, then that page's
 * code, one after the other. Only while this browser is signed in (the
 * session hint): signed out, the front door sends you to the sign-in, as
 * someone new or someone coming back. Leaving an office (`?left=`) is the
 * front door's to read (components/app/Home): that one isn't gone back to.
 */
export const LAST_OFFICE_SCRIPT = `try{var o=localStorage.getItem(${JSON.stringify(KEY)}),p=location.pathname;p=p.slice(0,p.lastIndexOf("/home"));if(o&&localStorage.getItem(${JSON.stringify(SESSION_HINT_KEY)})&&!/[?&]left=/.test(location.search))location.replace(p+"/office/"+encodeURIComponent(o))}catch(e){}`;

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
