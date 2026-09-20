import { SITE_URL } from "./site";

// Paths people share or open in a new tab. They are deliberately left without a
// locale prefix: the proxy sends each visitor to their own language, so a link
// copied from the Japanese UI opens in English for an English teammate. Inside
// the app, pass them to the locale-aware `Link` / router, which adds the prefix.

/** The free public lobby, open to anyone. */
export const lobbyPath = "/lobby";

/** An office: its floor, and everything beside it. */
export const officePath = (officeId: string) => `/office/${encodeURIComponent(officeId)}`;
export const officeChatPath = (officeId: string, channel?: string) =>
  channel ? `${officePath(officeId)}/chat/${encodeURIComponent(channel)}` : `${officePath(officeId)}/chat`;
export const officePeoplePath = (officeId: string) => `${officePath(officeId)}/people`;

/** A guest link into an office. */
export const guestLinkPath = (token: string) => `/join/${encodeURIComponent(token)}`;

/** An invitation to become a member of an office. */
export const invitePath = (token: string) => `/invite/${encodeURIComponent(token)}`;

/** Absolute URL for a path, on the current origin in the browser. */
export const shareUrl = (path: string) =>
  `${typeof window === "undefined" ? SITE_URL : window.location.origin}${path}`;
