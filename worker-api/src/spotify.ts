import { SPOTIFY_SHARE_MS, spotifyLink, type SpotifyKind, type SpotifyShare } from "../../shared-protocol/src";
import { HttpError, json, readJson } from "./http";
import type { Router } from "./router";
import { requireAccount } from "./session";

/**
 * What you're listening to on Spotify, from a link you paste (docs/product.md):
 * its name and cover come from Spotify's oEmbed, which needs no key, and stay
 * with your account until the share clears itself.
 */

/** Spotify's answers for a link barely change, so Cloudflare keeps them a day. */
const LOOKUP_TTL_SECONDS = 24 * 60 * 60;
/** A spotify.link short link goes through a redirect or two before it says where it leads. */
const MOST_HOPS = 3;

type Found = Omit<SpotifyShare, "until">;

/** What a link is, by Spotify's own account, or a 400 when it isn't one Spotify knows. */
export async function lookUp(value: unknown): Promise<Found> {
  let link = spotifyLink(value);
  for (let hop = 0; link && !link.kind && hop < MOST_HOPS; hop++) link = await follow(link.url);
  if (!link?.kind) throw new HttpError(400, "not_spotify", "Paste a link from Spotify: a song, album, playlist or Jam", "url");
  // A Jam is someone's live session: Spotify has nothing to say about it but the link.
  if (link.kind === "jam") return { url: link.url, kind: "jam", title: null, image: null };

  const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`, {
    cf: { cacheTtl: LOOKUP_TTL_SECONDS, cacheEverything: true },
  }).catch(() => null);
  if (!response?.ok) {
    throw new HttpError(response && response.status < 500 ? 400 : 502, "spotify_unknown", "Spotify can't find that link", "url");
  }
  const found = (await response.json()) as { title?: unknown; thumbnail_url?: unknown };
  const title = typeof found.title === "string" ? found.title.slice(0, 200) : null;
  const image = typeof found.thumbnail_url === "string" && /^https:\/\/[a-z0-9.-]+\.(scdn\.co|spotifycdn\.com)\//.test(found.thumbnail_url) ? found.thumbnail_url : null;
  return { url: link.url, kind: link.kind, title, image };
}

/** Where a short link leads, read from its redirect without loading the page. */
async function follow(url: string): Promise<{ url: string; kind: SpotifyKind | null } | null> {
  const response = await fetch(url, { redirect: "manual" }).catch(() => null);
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
  spotify_until: number | null;
}): SpotifyShare | null {
  if (!row.spotify_url || !row.spotify_kind || row.spotify_until === null) return null;
  return {
    url: row.spotify_url,
    kind: row.spotify_kind as SpotifyKind,
    title: row.spotify_title,
    image: row.spotify_image,
    until: row.spotify_until,
  };
}

export function spotifyRoutes(router: Router): void {
  router
    // What a link is, for the box you paste it into, before you share it.
    .add("GET", "/v1/spotify", async ({ request, env, ctx }) => {
      await requireAccount(env, request, ctx);
      return json({ found: await lookUp(new URL(request.url).searchParams.get("url")) });
    })

    .add("PUT", "/v1/me/spotify", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      const found = await lookUp((await readJson(request)).url);
      const share: SpotifyShare = { ...found, until: Date.now() + SPOTIFY_SHARE_MS };
      await env.DB.prepare(
        "UPDATE users SET spotify_url = ?, spotify_kind = ?, spotify_title = ?, spotify_image = ?, spotify_until = ? WHERE id = ?",
      )
        .bind(share.url, share.kind, share.title, share.image, share.until, user.id)
        .run();
      return json({ spotify: share });
    })

    // Stops sharing. The link stays, so sharing it again is one press.
    .add("DELETE", "/v1/me/spotify", async ({ request, env, ctx }) => {
      const user = await requireAccount(env, request, ctx);
      await env.DB.prepare("UPDATE users SET spotify_until = 0 WHERE id = ?").bind(user.id).run();
      return json({ spotify: null });
    });
}
