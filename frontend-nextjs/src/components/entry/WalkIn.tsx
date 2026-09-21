"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { EntryShell } from "./EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { EntryPreview } from "./EntryPreview";
import { CharacterStep, NameStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";

/**
 * The step before a room: your name, then who you'll be in there. Without a
 * session it makes you a guest. With an account the name is already yours, so
 * only the character is asked for.
 */
export function WalkIn({
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  sharePath,
  onReady,
  detail,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Something about the place behind the door: who is in there, say. */
  detail?: React.ReactNode;
  backHref?: string;
  sharePath?: string;
  onReady: () => void;
}) {
  const t = useTranslations("entry");
  const tAuth = useTranslations("auth");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { user, isLoading, continueAsGuest, updateProfile } = useAuth();
  const account = !!user && !user.guest;

  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [wentOn, setWentOn] = useState<boolean | null>(null);
  // Which way the last step change went, so the new step slides in from there.
  const [wentBack, setWentBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstile = useTurnstileToken();

  // What this browser remembers is only read once the session is known, so the
  // first render still matches what the server sent.
  const saved = isLoading ? { name: "", character: "Adam" } : readIdentity();
  const name = typedName ?? user?.displayName ?? saved.name;
  const character = cleanCharacter(pickedCharacter ?? user?.character ?? saved.character);
  // Someone signed in has already given their name; only the character is left.
  const onCharacterStep = wentOn ?? account;

  const setName = setTypedName;
  const setCharacter = setPickedCharacter;
  const setOnCharacterStep = setWentOn;
  const trimmed = name.trim();
  const walkIn = async () => {
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
      } else if (trimmed !== user.displayName || character !== user.character) {
        await updateProfile({ displayName: trimmed, character });
      }
      saveIdentity({ name: trimmed, character });
      onReady();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "network"
          ? tAuth("errors.network")
          : code.startsWith("turnstile")
            ? tAuth("errors.turnstile")
            : code === "slow_down"
              ? tAuth("errors.too_many_attempts")
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
              name: trimmed || tc("you"),
              width: 44,
              running: onCharacterStep,
            },
          ]}
        />
      }
    >
      <div className="entry-rise">
        {eyebrow && <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 className="break-words text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        {detail && <div className="mt-3">{detail}</div>}

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (onCharacterStep) void walkIn();
            else if (trimmed) {
              setWentBack(false);
              setOnCharacterStep(true);
            }
          }}
        >
          <div key={onCharacterStep ? "character" : "name"} className="entry-step" data-back={wentBack}>
            {onCharacterStep ? (
              <CharacterStep
                name={trimmed}
                character={character}
                onCharacter={setCharacter}
                onBack={
                  account
                    ? undefined
                    : () => {
                        setWentBack(true);
                        setOnCharacterStep(false);
                      }
                }
              />
            ) : (
              <NameStep name={name} onName={setName} />
            )}
          </div>

          {onCharacterStep && !isLoading && !user && (
            <Turnstile controller={turnstile} action="guest" className="flex justify-center mt-4" />
          )}

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <ActionButton
            type="submit"
            disabled={!trimmed || isLoading}
            busy={busy}
            busyLabel={t("openingDoor")}
            className="mt-5"
          >
            {onCharacterStep ? t("walkIn") : t("continue")}
          </ActionButton>
        </form>

        {!isLoading && !account && (
          <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
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
