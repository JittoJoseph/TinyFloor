/**
 * What someone is listening to on Spotify, shared from a link they paste: a
 * song, album, playlist, podcast, artist, or a Jam the people they work with
 * can join. Spotify only lets an app read what someone plays for a handful of
 * hand-added accounts, so a link is how it travels; it clears itself after a
 * while, like a status note, so it never says what they played yesterday.
 */
export interface SpotifyShare {
  /** The link as Spotify writes it: https://open.spotify.com/<kind>/<id>. */
  url: string;
  kind: SpotifyKind;
  /** The name Spotify gives it, or null for a Jam, which has none it will say. */
  title: string | null;
  /** Its cover art, from Spotify, or null. */
  image: string | null;
  /** When it clears itself, in milliseconds. */
  until: number;
}

export type SpotifyKind = "track" | "album" | "playlist" | "episode" | "show" | "artist" | "jam";

/** Where Spotify's apps put their short links. */
const SHORT_HOSTS = ["spotify.link", "link.tospotify.com"];

/** How long a shared link lasts: an afternoon's listening. */
export const SPOTIFY_SHARE_MS = 4 * 60 * 60 * 1000;

const KINDS: Record<string, SpotifyKind> = {
  track: "track",
  album: "album",
  playlist: "playlist",
  episode: "episode",
  show: "show",
  artist: "artist",
  socialsession: "jam",
};

/**
 * A Spotify link or URI, written the one way Spotify does
 * (https://open.spotify.com/track/<id>), with its kind; null when it isn't one.
 * Regional paths ("/intl-de/") and tracking parameters are dropped. A short
 * link from Spotify's apps (spotify.link, or link.tospotify.com from older
 * ones) can't be read without following it, so it is returned as it is, with
 * no kind, for the server to follow.
 */
export function spotifyLink(value: unknown): { url: string; kind: SpotifyKind | null } | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > 300) return null;
  const uri = /^spotify:([a-z]+):([A-Za-z0-9]{10,40})$/.exec(text);
  if (uri) return KINDS[uri[1]] && uri[1] !== "socialsession" ? { url: `https://open.spotify.com/${uri[1]}/${uri[2]}`, kind: KINDS[uri[1]] } : null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (SHORT_HOSTS.includes(url.hostname) && /^\/[A-Za-z0-9]{4,40}$/.test(url.pathname)) return { url: `https://${url.hostname}${url.pathname}`, kind: null };
  if (url.hostname !== "open.spotify.com") return null;
  const path = /^(?:\/intl-[a-z]{2}(?:-[A-Za-z]{2,4})?)?\/(?:embed\/)?([a-z]+)\/([A-Za-z0-9]{10,40})\/?$/.exec(url.pathname);
  const kind = path && KINDS[path[1]];
  return kind ? { url: `https://open.spotify.com/${path![1]}/${path![2]}`, kind } : null;
}

/** The embeddable player for a shared link, or null for a Jam, which only plays in Spotify. */
export function spotifyEmbed(share: Pick<SpotifyShare, "url" | "kind">): string | null {
  if (share.kind === "jam") return null;
  return share.url.replace("https://open.spotify.com/", "https://open.spotify.com/embed/");
}

/** The share while it lasts; null once it has cleared itself. */
export function liveShare(share: SpotifyShare | null | undefined, now = Date.now()): SpotifyShare | null {
  return share && share.until > now ? share : null;
}
