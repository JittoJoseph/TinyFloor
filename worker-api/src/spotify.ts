import { SPOTIFY_SHARE_MS, spotifyLink, type SpotifyKind, type SpotifyShare } from "../../shared-protocol/src";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * What you play from Spotify in TinyFloor (docs/product.md): its name and cover
 * come from Spotify's oEmbed, which needs no key, and who made it from the
 * Open Graph tags on its public page, the ones link previews read. An album,
 * playlist or artist plays one song at a time, from the list Spotify's own
 * embed shows, so what's playing is always a song that can be named. The
 * player in your browser shares it while it plays and stops sharing when it stops.
 */

/** Spotify's answers for a link barely change, so Cloudflare keeps them a day. */
const LOOKUP_TTL_SECONDS = 24 * 60 * 60;
/** A spotify.link short link goes through a redirect or two before it says where it leads. */
const MOST_HOPS = 3;
/** Playlists change week to week; a few hours old is fresh enough. */
const SONGS_TTL_SECONDS = 6 * 60 * 60;
/** What plays as a list of songs. */
const LISTS = ["album", "playlist", "artist"];
/** Songs asked about for what plays on, most: each is a page from Spotify. */
const MOST_SONGS_AFTER = 5;
const USER_AGENT = { "User-Agent": "TinyFloor (+https://www.tinyfloor.com)" };

type Found = Omit<SpotifyShare, "until">;

/** What a link is, by Spotify's own account, or a 400 when it isn't one Spotify knows. */
export async function lookUp(value: unknown): Promise<Found> {
  let link = spotifyLink(value);
  for (let hop = 0; link && !link.kind && hop < MOST_HOPS; hop++) link = await follow(link.url);
  if (!link?.kind) throw new HttpError(400, "not_spotify", "Paste a link from Spotify: a song, album, playlist or Jam", "url");
  // A Jam is someone's live session: Spotify has nothing to say about it but the link.
  if (link.kind === "jam") return { url: link.url, kind: "jam", title: null, image: null, subtitle: null };

  const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`, {
    cf: { cacheTtl: LOOKUP_TTL_SECONDS, cacheEverything: true },
  }).catch(() => null);
  if (!response?.ok) {
    throw new HttpError(response && response.status < 500 ? 400 : 502, "spotify_unknown", "Spotify can't find that link", "url");
  }
  const found = (await response.json()) as { title?: unknown; thumbnail_url?: unknown };
  const title = typeof found.title === "string" ? found.title.trim().slice(0, 200) : null;
  const image =
    typeof found.thumbnail_url === "string" && /^https:\/\/[a-z0-9.-]+\.(scdn\.co|spotifycdn\.com)\//.test(found.thumbnail_url)
      ? found.thumbnail_url
      : null;
  const subtitle = MADE_BY.includes(link.kind) ? await madeBy(link.url) : null;
  return { url: link.url, kind: link.kind, title, image, subtitle };
}

/** What has someone behind it worth naming: a song's or album's artist, an episode's show. */
const MADE_BY = ["track", "album", "episode"];

/**
 * Who made it, from the first part of the page's description ("Pitbull · album · 2012"),
 * which oEmbed leaves out. Nothing, rather than a failure, when the page won't say.
 */
async function madeBy(url: string): Promise<string | null> {
  const response = await fetch(url, { headers: USER_AGENT, cf: { cacheTtl: LOOKUP_TTL_SECONDS, cacheEverything: true } }).catch(() => null);
  if (!response?.ok) return null;
  const description = /<meta property="og:description" content="([^"]*)"/.exec(await response.text())?.[1];
  const first = description?.split(" · ")[0]?.trim();
  return first ? decodeEntities(first).slice(0, 120) : null;
}

interface Embedded {
  trackList?: Array<{ uri?: unknown; title?: unknown; subtitle?: unknown }>;
  artists?: Array<{ uri?: unknown }>;
}

/**
 * What Spotify's embed for a link shows, the player TinyFloor plays it in: an
 * album's, playlist's or artist's songs, a song's artists. Null when it won't say.
 */
async function embedded(url: string): Promise<Embedded | null> {
  const [, kind, id] = /^https:\/\/open\.spotify\.com\/([a-z]+)\/([A-Za-z0-9]+)$/.exec(url) ?? [];
  if (!kind) return null;
  const response = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
    headers: USER_AGENT,
    cf: { cacheTtl: SONGS_TTL_SECONDS, cacheEverything: true },
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(await response.text())?.[1];
  try {
    const page = data ? (JSON.parse(data) as { props?: { pageProps?: { state?: { data?: { entity?: Embedded } } } } }) : null;
    const entity = page?.props?.pageProps?.state?.data?.entity;
    return entity && typeof entity === "object" ? entity : null;
  } catch {
    return null;
  }
}

/** Its songs, in order, as they'd be shared: named, with who made them; their covers come with a lookup. */
async function songsOf(url: string): Promise<Found[]> {
  const list = (await embedded(url))?.trackList;
  if (!Array.isArray(list)) return [];
  return list.flatMap((song) => {
    const link = spotifyLink(song?.uri);
    if (link?.kind !== "track" || typeof song.title !== "string") return [];
    const subtitle = typeof song.subtitle === "string" ? song.subtitle.trim().slice(0, 120) || null : null;
    return [{ url: link.url, kind: "track" as const, title: song.title.trim().slice(0, 200), image: null, subtitle }];
  });
}

/**
 * What plays on after these songs, newest first: the best-known songs of the
 * first artist on them who hasn't had their turn, the nearest thing to radio
 * Spotify's player offers. Someone featured on a song is how it moves on.
 */
async function songsAfter(songs: string[], played: string[]): Promise<{ artist: string | null; tracks: Found[] }> {
  for (const song of songs) {
    const artists = (await embedded(song))?.artists;
    for (const one of Array.isArray(artists) ? artists : []) {
      const artist = spotifyLink(one?.uri);
      if (artist?.kind !== "artist" || played.includes(artist.url)) continue;
      const tracks = (await songsOf(artist.url)).filter((track) => !songs.includes(track.url));
      if (tracks.length) return { artist: artist.url, tracks };
      played = [...played, artist.url];
    }
  }
  return { artist: null, tracks: [] };
}

/** The few entities a page's meta tags use. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Where a short link leads, read from its redirect without loading the page.
 * Asked with no User-Agent, Spotify's short links answer with a page instead.
 */
async function follow(url: string): Promise<{ url: string; kind: SpotifyKind | null } | null> {
  const response = await fetch(url, { redirect: "manual", headers: USER_AGENT }).catch(() => null);
  const location = response?.headers.get("Location");
  return location ? spotifyLink(new URL(location, url).href) : null;
}

/**
 * The columns a share is kept in, read back as one, cleared or not: you see
 * your last one so you can share it again; everyone else only a live one (liveShare).
 */
export function shareFrom(row: {
  spotify_url: string | null;
  spotify_kind: string | null;
  spotify_title: string | null;
  spotify_image: string | null;
  spotify_subtitle: string | null;
  spotify_until: number | null;
}): SpotifyShare | null {
  if (!row.spotify_url || !row.spotify_kind || row.spotify_until === null) return null;
  return {
    url: row.spotify_url,
    kind: row.spotify_kind as SpotifyKind,
    title: row.spotify_title,
    image: row.spotify_image,
    subtitle: row.spotify_subtitle,
    until: row.spotify_until,
  };
}

export function spotifyRoutes(router: Router): void {
  router
    // What a link is: for a pick or a pasted link, before it plays.
    .add("GET", "/v1/spotify", async ({ request, env, ctx }) => {
      await requireAccount(env, request, ctx);
      return json({ found: await lookUp(new URL(request.url).searchParams.get("url")) });
    })

    // An album's, playlist's or artist's songs, to play one at a time. Empty when Spotify won't list them.
    .add("GET", "/v1/spotify/songs", async ({ request, env, ctx }) => {
      await requireAccount(env, request, ctx);
      const link = spotifyLink(new URL(request.url).searchParams.get("url"));
      if (!link?.kind || !LISTS.includes(link.kind))
        throw new HttpError(400, "not_spotify", "Pass an album, playlist or artist from Spotify", "url");
      return json({ tracks: await songsOf(link.url) });
    })

    // What plays on when the songs run out: given the last few played (newest first) and the artists already heard.
    .add("GET", "/v1/spotify/after", async ({ request, env, ctx }) => {
      await requireAccount(env, request, ctx);
      const query = new URL(request.url).searchParams;
      const links = (key: string, kind: SpotifyKind) =>
        query
          .getAll(key)
          .map((one) => spotifyLink(one))
          .flatMap((link) => (link?.kind === kind ? [link.url] : []));
      return json(await songsAfter(links("song", "track").slice(0, MOST_SONGS_AFTER), links("played", "artist")));
    })

    // Playing it, or still playing it: said again every SPOTIFY_REFRESH_MS while it plays.
    .add("PUT", "/v1/me/spotify", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const found = await lookUp((await readJson(request)).url);
      const share: SpotifyShare = { ...found, until: Date.now() + SPOTIFY_SHARE_MS };
      await env.DB.prepare(
        "UPDATE users SET spotify_url = ?, spotify_kind = ?, spotify_title = ?, spotify_image = ?, spotify_subtitle = ?, spotify_until = ? WHERE id = ?",
      )
        .bind(share.url, share.kind, share.title, share.image, share.subtitle, share.until, user.id)
        .run();
      return json({ spotify: share });
    })

    // It stopped. What it was stays, for your recent plays.
    .add("DELETE", "/v1/me/spotify", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      await env.DB.prepare("UPDATE users SET spotify_until = 0 WHERE id = ?").bind(user.id).run();
      return json({ spotify: null });
    });
}
