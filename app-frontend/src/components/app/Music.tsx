"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "@/components/ui/icons";
import { MenuRow } from "@/components/ui/MenuViews";
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
  if (!named.has(url))
    named.set(
      url,
      api.lookUpSpotify(url).then(
        ({ found }) => found,
        () => null,
      ),
    );
  return named.get(url)!;
}

const SIGN_IN = "https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F";

/**
 * Music in your menu, as a row: what's playing, with play and pause to hand,
 * or a way to play something. Pressed, its controls and picks open beneath.
 */
export function MusicRow({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useTranslations("music");
  const ts = useTranslations("spotify");
  const { item, playing, loading } = useMusic();
  // Ready before the row is pressed: the player's script, and the picks' names and covers.
  useEffect(() => {
    warmMusic();
    PICKS.forEach((pick) => void lookUp(pick.url));
  }, []);

  if (!item) {
    return (
      <MenuRow icon={<SpotifyMark className="text-[#1ed760]" />} onClick={onToggle} open={open}>
        {open ? t("title") : t("play")}
      </MenuRow>
    );
  }
  const jam = item.kind === "jam";
  return (
    <MenuRow
      icon={<Cover image={item.image} size="size-5" rounded="rounded-[4px]" />}
      onClick={onToggle}
      open={open}
      label={item.title ?? t("yourJam")}
      action={
        jam ? undefined : (
          <button
            type="button"
            onClick={toggleMusic}
            disabled={loading}
            aria-label={playing ? t("pause") : t("resume")}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.08]"
          >
            <PlayGlyph playing={playing || loading} small />
          </button>
        )
      }
    >
      <span className="block truncate">{item.title ?? t("yourJam")}</span>
      {/* Who made it, once it's open; folded, the row stays one line like the others. */}
      {open && (
        <span className="block truncate text-[11.5px] text-muted-foreground">
          {jam ? ts("jamNote") : (item.subtitle ?? ts(`kinds.${item.kind}`))}
        </span>
      )}
    </MenuRow>
  );
}

/**
 * Beneath the music row: where what's playing is, with stop, then what to
 * play next, one press each, and a field for any Spotify link. What's playing
 * is the row itself, so it isn't said twice.
 */
export function MusicOptions({ onDone }: { onDone: () => void }) {
  const { item } = useMusic();
  return (
    <>
      {item && <Playing item={item} />}
      <Picker playing={item?.url ?? null} onPlay={onDone} />
    </>
  );
}

/** One press to play: recent plays first, then the picks, and any Spotify link pasted below. */
function Picker({ playing, onPlay }: { playing: string | null; onPlay: () => void }) {
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
  // Every row has its place from the start, a placeholder until Spotify names it, so nothing
  // moves under the pointer as the names arrive (the menu grows upward from the dock).
  const waiting = PICKS.filter((pick) => !items.some((one) => one.url === pick.url)).map((pick) => ({
    ...pick,
    title: null,
    image: null,
    subtitle: null,
  }));
  // What's playing is above, with its controls; the list is for what's next.
  const shown = [...items, ...waiting].slice(0, ROWS).filter((one) => one.url !== playing);

  return (
    <div className={cn(playing && "mt-1 border-t border-foreground/[0.07] pt-1")}>
      {playing && <p className="px-2 pb-0.5 pt-1 text-[11px] font-medium text-faint">{t("next")}</p>}
      <ul>
        {shown.map((one) => (
          <li key={one.url}>
            <button
              type="button"
              onClick={() => {
                void playMusic(one);
                // It plays in the row above, which is all there is to see now.
                onPlay();
              }}
              disabled={!one.title}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-1.5 py-1.5 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06] disabled:cursor-default"
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
      <LinkField
        onPlay={(found) => {
          void playMusic(found);
          onPlay();
        }}
      />
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
      className="pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        void go(text);
      }}
    >
      <label className="flex h-9 items-center gap-2 rounded-[9px] bg-background px-2.5 ring-1 ring-foreground/[0.08] focus-within:ring-2 focus-within:ring-foreground/20">
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

/** Where what's playing is, and a way to stop it; a word on previews when Spotify only plays those here. */
function Playing({ item }: { item: MusicItem }) {
  const t = useTranslations("music");
  const ts = useTranslations("spotify");
  const { preview } = useMusic();
  const jam = item.kind === "jam";

  return (
    <div className="px-2 pb-1 pt-0.5">
      <div className="flex items-center gap-2">
        {jam ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate py-1.5 text-[12.5px] font-medium text-foreground underline-offset-2 hover:underline"
          >
            {ts("open")}
          </a>
        ) : (
          <Seek />
        )}
        {/* A square: stop, as on every player. An × would read as closing the menu. */}
        <button
          type="button"
          onClick={stopMusic}
          aria-label={t("stop")}
          title={t("stop")}
          className="-me-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          <svg viewBox="0 0 16 16" className="size-[11px]" fill="currentColor" aria-hidden>
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
          </svg>
        </button>
      </div>
      {preview && (
        <p className="pb-0.5 text-[11px] text-muted-foreground">
          {t("preview")}{" "}
          <a
            href={SIGN_IN}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
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
    <div className="flex min-w-0 flex-1 items-center gap-2">
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

function PlayGlyph({ playing, small = false }: { playing: boolean; small?: boolean }) {
  const size = small ? "size-3" : "size-3.5";
  return playing ? (
    <svg viewBox="0 0 16 16" className={size} fill="currentColor" aria-hidden>
      <rect x="3.5" y="2.5" width="3" height="11" rx="0.8" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="0.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className={cn("ms-0.5", size)} fill="currentColor" aria-hidden>
      <path d="M4.5 2.9v10.2a.8.8 0 0 0 1.2.7l8.3-5.1a.8.8 0 0 0 0-1.4L5.7 2.2a.8.8 0 0 0-1.2.7Z" />
    </svg>
  );
}

function Cover({ image, size, rounded = "rounded-md" }: { image: string | null; size: string; rounded?: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Spotify's own cover, from its CDN.
    <img src={image} alt="" className={cn(size, rounded, "max-w-none shrink-0 bg-muted object-cover")} />
  ) : (
    <span className={cn(size, rounded, "flex shrink-0 items-center justify-center bg-[#1ed760]/12 text-[#1ed760]")}>
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
