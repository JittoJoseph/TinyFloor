import { SITE_URL } from "./site";

// Paths people share or open in a new tab. They are deliberately left without a
// locale prefix: the proxy sends each visitor to their own language, so a link
// copied from the Japanese UI opens in English for an English teammate. Inside
// the app, pass them to the locale-aware `Link` / router, which adds the prefix.

/** The free public lobby, open to anyone. */
export const lobbyPath = "/lobby";

/** One space's own pages: rooms, people, settings. */
export const spacePath = (workspaceId: string) => `/space/${encodeURIComponent(workspaceId)}`;

/** A workspace room, for its members. */
export const roomPath = (roomId: string) => `/room/${encodeURIComponent(roomId)}`;

/** A guest link into one room. */
export const guestLinkPath = (token: string) => `/join/${encodeURIComponent(token)}`;

/** An invitation to join a workspace. */
export const invitePath = (token: string) => `/invite/${encodeURIComponent(token)}`;

/** Absolute URL for a path, on the current origin in the browser. */
export const shareUrl = (path: string) =>
  `${typeof window === "undefined" ? SITE_URL : window.location.origin}${path}`;
