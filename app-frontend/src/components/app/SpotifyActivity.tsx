"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Play } from "@/components/ui/icons";
import { spotifyEmbed, type SpotifyShare } from "@shared/spotify";
import { Dialog } from "@/components/ui/Dialog";
import { useCloseMenu } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";

/** Spotify's own mark, as its brand guidelines ask: whole, unaltered, in its green or in one plain colour. */
export function SpotifyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

/** What is open in the player, app-wide: a card closes as you click away from it, the player doesn't. */
let playing: { share: SpotifyShare; name: string } | null = null;
const listeners = new Set<() => void>();
function play(next: typeof playing) {
  playing = next;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Spotify's own player, for what someone on a card is listening to: it plays
 * on the account of whoever opened it (the whole song when they're signed in
 * to Spotify in this browser, a preview otherwise) and stops when it closes.
 * Spotify asks that nothing of theirs plays without its cover and name on
 * screen, so it plays only here, never out of sight. Mounted once, at the root.
 */
export function SpotifyPlayer() {
  const t = useTranslations("spotify");
  const tc = useTranslations("common");
  const open = useSyncExternalStore(
    subscribe,
    () => playing,
    () => null,
  );
  const embed = open && spotifyEmbed(open.share);
  // A single song or episode is the short player; a list shows its songs.
  const tall = !!open && !["track", "episode"].includes(open.share.kind);
  return (
    <Dialog open={!!embed} onClose={() => play(null)} title={open ? t("playerTitle", { name: open.name }) : ""} closeLabel={tc("close")}>
      {embed && (
        <iframe
          src={`${embed}?utm_source=generator`}
          title={open.share.title ?? t("kinds.track")}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className={cn("mb-3 block w-full rounded-xl border-0", tall ? "h-[352px]" : "h-[152px]")}
        />
      )}
    </Dialog>
  );
}

/**
 * What someone is listening to, on their card: the cover and the name Spotify
 * gives it, a link back to it (Spotify asks for one wherever its content
 * shows), and Listen, which opens Spotify's player (SpotifyPlayer). A Jam has
 * nothing to show but itself, and joining happens in Spotify.
 */
export function SpotifyActivity({ share, name, className }: { share: SpotifyShare; name: string; className?: string }) {
  const t = useTranslations("spotify");
  const closeCard = useCloseMenu();
  const embed = spotifyEmbed(share);
  const jam = share.kind === "jam";

  return (
    <div className={cn("rounded-xl bg-foreground/[0.04] p-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
        <SpotifyMark className="size-3.5 text-[#1ed760]" />
        {jam ? t("inJam") : t("listening")}
      </p>
      <a href={share.url} target="_blank" rel="noopener noreferrer" className="group mt-2 flex items-center gap-2.5">
        {share.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify's own cover, from its CDN, as it gave it.
          <img src={share.image} alt="" width={44} height={44} className="size-11 shrink-0 rounded-md bg-muted object-cover" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#1ed760]/12 text-[#1ed760]">
            <SpotifyMark className="size-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground group-hover:underline">
            {share.title ?? t("jamOf", { name })}
          </span>
          <span className="block truncate text-[12px] text-muted-foreground">{jam ? t("jamNote") : t(`kinds.${share.kind}`)}</span>
        </span>
      </a>
      <div className="mt-2.5 flex gap-1.5">
        {embed ? (
          <button
            type="button"
            onClick={() => {
              closeCard();
              play({ share, name });
            }}
            className="inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-foreground text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/85"
          >
            <Play className="size-3.5" />
            {t("listen")}
          </button>
        ) : null}
        <a
          href={share.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12.5px] font-medium transition-colors",
            (jam || !embed) && "flex-1",
            jam ? "bg-foreground text-background hover:bg-foreground/85" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]",
          )}
        >
          {jam ? t("joinJam") : t("open")}
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
