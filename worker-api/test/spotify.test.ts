import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spotifyLink } from "../../shared-protocol/src";
import { call, makeUser } from "./helpers";

type Share = { url: string; kind: string; title: string | null; image: string | null; until: number };

/** Spotify, as far as the share needs it: oEmbed for a couple of links, and one short link that redirects. */
beforeEach(() => {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href.startsWith("https://open.spotify.com/oembed")) {
      const asked = url.searchParams.get("url");
      if (asked === "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M") {
        return Response.json({ title: "Today's Top Hits", thumbnail_url: "https://image-cdn-fa.spotifycdn.com/image/abc" });
      }
      if (asked === "https://open.spotify.com/track/70cHKK8bHAfJrOGVnfRG9J") {
        return Response.json({ title: "A song", thumbnail_url: "https://evil.example.com/cover.jpg" });
      }
      return new Response("not found", { status: 404 });
    }
    if (url.href === "https://spotify.link/AbCdEf1234") {
      return new Response(null, { status: 307, headers: { Location: "https://open.spotify.com/socialsession/5f9a7c3e2b1d4e6f8a0b" } });
    }
    return realFetch(input, init);
  });
});
afterEach(() => vi.restoreAllMocks());

describe("spotify links", () => {
  it("reads every way Spotify writes a link, and nothing else", () => {
    expect(spotifyLink("https://open.spotify.com/intl-de/track/70cHKK8bHAfJrOGVnfRG9J?si=abc")).toEqual({
      url: "https://open.spotify.com/track/70cHKK8bHAfJrOGVnfRG9J",
      kind: "track",
    });
    expect(spotifyLink("spotify:album:4aawyAB9vmqN3uQ7FjRGTy")?.url).toBe("https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy");
    expect(spotifyLink("open.spotify.com/socialsession/5f9a7c3e2b1d4e6f8a0b")?.kind).toBe("jam");
    expect(spotifyLink("https://spotify.link/AbCdEf1234")).toEqual({ url: "https://spotify.link/AbCdEf1234", kind: null });
    expect(spotifyLink("https://link.tospotify.com/XyZ987abc")).toEqual({ url: "https://link.tospotify.com/XyZ987abc", kind: null });
    for (const bad of ["https://evil.com/track/70cHKK8bHAfJrOGVnfRG9J", "javascript:alert(1)", "https://open.spotify.com/user/abc", "", 42]) {
      expect(spotifyLink(bad), String(bad)).toBeNull();
    }
  });
});

describe("sharing what you're listening to", () => {
  it("shares a link with its name and cover, shows it to others while it lasts, and stops", async () => {
    const ada = await makeUser("Ada");
    const bo = await makeUser("Bo");

    const preview = await call<{ found: Share }>(ada, "GET", `/v1/spotify?url=${encodeURIComponent("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x")}`);
    expect(preview.body.found).toMatchObject({ kind: "playlist", title: "Today's Top Hits" });

    const shared = await call<{ spotify: Share }>(ada, "PUT", "/v1/me/spotify", { url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" });
    expect(shared.status).toBe(200);
    expect(shared.body.spotify).toMatchObject({ title: "Today's Top Hits", image: "https://image-cdn-fa.spotifycdn.com/image/abc" });
    expect(shared.body.spotify.until).toBeGreaterThan(Date.now() + 3 * 60 * 60 * 1000);

    const seen = await call<{ person: { spotify: Share | null } }>(bo, "GET", `/v1/people/${ada.id}`);
    expect(seen.body.person.spotify?.title).toBe("Today's Top Hits");

    await call(ada, "DELETE", "/v1/me/spotify");
    expect((await call<{ person: { spotify: Share | null } }>(bo, "GET", `/v1/people/${ada.id}`)).body.person.spotify).toBeNull();
    // You still see your last one, cleared, to share it again.
    const mine = (await call<{ user: { spotify: Share | null } }>(ada, "GET", "/v1/session")).body.user.spotify;
    expect(mine?.title).toBe("Today's Top Hits");
    expect(mine!.until).toBeLessThanOrEqual(Date.now());
  });

  it("follows a short link to a Jam, and keeps only Spotify's own images", async () => {
    const ada = await makeUser("Ada");
    const jam = await call<{ spotify: Share }>(ada, "PUT", "/v1/me/spotify", { url: "https://spotify.link/AbCdEf1234" });
    expect(jam.body.spotify).toMatchObject({ kind: "jam", url: "https://open.spotify.com/socialsession/5f9a7c3e2b1d4e6f8a0b", title: null });

    const song = await call<{ spotify: Share }>(ada, "PUT", "/v1/me/spotify", { url: "spotify:track:70cHKK8bHAfJrOGVnfRG9J" });
    expect(song.body.spotify).toMatchObject({ title: "A song", image: null });
  });

  it("refuses what isn't a Spotify link, and guests", async () => {
    const ada = await makeUser("Ada");
    const notSpotify = await call<{ error: { code: string; field: string } }>(ada, "PUT", "/v1/me/spotify", { url: "https://example.com" });
    expect(notSpotify.status).toBe(400);
    expect(notSpotify.body.error).toMatchObject({ code: "not_spotify", field: "url" });
    const unknown = await call<{ error: { code: string } }>(ada, "PUT", "/v1/me/spotify", { url: "https://open.spotify.com/album/0000000000000000000000" });
    expect(unknown.body.error.code).toBe("spotify_unknown");

    const guest = await makeUser("Gus", { guest: true });
    expect((await call(guest, "PUT", "/v1/me/spotify", { url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" })).status).toBe(403);
  });
});
