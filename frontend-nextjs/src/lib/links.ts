import { SITE_URL } from "./site";

// Paths people share or open in a new tab. They are deliberately left without a
// locale prefix: the proxy sends each visitor to their own language, so a link
// copied from the Japanese UI opens in English for an English teammate. Inside
// the app, pass them to the locale-aware `Link` / router, which adds the prefix.

export const joinPath = (roomId: string) =>
  `/join?roomId=${encodeURIComponent(roomId)}`;

export const profilePath = (userId: string) =>
  `/dashboard?user=${encodeURIComponent(userId)}`;

/** Absolute URL for a path, on the current origin in the browser. */
export const shareUrl = (path: string) =>
  `${typeof window === "undefined" ? SITE_URL : window.location.origin}${path}`;
