"use client";

import { useSyncExternalStore } from "react";
import { SPOTIFY_REFRESH_MS, spotifyLink, spotifyUri, type SpotifyShare } from "shared-protocol/spotify";
import { api } from "web-shared/lib/api";
import { track } from "web-shared/lib/analytics";
import { follow, startFollowing } from "./musicFollow";
import { forgetPerson } from "@/lib/people";

/** Something to play: a song, album, playlist, podcast or artist, or a Jam (which plays in Spotify). */
export type MusicItem = Omit<SpotifyShare, "until">;

export interface MusicNow {
  /** What's playing: a song, even from an album, playlist or artist, which play one song at a time. */
  item: MusicItem | null;
  /** The album, playlist or artist it's playing from, by its link; null for a song picked on its own. */
  from: string | null;
  playing: boolean;
  /** Picked, and Spotify's player hasn't started it yet. */
  loading: boolean;
  /** Spotify plays 30-second previews to anyone not signed in to it in this browser. */
  preview: boolean;
}

export interface MusicTime {
  /** Milliseconds. */
  position: number;
  duration: number;
}

interface Controller {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  addListener(event: "ready", listener: () => void): void;
  addListener(event: "playback_update", listener: (event: { data: PlaybackUpdate }) => void): void;
}

interface PlaybackUpdate {
  isPaused: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
  /** The song playing, as Spotify's player names it ("spotify:track:…"): from a list, it changes by itself. */
  playingURI?: string;
}

interface IFrameApi {
  createController(
    element: HTMLElement,
    options: { uri: string; width: number; height: number },
    ready: (controller: Controller) => void,
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void;
  }
}

const SCRIPT = "https://open.spotify.com/embed/iframe-api/v1";
const RECENT_KEY = "tinyfloorMusicRecent";
const RECENT_MAX = 4;
/** A pause this long stops it showing on your card; a shorter one is someone answering the door. */
const PAUSE_STOPS_SHARING_MS = 30_000;
/** Spotify's previews run 30 seconds; whole songs that short are rare enough. */
const PREVIEW_MS = { min: 25_000, max: 30_500 };
/** This close to its end, a song has finished (Spotify's last word on one is its full length, still "playing"). */
const END_MS = 400;
/** After a song ends, how long a list has to go on to its next one before what plays on comes instead. */
const ADVANCE_WAIT_MS = 2500;

let now: MusicNow = { item: null, from: null, playing: false, loading: false, preview: false };
let time: MusicTime = { position: 0, duration: 0 };
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function setNow(next: Partial<MusicNow>) {
  now = { ...now, ...next };
  changed();
}

let api$: Promise<IFrameApi> | null = null;
let controller: Controller | null = null;
let controllerReady: Promise<Controller> | null = null;
/** Start playing as soon as what was loaded is ready: set by a pick, used once. */
let playWhenReady = false;
let sharedUrl: string | null = null;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let pauseTimer: ReturnType<typeof setTimeout> | undefined;

/** Spotify's iFrame API, loaded once and only when someone first plays something. */
function iframeApi(): Promise<IFrameApi> {
  api$ ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    document.head.appendChild(script);
  });
  return api$;
}

/** Fetches the iFrame API ahead of a pick, so the first one starts sooner. */
export function warmMusic() {
  if (typeof window !== "undefined") void iframeApi();
}

/**
 * Spotify's own player, made once and kept on the page: our controls drive it
 * through Spotify's iFrame API, and the cover, name and Spotify's mark show in
 * your menu and the dock while it plays. It sits in the corner, see-through and
 * out of the way of clicks: a browser stops a player that is off screen, or
 * behind the page, from playing.
 */
function player(uri: string): Promise<Controller> {
  controllerReady ??= iframeApi().then(
    (spotify) =>
      new Promise<Controller>((resolve) => {
        const box = document.createElement("div");
        box.setAttribute("aria-hidden", "true");
        box.style.cssText = "position:fixed;left:0;bottom:0;width:320px;height:80px;opacity:0;pointer-events:none;z-index:2147483000";
        const mount = document.createElement("div");
        box.appendChild(mount);
        document.body.appendChild(box);
        spotify.createController(mount, { uri, width: 320, height: 80 }, (made) => {
          made.addListener("ready", () => {
            if (!playWhenReady) return;
            playWhenReady = false;
            made.play();
          });
          made.addListener("playback_update", ({ data }) => heard(data));
          controller = made;
          resolve(made);
        });
      }),
  );
  return controllerReady;
}

/** Whether the last word from the player had a song playing in its last seconds: then a pause is its end. */
let nearEnd = false;
/** The song Spotify's player last said it was on. */
let playingUri = "";
/** Which of a list's songs the player is on (musicFollow), and how many times it has moved on. */
let following = startFollowing();
let moves = 0;
let endTimer: ReturnType<typeof setTimeout> | undefined;
/** Skip was pressed before the list's song had started. */
let skipWhenStarted = false;

/**
 * What Spotify's player says it is doing, about once a second while it plays,
 * and in a background tab too. A list goes on to its next song by itself,
 * named here when it does; a song that ends with nothing after it in the
 * player (one picked on its own, or a list's last) is followed by what plays
 * on (nextMusic).
 */
function heard(update: PlaybackUpdate) {
  time = { position: update.position, duration: update.duration };
  const playing = !update.isPaused;
  if (skipWhenStarted && list && update.duration > 0) {
    skipWhenStarted = false;
    controller?.seek(Math.max(0, update.duration - 300) / 1000);
  }
  let moved = false;
  if (list) {
    const next = follow(following, update, list.order.map((song) => spotifyUri(song) ?? ""));
    following = next.state;
    moved = next.moved;
    if (moved) showListSong(next.state.index, update.playingURI);
  } else if (update.playingURI && update.playingURI !== playingUri) {
    moved = !!playingUri;
  }
  if (update.playingURI) playingUri = update.playingURI;
  if (moved) {
    moves++;
    clearTimeout(endTimer);
    endTimer = undefined;
  }
  const atEnd = update.duration > 0 && update.position >= update.duration - END_MS;
  const ended = (nearEnd && !playing && now.playing) || (playing && atEnd);
  nearEnd = playing && update.duration > 0 && update.duration - update.position < 2500;
  if (ended && !endTimer && now.item && now.item.kind !== "jam") {
    const ending = moves;
    endTimer = setTimeout(() => {
      endTimer = undefined;
      // Still on the song that ended: nothing came after it in the player.
      if (moves === ending && now.item) {
        list = null;
        void nextMusic();
      }
    }, ADVANCE_WAIT_MS);
  }
  const preview = update.duration > PREVIEW_MS.min && update.duration <= PREVIEW_MS.max;
  if (playing !== now.playing || preview !== now.preview || (now.loading && (playing || update.duration > 0))) {
    setNow({ playing, preview, loading: now.loading && !playing });
    sharing(playing);
  } else {
    changed();
  }
}

/** What plays as a list of songs, one at a time. */
const LISTS: MusicItem["kind"][] = ["album", "playlist", "artist"];
/** Songs remembered since the last pick, so what plays on doesn't repeat them. */
const HEARD_MAX = 200;
/** Songs asked about for what plays on, newest first. */
const SEEDS = 5;

/**
 * An album, playlist or artist playing whole in Spotify's player, which goes
 * from song to song itself: with its songs by their player names, for showing
 * each as it comes. Loading songs one at a time instead stopped at the first
 * song's end in a background tab: Spotify's player won't start anything newly
 * loaded while its tab is hidden, but goes on through a list it has.
 */
let list: { url: string; order: MusicItem[]; songs: Map<string, MusicItem>; cover: string | null } | null = null;

/** The songs still to play, after the one playing (what plays on after a list). */
let queue: MusicItem[] = [];
/** Their album's or playlist's cover, until a song's own arrives. */
let queueCover: string | null = null;
/** Since the last pick: songs played, newest first, and the artists whose best-known songs played on. */
let heardSongs: string[] = [];
let heardArtists: string[] = [];
/** Counts picks, so an answer that arrives after another pick is dropped. */
let picks = 0;

/**
 * Plays something, from a press: a pick, a pasted link, or Listen on someone's
 * card. An album, playlist or artist plays whole in Spotify's player, in its
 * own order, and what's playing, here and on your card, is always the song.
 * What was chosen goes first in the picks next time.
 */
export async function playMusic(item: MusicItem, source: "pick" | "recent" | "link" | "card") {
  remember(item);
  // What and from where, never the song: is the music player used?
  track("music_played", { kind: item.kind, source });
  const pick = ++picks;
  queue = [];
  list = null;
  skipWhenStarted = false;
  heardSongs = [];
  heardArtists = item.kind === "artist" ? [item.url] : [];
  if (item.kind === "jam") {
    // A Jam plays in Spotify; here it goes on your card for others to join.
    controller?.pause();
    setNow({ item, from: null, playing: false, loading: false });
    share(item.url);
    return;
  }
  if (!LISTS.includes(item.kind)) return load(item, null);
  // Named as what was picked while its songs are asked for.
  setNow({ item, from: item.url, loading: true, playing: false });
  const songs = await api.spotifySongs(item.url).then(
    ({ tracks }) => tracks,
    () => [],
  );
  if (pick !== picks) return;
  // The whole list into Spotify's player, which plays it on from song to song; named song by song as it does.
  list = {
    url: item.url,
    order: songs,
    songs: new Map(songs.flatMap((song) => {
      const uri = spotifyUri(song);
      return uri ? [[uri, song]] : [];
    })),
    cover: item.image,
  };
  queueCover = item.image;
  const first = songs[0];
  void load(item, item.url, first ? { ...first, image: first.image ?? item.image } : item);
}

/**
 * The list's next song, as Spotify's player moved on to it: by the song it
 * names (signed out), or the next in the list (signed in, when it names only
 * the list); its name now, its cover once known.
 */
function showListSong(index: number, named?: string) {
  if (!list) return;
  const url = named?.startsWith("spotify:track:") ? spotifyLink(named)?.url : undefined;
  const known = (named && list.songs.get(named)) || (url ? undefined : list.order[index]);
  if (!known && !url) return;
  const song: MusicItem = known ?? { url: url!, kind: "track", title: null, subtitle: null, image: null };
  heardSongs = [song.url, ...heardSongs.filter((one) => one !== song.url)].slice(0, HEARD_MAX);
  setNow({ item: { ...song, image: song.image ?? list.cover }, from: list.url });
  if (song.image && song.title) return;
  void api.lookUpSpotify(song.url).then(
    ({ found }) => {
      if (now.item?.url === song.url) setNow({ item: { ...now.item, ...found, image: found.image ?? now.item.image } });
    },
    () => {},
  );
}

/**
 * The next song: the next in the list, or, when the list runs out, a few songs
 * from the artist of the last one played, then from artists Spotify says their
 * fans also like, the nearest thing to radio Spotify's player offers. It stops
 * when there's no one new.
 */
export async function nextMusic() {
  // A list in Spotify's player: to the end of this song, and it goes on to the next itself;
  // pressed before the song has started, as soon as its length is known.
  if (list) {
    if (time.duration > 0) controller?.seek(Math.max(0, time.duration - 300) / 1000);
    else skipWhenStarted = true;
    return;
  }
  const song = queue.shift();
  if (song) return playSong(song, now.from);
  const pick = picks;
  // An artist whose songs here were all heard already has had their turn: ask again, a few times.
  for (let tries = 0; tries < 3; tries++) {
    const after = await api.spotifyAfter(heardSongs.slice(0, SEEDS), heardArtists).catch(() => null);
    if (pick !== picks || !now.item) return;
    if (!after?.artist) break;
    heardArtists.push(after.artist);
    const fresh = after.tracks.filter((one) => !heardSongs.includes(one.url));
    if (!fresh.length) continue;
    queue = fresh;
    queueCover = null;
    return playSong(queue.shift()!, after.artist);
  }
  controller?.pause();
}

/** One song from a list: its name now, its own cover once Spotify gives it. */
function playSong(song: MusicItem, from: string | null) {
  void load({ ...song, image: song.image ?? queueCover }, from);
  if (song.image) return;
  void api.lookUpSpotify(song.url).then(
    ({ found }) => {
      if (now.item?.url === song.url && found.image) setNow({ item: { ...now.item, image: found.image } });
    },
    () => {},
  );
}

/**
 * Puts it in Spotify's player and plays it; `showing` is what's said to be
 * playing meanwhile (a list's first song). Spotify's player won't start
 * anything loaded while its tab is hidden, so then it's loaded the moment the
 * tab is back, named and waiting till then.
 */
async function load(item: MusicItem, from: string | null, showing: MusicItem = item) {
  const uri = spotifyUri(item);
  if (!uri) return;
  if (showing.kind === "track") heardSongs = [showing.url, ...heardSongs.filter((one) => one !== showing.url)].slice(0, HEARD_MAX);
  time = { position: 0, duration: 0 };
  nearEnd = false;
  clearTimeout(endTimer);
  endTimer = undefined;
  playingUri = "";
  following = startFollowing();
  setNow({ item: showing, from, loading: true, playing: false });
  const pick = picks;
  await whenShown();
  if (pick !== picks) return;
  playWhenReady = true;
  const made = controller;
  if (made) made.loadUri(uri);
  else await player(uri);
}

/** Now if the tab is showing, or as soon as it is again. */
function whenShown(): Promise<void> {
  if (document.visibilityState !== "hidden") return Promise.resolve();
  return new Promise((resolve) => {
    const shown = () => {
      if (document.visibilityState === "hidden") return;
      document.removeEventListener("visibilitychange", shown);
      resolve();
    };
    document.addEventListener("visibilitychange", shown);
  });
}

export function toggleMusic() {
  controller?.togglePlay();
}

export function seekMusic(ms: number) {
  controller?.seek(ms / 1000);
  time = { ...time, position: ms };
  changed();
}

export function stopMusic() {
  playWhenReady = false;
  picks++;
  queue = [];
  list = null;
  skipWhenStarted = false;
  clearTimeout(endTimer);
  endTimer = undefined;
  controller?.pause();
  setNow({ item: null, from: null, playing: false, loading: false });
  time = { position: 0, duration: 0 };
  unshare();
}

/** On your card while it plays: said again every few minutes, and taken off after a while paused. */
function sharing(playing: boolean) {
  clearTimeout(pauseTimer);
  if (playing && now.item) {
    share(now.item.url);
  } else if (sharedUrl && now.item?.kind !== "jam") {
    pauseTimer = setTimeout(unshare, PAUSE_STOPS_SHARING_MS);
  }
}

function share(url: string) {
  setListening(now.item?.kind !== "jam");
  if (sharedUrl !== url) {
    sharedUrl = url;
    void api.shareSpotify(url).then(mine, () => {});
  }
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => sharedUrl && void api.shareSpotify(sharedUrl).catch(() => {}), SPOTIFY_REFRESH_MS);
}

function unshare() {
  clearInterval(refreshTimer);
  clearTimeout(pauseTimer);
  setListening(false);
  if (!sharedUrl) return;
  sharedUrl = null;
  void api.stopSpotify().then(mine, () => {});
}

/** Playing, for the mark on your name tag: the floor hears it from your own socket (GameScene listens for `listeningChange`). */
let listening = false;
function setListening(on: boolean) {
  if (on === listening) return;
  listening = on;
  window.dispatchEvent(new CustomEvent("listeningChange", { detail: { on } }));
}
export const isListening = () => listening;

/** Your own card shows the change at once. */
let myId: string | null = null;
export function setMusicOwner(id: string | null) {
  myId = id;
}
function mine() {
  if (myId) forgetPerson(myId);
}

/** What was played here lately, newest first, kept in this browser for one-press replays. */
export function recentMusic(): MusicItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as MusicItem[];
    return Array.isArray(saved) ? saved.filter((one) => one && typeof one.url === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function remember(item: MusicItem) {
  try {
    const rest = recentMusic().filter((one) => one.url !== item.url);
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...rest].slice(0, RECENT_MAX)));
  } catch {}
}

const serverNow: MusicNow = { item: null, from: null, playing: false, loading: false, preview: false };
const serverTime: MusicTime = { position: 0, duration: 0 };

export function useMusic(): MusicNow {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => serverNow,
  );
}

/** Where it is in what's playing: changes several times a second, so only the seek bar reads it. */
export function useMusicTime(): MusicTime {
  return useSyncExternalStore(
    subscribe,
    () => time,
    () => serverTime,
  );
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__music = { play: (item: MusicItem) => playMusic(item, "pick"), next: nextMusic, now: () => now, time: () => time };
}
