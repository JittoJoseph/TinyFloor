"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { CHARACTERS } from "@shared/profile";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { EntryHeader, EntryShell } from "./EntryShell";
import { CopyLink } from "./DoorParts";
import { ActionButton } from "@/components/ui/Action";
import { CharacterStep, NameStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";
import { Agree } from "@/components/legal/Agree";

/**
 * The step before a room for someone new: a name, and they're in, as a guest.
 * Choosing who they'll be is a step they can take but needn't: most people who
 * reached the demo office's door didn't get past two steps (docs/analytics.md),
 * so someone new gets a character at random and someone back the one they had.
 * Anyone with a session walks straight in as the character on their account.
 */
export function WalkIn({
  mark,
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  sharePath,
  onReady,
  detail,
}: {
  /** The place's mark, beside its name. */
  mark?: React.ReactNode;
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
  const { isLoading, continueAsGuest } = useAuth();

  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [wentOn, setWentOn] = useState<boolean | null>(null);
  // Which way the last step change went, so the new step slides in from there.
  const [wentBack, setWentBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstile = useTurnstileToken();
  // Who someone new walks in as, unless they choose. Never shown before they're in, so it can't differ from the server's page.
  const [anyone] = useState(() => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]);

  // What this browser remembers is only read once the session is known, so the
  // first render still matches what the server sent.
  const saved = isLoading ? { name: "", character: "Adam" } : readIdentity();
  const name = typedName ?? saved.name;
  const character = cleanCharacter(pickedCharacter ?? (saved.name ? saved.character : anyone));
  const onCharacterStep = wentOn ?? false;

  const setName = setTypedName;
  const setCharacter = setPickedCharacter;
  const setOnCharacterStep = setWentOn;
  const trimmed = name.trim();
  const walkIn = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");

    try {
      const token = await turnstile.waitForToken();
      if (!token) {
        setError(tAuth("errors.turnstile"));
        return;
      }
      await continueAsGuest({ name: trimmed, character, turnstileToken: token });
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
      turnstile.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntryShell
      backHref={backHref}
      backLabel={tc("back")}
      header={
        <EntryHeader
          mark={mark}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          detail={detail}
          action={sharePath && <CopyLink path={sharePath} />}
        />
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void walkIn();
        }}
      >
        <div key={onCharacterStep ? "character" : "name"} className="entry-step" data-back={wentBack}>
          {onCharacterStep ? (
            <CharacterStep
              name={trimmed}
              character={character}
              onCharacter={setCharacter}
              onBack={() => {
                setWentBack(true);
                setOnCharacterStep(false);
              }}
            />
          ) : (
            <NameStep name={name} onName={setName} />
          )}
        </div>

        {/* From the first step, so the check runs while a name is typed. It's
            invisible unless it needs a click, but its box is always there: no gap for it on the name step. */}
        {!isLoading && (
          <Turnstile controller={turnstile} action="guest" className={onCharacterStep ? "mt-4 flex justify-center" : "flex justify-center"} />
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
          {t("walkIn")}
        </ActionButton>
        {!onCharacterStep && (
          <button
            type="button"
            disabled={!trimmed}
            onClick={() => {
              setWentBack(false);
              setOnCharacterStep(true);
            }}
            className="mt-3 w-full cursor-pointer text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
          >
            {t("pickCharacter")}
          </button>
        )}
      </form>
      <Agree className="mt-4" />

      {!isLoading && (
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          {t.rich("guestNote", {
            link: (chunks) => (
              <Link
                href={`/auth?${new URLSearchParams({ redirect: pathname })}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </EntryShell>
  );
}
