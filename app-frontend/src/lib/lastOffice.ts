/**
 * The office this browser was last in, so opening the app goes straight back
 * there (AppHome), without first reading which offices are yours. Only a hint:
 * the office, read on the way, says if it isn't one of yours any more, and is forgotten.
 */
const KEY = "tf-last-office";

/**
 * The front door's first step, run as its HTML is read, before any of its
 * code has loaded: back to the office you were last in, whose page then
 * arrives with all its own code at once, rather than the front door's code
 * loading, then asking the router for the office's page, then that page's
 * code, one after the other. Anything in the address (leaving an office,
 * coming back from somewhere) is the front door's to read (AppHome).
 */
export const LAST_OFFICE_SCRIPT = `try{var o=localStorage.getItem(${JSON.stringify(KEY)}),p=location.pathname;if(o&&!location.search)location.replace((p==="/"?"":p)+"/office/"+encodeURIComponent(o))}catch(e){}`;

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
