/**
 * What someone is playing from Spotify in TinyFloor: a song, album, playlist,
 * podcast or artist they picked or pasted, playing in Spotify's own player in
 * their browser, or a Jam the people they work with can join in Spotify.
 * Spotify only lets an app read what someone plays in Spotify itself for a
 * handful of hand-added accounts, so it is what they play here that shows.
 */
export interface SpotifyShare {
  /** The link as Spotify writes it: https://open.spotify.com/<kind>/<id>. */
  url: string;
  kind: SpotifyKind;
  /** The name Spotify gives it, or null for a Jam, which has none it will say. */
  title: string | null;
  /** Its cover art, from Spotify, or null. */
  image: string | null;
  /** Who made it, for a song, album or episode ("Pitbull"), or null. */
  subtitle: string | null;
  /**
   * A song's artist, as a link: what plays when the song ends, their best-known
   * songs one after another. Only from a lookup; not kept with a share.
   */
  artist?: string | null;
  /** When it clears itself, in milliseconds. */
  until: number;
}

export type SpotifyKind = "track" | "album" | "playlist" | "episode" | "show" | "artist" | "jam";

/** Where Spotify's apps put their short links. */
const SHORT_HOSTS = ["spotify.link", "link.tospotify.com"];

/**
 * How long a share lasts unless it is said again. The player says it again
 * every SPOTIFY_REFRESH_MS while it plays, so one left by a closed tab clears
 * itself within a quarter of an hour.
 */
export const SPOTIFY_SHARE_MS = 15 * 60 * 1000;
export const SPOTIFY_REFRESH_MS = 10 * 60 * 1000;

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

/** The URI Spotify's player takes ("spotify:track:<id>"), or null for a Jam, which only plays in Spotify. */
export function spotifyUri(share: Pick<SpotifyShare, "url" | "kind">): string | null {
  if (share.kind === "jam") return null;
  const [, kind, id] = /^https:\/\/open\.spotify\.com\/([a-z]+)\/([A-Za-z0-9]+)$/.exec(share.url) ?? [];
  return kind && id ? `spotify:${kind}:${id}` : null;
}

/** The share while it lasts; null once it has cleared itself. */
export function liveShare(share: SpotifyShare | null | undefined, now = Date.now()): SpotifyShare | null {
  return share && share.until > now ? share : null;
}
