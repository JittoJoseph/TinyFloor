"use client";

import { useSyncExternalStore } from "react";
import { SPOTIFY_REFRESH_MS, spotifyUri, type SpotifyShare } from "@shared/spotify";
import { api } from "@/lib/api";
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

/** What Spotify's player says it is doing, several times a second while it plays. */
function heard(update: PlaybackUpdate) {
  time = { position: update.position, duration: update.duration };
  const playing = !update.isPaused;
  const ended = nearEnd && !playing && now.playing;
  nearEnd = playing && update.duration > 0 && update.duration - update.position < 2500;
  if (ended && now.item?.kind === "track") void nextMusic();
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

/** The songs still to play, after the one playing. */
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
 * card. An album, playlist or artist plays one song at a time, so what's
 * playing, here and on your card, is always the song. What was chosen goes
 * first in the picks next time.
 */
export async function playMusic(item: MusicItem) {
  remember(item);
  const pick = ++picks;
  queue = [];
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
  // Spotify wouldn't list them: it plays as a whole, under what was picked.
  if (!songs.length) return load(item, item.url);
  queue = item.kind === "playlist" ? shuffled(songs) : songs;
  queueCover = item.image;
  playSong(queue.shift()!, item.url);
}

/**
 * The next song: the next in the list, or, when the list runs out, the
 * best-known songs of an artist on the last few played who hasn't had a turn,
 * the nearest thing to radio Spotify's player offers. It stops when there's
 * no one new.
 */
export async function nextMusic() {
  const song = queue.shift();
  if (song) return playSong(song, now.from);
  const pick = picks;
  const after = await api.spotifyAfter(heardSongs.slice(0, SEEDS), heardArtists).catch(() => null);
  if (pick !== picks || !now.item) return;
  const fresh = after?.tracks.filter((one) => !heardSongs.includes(one.url)) ?? [];
  if (!after?.artist || !fresh.length) {
    controller?.pause();
    return;
  }
  heardArtists.push(after.artist);
  queue = fresh;
  queueCover = null;
  playSong(queue.shift()!, after.artist);
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

/** Puts it in Spotify's player and plays it. */
async function load(item: MusicItem, from: string | null) {
  const uri = spotifyUri(item);
  if (!uri) return;
  if (item.kind === "track") heardSongs = [item.url, ...heardSongs.filter((one) => one !== item.url)].slice(0, HEARD_MAX);
  time = { position: 0, duration: 0 };
  nearEnd = false;
  setNow({ item, from, loading: true, playing: false });
  playWhenReady = true;
  const made = controller;
  if (made) made.loadUri(uri);
  else await player(uri);
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
