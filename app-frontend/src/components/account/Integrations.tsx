"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { liveShare, spotifyLink, type SpotifyShare } from "@shared/spotify";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { forgetPerson } from "@/lib/people";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { fieldClass } from "@/components/ui/forms";
import { Group } from "@/components/app/SettingsView";
import { SpotifyMark } from "@/components/app/SpotifyActivity";
import { cn } from "@/lib/utils";

/** The other apps your account works with. Spotify for now. */
export function Integrations() {
  return <Spotify />;
}

/**
 * What you're listening to, on your profile card: from a link you paste, for
 * a few hours. Your last one stays here once it has cleared, to share again.
 */
function Spotify() {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user, refresh } = useAuth();
  const explain = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user || user.guest) return null;

  const last = user.spotify ?? null;
  const live = liveShare(last);
  const changed = async (act: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await act();
      forgetPerson(user.id);
      await refresh();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };
  const until = live ? new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(live.until) : "";

  return (
    <Group title={t("spotify")} note={t("spotifyNote")}>
      {/* On a phone the buttons go under the words, lined up with them, so neither is squeezed. */}
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {last?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify's own cover, from its CDN.
            <img
              src={last.image}
              alt=""
              width={40}
              height={40}
              className={cn("size-10 shrink-0 rounded-md bg-muted object-cover", !live && "opacity-60")}
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#1ed760]/12 text-[#1ed760]">
              <SpotifyMark className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {last ? (
              <>
                <a
                  href={last.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-[13.5px] font-medium text-foreground hover:underline"
                >
                  {last.title ?? t("jam")}
                </a>
                <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{live ? t("until", { time: until }) : t("ended")}</p>
              </>
            ) : (
              <>
                <p className="text-[13.5px] font-medium text-foreground">{t("shareTitle")}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{t("shareNote")}</p>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 ps-[52px] sm:ps-0">
          {last && !live && (
            <Button size="sm" disabled={busy} onClick={() => changed(() => api.shareSpotify(last.url))} className="h-8 px-3.5 text-[13px]">
              {t("shareAgain")}
            </Button>
          )}
          {live && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => changed(() => api.stopSpotify())}
              className="h-8 px-3.5 text-[13px]"
            >
              {t("stop")}
            </Button>
          )}
          <Button
            variant={last ? "secondary" : "primary"}
            size="sm"
            disabled={busy}
            onClick={() => setOpen(true)}
            className="h-8 px-3.5 text-[13px]"
          >
            {last ? t("change") : t("share")}
          </Button>
        </div>
      </div>
      {error && <p className="px-4 py-3 text-[12.5px] text-destructive">{error}</p>}
      {open && (
        <ShareDialog
          onClose={() => setOpen(false)}
          onShare={async (url) => {
            await api.shareSpotify(url);
            forgetPerson(user.id);
            await refresh();
            setOpen(false);
          }}
          closeLabel={tc("close")}
        />
      )}
    </Group>
  );
}

/** Paste a link, see what Spotify says it is, and share it. */
function ShareDialog({
  onClose,
  onShare,
  closeLabel,
}: {
  onClose: () => void;
  onShare: (url: string) => Promise<void>;
  closeLabel: string;
}) {
  const t = useTranslations("integrations");
  const ts = useTranslations("spotify");
  const explain = useErrorMessage();
  const [text, setText] = useState("");
  const [found, setFound] = useState<{ for: string; share: Omit<SpotifyShare, "until"> | null; error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = spotifyLink(text);

  // What Spotify calls it, a moment after the link is in.
  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.lookUpSpotify(link.url).then(
        ({ found: share }) => !cancelled && setFound({ for: link.url, share, error: "" }),
        (err) => !cancelled && setFound({ for: link.url, share: null, error: explain(err) }),
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [link?.url, explain]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = link && found?.for === link.url ? found : null;
  const shown = error || preview?.error || (text.trim() && !link ? t("notSpotify") : "");

  const share = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!link || busy) return;
    setBusy(true);
    setError("");
    try {
      await onShare(link.url);
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("dialogTitle")}
      description={t("dialogNote")}
      closeLabel={closeLabel}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} className="h-9 px-4 text-[13px]">
            {t("cancel")}
          </Button>
          <Button size="sm" type="submit" form="spotify-share" disabled={!preview?.share || busy} className="h-9 px-4 text-[13px]">
            {t("shareButton")}
          </Button>
        </>
      }
    >
      <form id="spotify-share" onSubmit={share}>
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className={fieldClass}
        />
        {preview?.share ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-foreground/[0.04] p-2.5">
            {preview.share.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- Spotify's own cover, from its CDN.
              <img src={preview.share.image} alt="" width={44} height={44} className="size-11 shrink-0 rounded-md bg-muted object-cover" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-[#1ed760]/12 text-[#1ed760]">
                <SpotifyMark className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-foreground">{preview.share.title ?? t("jam")}</p>
              <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
                <SpotifyMark className="size-3 text-[#1ed760]" />
                {ts(`kinds.${preview.share.kind}`)}
              </p>
            </div>
          </div>
        ) : shown ? (
          <p className="mt-3 text-[12.5px] text-destructive">{shown}</p>
        ) : link ? (
          // Spotify can take a second or two the first time it's asked about a link.
          <div aria-hidden className="mt-3 flex items-center gap-3 rounded-xl bg-foreground/[0.04] p-2.5">
            <span className="size-11 shrink-0 animate-pulse rounded-md bg-foreground/[0.08]" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-2/5 animate-pulse rounded bg-foreground/[0.08]" />
              <span className="block h-2.5 w-1/5 animate-pulse rounded bg-foreground/[0.06]" />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-muted-foreground">{t("howTo")}</p>
        )}
      </form>
    </Dialog>
  );
}
