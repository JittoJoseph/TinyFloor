"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { EntryShell, primaryButtonClass } from "./EntryShell";
import { EntryPreview } from "./EntryPreview";
import { IdentityFields, ErrorNote } from "./IdentityFields";
import { CHARACTER_IDS } from "./CharacterPicker";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";

const GUEST_NAME_KEY = "guestDisplayName";
const GUEST_CHARACTER_KEY = "guestCharacter";

function remembered(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * The step before a room: who you'll be in there. Without a session this makes
 * you a guest; with one it lets you change your name or character on the way in.
 */
export function WalkIn({
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  sharePath,
  onReady,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  sharePath?: string;
  onReady: () => void;
}) {
  const t = useTranslations("entry");
  const tAuth = useTranslations("auth");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { user, isLoading, continueAsGuest, updateProfile } = useAuth();

  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [arriving, setArriving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstile = useTurnstileToken();

  const name = typedName ?? user?.displayName ?? (isLoading ? "" : remembered(GUEST_NAME_KEY));
  // Stored values are read only after loading, so the first render matches the server.
  const requested = pickedCharacter ?? user?.character ?? (isLoading ? "" : remembered(GUEST_CHARACTER_KEY));
  const character = CHARACTER_IDS.includes(requested) ? requested : "Adam";

  const pickCharacter = (next: string) => {
    setPickedCharacter(next);
    setArriving(true);
    setTimeout(() => setArriving(false), 700);
  };

  const walkIn = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");

    try {
      if (!user) {
        const token = await turnstile.waitForToken();
        if (!token) {
          setError(tAuth("errors.turnstile"));
          return;
        }
        await continueAsGuest({ name: trimmed, character, turnstileToken: token });
        try {
          localStorage.setItem(GUEST_NAME_KEY, trimmed);
          localStorage.setItem(GUEST_CHARACTER_KEY, character);
        } catch {}
      } else if (trimmed !== user.displayName || character !== user.character) {
        await updateProfile({ displayName: trimmed, character });
      }
      onReady();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "network"
          ? tAuth("errors.network")
          : code.startsWith("turnstile")
            ? tAuth("errors.turnstile")
            : tAuth("errors.generic"),
      );
      if (!user) turnstile.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntryShell
      backHref={backHref}
      backLabel={tc("back")}
      preview={
        <EntryPreview
          inviteLink={sharePath}
          occupants={[
            {
              character,
              left: "50%",
              top: "79%",
              name: name.trim() || tc("you"),
              width: 44,
              running: arriving,
            },
          ]}
        />
      }
    >
      <div className="entry-rise">
        {eyebrow && (
          <p className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-45 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-1.5 break-words">
          {title}
        </h1>
        {subtitle && <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-5">{subtitle}</p>}

        <form
          className={subtitle ? "" : "mt-5"}
          onSubmit={(event) => {
            event.preventDefault();
            void walkIn();
          }}
        >
          <IdentityFields
            name={name}
            onName={setTypedName}
            character={character}
            onCharacter={pickCharacter}
            autoFocus={!user}
          />

          {!isLoading && !user && (
            <Turnstile ref={turnstile.ref} action="guest" onToken={turnstile.onToken} className="flex justify-center mt-4" />
          )}

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <button type="submit" disabled={!name.trim() || busy || isLoading} className={`${primaryButtonClass} mt-5`}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("openingDoor")}
              </>
            ) : (
              <>
                {t("walkIn")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {!isLoading && (!user || user.guest) && (
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-50 text-center mt-5">
            {t.rich(user ? "guestKeep" : "guestNote", {
              link: (chunks) => (
                <Link
                  href={`/auth?${new URLSearchParams({ redirect: pathname, ...(user ? { mode: "signup" } : {}) })}`}
                  className="underline underline-offset-2 hover:opacity-100"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
      </div>
    </EntryShell>
  );
}
