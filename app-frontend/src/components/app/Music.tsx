"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, X } from "@/components/ui/icons";
import { spotifyLink } from "@shared/spotify";
import { api } from "@/lib/api";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { playMusic, recentMusic, seekMusic, stopMusic, toggleMusic, useMusic, useMusicTime, warmMusic, type MusicItem } from "@/lib/music";
import { cn } from "@/lib/utils";
import { SpotifyMark } from "./SpotifyActivity";

/**
 * Picks for someone who hasn't played anything yet, so the first song is one
 * press: the theme of the show about an office, then playlists made for work.
 * Spotify's own, so they stay up; their names and covers are asked of Spotify.
 */
const PICKS: Array<Pick<MusicItem, "url" | "kind">> = [
  { url: "https://open.spotify.com/track/0KF8CY3SL3gyu65oLGhyGe", kind: "track" },
  { url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ", kind: "playlist" },
  { url: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn", kind: "playlist" },
  { url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO", kind: "playlist" },
  { url: "https://open.spotify.com/playlist/37i9dQZF1DX0SM0LYsmbMT", kind: "playlist" },
  { url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6", kind: "playlist" },
];
const ROWS = 6;

/** Picks as Spotify names them, asked once a session. */
const named = new Map<string, Promise<MusicItem | null>>();
function lookUp(url: string): Promise<MusicItem | null> {
  if (!named.has(url)) named.set(url, api.lookUpSpotify(url).then(({ found }) => found, () => null));
  return named.get(url)!;
}

const SIGN_IN = "https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F";

/**
 * Music, in your menu: what's playing with its controls, or what to play.
 * Spotify's own player plays it (lib/music.ts); while it plays it shows on
 * your card for others, who can listen too.
 */
export function MusicSection() {
  const t = useTranslations("music");
  const { item } = useMusic();
  const [choosing, setChoosing] = useState(false);
  useEffect(warmMusic, []);

  if (item && !choosing) return <NowPlaying item={item} onChange={() => setChoosing(true)} />;
  if (!choosing)
    return (
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-start text-[13px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
      >
        <SpotifyMark className="size-4 text-[#1ed760]" />
        <span className="min-w-0 flex-1 truncate">{t("play")}</span>
      </button>
    );
  return <Picker onDone={() => setChoosing(false)} canClose={!!item} />;
}

/** One press to play: recent plays first, then the picks, and any Spotify link pasted below. */
function Picker({ onDone, canClose }: { onDone: () => void; canClose: boolean }) {
  const t = useTranslations("music");
  const ts = useTranslations("spotify");
  const [items, setItems] = useState<MusicItem[]>(() => recentMusic());
  useEffect(() => {
    let cancelled = false;
    Promise.all(PICKS.map((pick) => lookUp(pick.url))).then((found) => {
      if (cancelled) return;
      const picks = found.filter((one): one is MusicItem => !!one);
      const recent = recentMusic();
      setItems([...recent, ...picks.filter((pick) => !recent.some((one) => one.url === pick.url))].slice(0, ROWS));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const play = (item: MusicItem) => {
    void playMusic(item);
    onDone();
  };

  return (
    <div className="pb-1">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
          <SpotifyMark className="size-3 text-[#1ed760]" />
          {t("title")}
        </p>
        <button
          type="button"
          onClick={onDone}
          aria-label={t("close")}
          className={cn(
            "-me-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            !canClose && "hidden",
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ul className="max-h-[14.5rem] overflow-y-auto">
        {(items.length ? items : PICKS.map((pick) => ({ ...pick, title: null, image: null, subtitle: null }))).map((one) => (
          <li key={one.url}>
            <button
              type="button"
              onClick={() => play(one)}
              disabled={!one.title}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-default"
            >
              <Cover image={one.image} size="size-8" />
              <span className="min-w-0 flex-1">
                {one.title ? (
                  <>
                    <span className="block truncate text-[13px] font-medium text-foreground">{one.title}</span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">{one.subtitle ?? kindLabel(one, ts)}</span>
                  </>
                ) : (
                  <>
                    <span className="block h-2.5 w-24 animate-pulse rounded bg-foreground/[0.08]" />
                    <span className="mt-1.5 block h-2 w-14 animate-pulse rounded bg-foreground/[0.06]" />
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <LinkField onPlay={play} />
    </div>
  );
}

/** Any song, album, playlist, podcast or Jam, by its Spotify link: pasted, it plays. */
function LinkField({ onPlay }: { onPlay: (item: MusicItem) => void }) {
  const t = useTranslations("music");
  const explain = useErrorMessage();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const go = async (value: string) => {
    const link = spotifyLink(value);
    if (!link) return setError(value.trim() ? t("notSpotify") : "");
    setBusy(true);
    setError("");
    try {
      const { found } = await api.lookUpSpotify(link.url);
      setText("");
      onPlay(found);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="px-1 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        void go(text);
      }}
    >
      <label className="flex h-9 items-center gap-2 rounded-[10px] bg-foreground/[0.05] px-2.5 focus-within:ring-2 focus-within:ring-foreground/15">
        <Link2 className={cn("size-3.5 shrink-0 text-muted-foreground", busy && "animate-pulse")} />
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          // A pasted link plays straight away; typed, it waits for Enter.
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (spotifyLink(pasted)) {
              event.preventDefault();
              setText(pasted);
              void go(pasted);
            }
          }}
          placeholder={t("paste")}
          aria-label={t("paste")}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-faint"
        />
      </label>
      {error && <p className="px-1.5 pt-1.5 text-[11.5px] text-destructive">{error}</p>}
    </form>
  );
}

/** What's playing: its cover, name and who made it, play and pause, and where it is. */
function NowPlaying({ item, onChange }: { item: MusicItem; onChange: () => void }) {
  const t = useTranslations("music");
  const ts = useTranslations("spotify");
  const { playing, loading, preview } = useMusic();
  const jam = item.kind === "jam";

  return (
    <div className="px-2.5 pb-2 pt-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
          <SpotifyMark className="size-3 text-[#1ed760]" />
          {jam ? ts("inJam") : t("title")}
        </p>
        <div className="-me-1.5 flex items-center">
          <button
            type="button"
            onClick={onChange}
            className="cursor-pointer rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("change")}
          </button>
          <button
            type="button"
            onClick={stopMusic}
            aria-label={t("stop")}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        <a href={item.url} target="_blank" rel="noopener noreferrer" title={ts("open")} className="shrink-0">
          <Cover image={item.image} size="size-10" />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[13px] font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {item.title ?? t("yourJam")}
          </a>
          <p className="truncate text-[11.5px] text-muted-foreground">{jam ? ts("jamNote") : (item.subtitle ?? kindLabel(item, ts))}</p>
        </div>
        {!jam && (
          <button
            type="button"
            onClick={toggleMusic}
            disabled={loading}
            aria-label={playing ? t("pause") : t("resume")}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {loading ? <span className="size-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" /> : <PlayGlyph playing={playing} />}
          </button>
        )}
      </div>

      {!jam && <Seek />}
      {preview && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {t("preview")}{" "}
          <a href={SIGN_IN} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-2 hover:underline">
            {t("signIn")}
          </a>
        </p>
      )}
    </div>
  );
}

/** A thin bar with where it is and how long it runs; drag or press to move. */
function Seek() {
  const t = useTranslations("music");
  const { position, duration } = useMusicTime();
  const [dragging, setDragging] = useState<number | null>(null);
  const at = dragging ?? position;
  const share = duration ? Math.min(1, at / duration) : 0;

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={1000}
        value={Math.min(at, duration || 1)}
        disabled={!duration}
        aria-label={t("seek")}
        onChange={(event) => setDragging(Number(event.target.value))}
        onPointerUp={() => {
          if (dragging !== null) seekMusic(dragging);
          setDragging(null);
        }}
        onKeyUp={() => {
          if (dragging !== null) seekMusic(dragging);
          setDragging(null);
        }}
        style={{ "--share": `${share * 100}%` } as React.CSSProperties}
        className="music-seek min-w-0 flex-1"
      />
      <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
        {clock(at)} / {clock(duration)}
      </span>
    </div>
  );
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="0.8" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="0.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="ms-0.5 size-3.5" fill="currentColor" aria-hidden>
      <path d="M4.5 2.9v10.2a.8.8 0 0 0 1.2.7l8.3-5.1a.8.8 0 0 0 0-1.4L5.7 2.2a.8.8 0 0 0-1.2.7Z" />
    </svg>
  );
}

function Cover({ image, size }: { image: string | null; size: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Spotify's own cover, from its CDN.
    <img src={image} alt="" className={cn(size, "shrink-0 rounded-md bg-muted object-cover")} />
  ) : (
    <span className={cn(size, "flex shrink-0 items-center justify-center rounded-md bg-[#1ed760]/12 text-[#1ed760]")}>
      <SpotifyMark className="size-1/2" />
    </span>
  );
}

function kindLabel(item: Pick<MusicItem, "kind">, t: ReturnType<typeof useTranslations>) {
  return t(`kinds.${item.kind}`);
}

/** 3:07, or 1:02:44 for a long episode. */
function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** The dock's second line while something plays: Spotify's mark and its name. */
export function MusicLine() {
  const { item, playing } = useMusic();
  if (!item || !playing) return null;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <SpotifyMark className="size-3 shrink-0 text-[#1ed760]" />
      <span className="truncate">{item.title}</span>
    </span>
  );
}
