"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { EntryHeader, EntryShell } from "./EntryShell";
import { CopyLink } from "./DoorParts";
import { ActionButton } from "@/components/ui/Action";
import { CharacterStep, NameStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";
import { Agree } from "@/components/legal/Agree";

/**
 * The step before a room for someone new: a name, then who they'll be in
 * there, and they're a guest. Anyone with a session walks straight in as the
 * character on their account.
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

  // What this browser remembers is only read once the session is known, so the
  // first render still matches what the server sent.
  const saved = isLoading ? { name: "", character: "Adam" } : readIdentity();
  const name = typedName ?? saved.name;
  const character = cleanCharacter(pickedCharacter ?? saved.character);
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
      you={{ character, name: trimmed || tc("you"), running: onCharacterStep }}
    >
      <div className="entry-rise">
        <EntryHeader
          mark={mark}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          detail={detail}
          action={sharePath && <CopyLink path={sharePath} />}
        />

        <form
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
                onBack={() => {
                  setWentBack(true);
                  setOnCharacterStep(false);
                }}
              />
            ) : (
              <NameStep name={name} onName={setName} />
            )}
          </div>

          {onCharacterStep && !isLoading && (
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
        {onCharacterStep && <Agree className="mt-4" />}

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
      </div>
    </EntryShell>
  );
}
