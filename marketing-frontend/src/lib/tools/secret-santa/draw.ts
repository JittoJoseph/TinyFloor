/** One person's draw, as their private link carries it. */
export interface SantaPick {
  /** The person the link is for. */
  name: string;
  /** Who they're buying for. */
  to: string;
  budget?: string;
  /** YYYY-MM-DD. */
  date?: string;
}

/** The names from the box: one per line, trimmed, blanks dropped. */
export const santaNames = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Everyone gets someone, nobody gets themselves: a shuffled order where each
 * person buys for the next, round the circle.
 */
export function drawNames(names: string[]): Array<[string, string]> {
  const order = [...names];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.map((name, i) => [name, order[(i + 1) % order.length]]);
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** The part after # in a person's link. It stays in the browser: a page's #fragment is never sent to the server. */
export function encodePick(pick: SantaPick): string {
  const data = [pick.name, pick.to, pick.budget ?? "", pick.date ?? ""];
  return `s=${toBase64Url(new TextEncoder().encode(JSON.stringify(data)))}`;
}

export function decodePick(hash: string): SantaPick | null {
  const match = /(?:^#?|&)s=([\w-]+)/.exec(hash);
  if (!match) return null;
  try {
    const [name, to, budget, date] = JSON.parse(new TextDecoder().decode(fromBase64Url(match[1])));
    if (typeof name !== "string" || typeof to !== "string" || !name || !to) return null;
    return { name, to, budget: budget || undefined, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined };
  } catch {
    return null;
  }
}
