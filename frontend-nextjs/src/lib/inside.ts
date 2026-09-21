/**
 * Whether you already walked through a place's door in this tab, so reloading
 * the page takes you straight back in rather than to the door again. Kept for
 * the tab only: a new tab, or tomorrow, starts at the door.
 */
const key = (place: string) => `tf-inside:${place}`;

export function wasInside(place: string): boolean {
  try {
    return sessionStorage.getItem(key(place)) === "1";
  } catch {
    return false;
  }
}

export function rememberInside(place: string, inside: boolean) {
  try {
    if (inside) sessionStorage.setItem(key(place), "1");
    else sessionStorage.removeItem(key(place));
  } catch {
    // Storage can be off; then the door is simply asked for again.
  }
}
