"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { randomPersona } from "@/lib/names";
import { track } from "@/lib/analytics";
import { EntryHeader, EntryShell } from "./EntryShell";
import { PersonaField } from "./PersonaField";
import { CopyLink } from "./DoorParts";
import { ActionButton } from "@/components/ui/Action";
import { CharacterStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";
import { Agree } from "@/components/legal/Agree";

/**
 * The demo office's door: one press and they're on the floor, as a guest
 * (docs/analytics.md). Who they'll be is filled in, a character and a name
 * that suits it (or the name they used last time), with a die for someone
 * else; the character is a tap away from choosing. Anyone with a session walks
 * straight in as the character on their account.
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
  const { user, isLoading, continueAsGuest } = useAuth();

  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [wentOn, setWentOn] = useState<boolean | null>(null);
  // Which way the last step change went, so the new step slides in from there.
  const [wentBack, setWentBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turnstile = useTurnstileToken();
  // Who the door offers. Random, so it's only shown once the session is known:
  // the server's page, and the first render, show neither (PersonaField).
  const [persona, setPersona] = useState(randomPersona);
  // How many times the die was rolled.
  const [rolls, setRolls] = useState(0);

  const ready = !isLoading;
  // What this browser remembers is only read once the session is known, so the
  // first render still matches what the server sent. A name used before is
  // offered until the die is rolled.
  const saved = ready ? readIdentity() : { name: "", character: "Adam" };
  const remembered = rolls === 0 && !!saved.name;
  const name = typedName ?? (!ready ? "" : remembered ? saved.name : persona.name);
  const character = cleanCharacter(pickedCharacter ?? persona.character);

  const roll = () => {
    setPersona((current) => randomPersona(current));
    setTypedName(null);
    setPickedCharacter(null);
    setRolls((count) => count + 1);
  };
  const onCharacterStep = wentOn ?? false;

  const setName = setTypedName;
  const setCharacter = setPickedCharacter;
  const setOnCharacterStep = setWentOn;
  const trimmed = name.trim();

  // Someone new at the door, once: where the demo's funnel starts in the app (docs/analytics.md).
  const seen = useRef(false);
  useEffect(() => {
    if (!ready || user || seen.current) return;
    seen.current = true;
    track("door_viewed", { door: "demo" });
  }, [ready, user]);

  const walkIn = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");

    try {
      const token = await turnstile.waitForToken();
      if (!token) {
        track("door_failed", { door: "demo", reason: "turnstile" });
        setError(tAuth("errors.turnstile"));
        return;
      }
      await continueAsGuest({ name: trimmed, character, turnstileToken: token });
      saveIdentity({ name: trimmed, character });
      // Whether they kept what the door offered: the name, and the character.
      track("guest_session_started", {
        door: "demo",
        name: typedName !== null ? "typed" : remembered ? "remembered" : "suggested",
        character: pickedCharacter === null ? "offered" : "chosen",
        rolls,
      });
      onReady();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      track("door_failed", { door: "demo", reason: code || "unknown" });
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
            <PersonaField
              ready={ready}
              name={name}
              character={character}
              rolls={rolls}
              onName={setName}
              onRoll={roll}
              onCharacter={() => {
                setWentBack(false);
                setOnCharacterStep(true);
              }}
              labels={{ name: t("yourName"), placeholder: t("namePlaceholder"), roll: t("anotherName"), character: t("pickCharacter") }}
            />
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
          // As tall as the pill above it, so the two read as one control.
          className="mt-4 h-[3.25rem] text-[15px]"
          shine
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
