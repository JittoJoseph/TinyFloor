"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { anyCharacter, character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { suggestName } from "@/lib/names";
import { track } from "@/lib/analytics";
import { Dice } from "@/components/ui/icons";
import { PixelAvatar } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";
import { EntryHeader, EntryShell, Field, pillInputClass } from "./EntryShell";
import { CopyLink } from "./DoorParts";
import { ActionButton } from "@/components/ui/Action";
import { CharacterStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";
import { Turnstile, useTurnstileToken } from "@/components/auth/Turnstile";
import { Agree } from "@/components/legal/Agree";

/**
 * The demo office's door: one press and they're on the floor, as a guest
 * (docs/analytics.md). The name is filled in, a suggested one or the one they
 * used last time, with a die for another; the character is picked at random
 * and shown beside it, a tap away from choosing. Anyone with a session walks
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
  // The name and character the door offers. Random, so they're only shown once
  // the session is known: the server's page, and the first render, show neither.
  const [suggested] = useState(() => suggestName());
  const [anyone] = useState(anyCharacter);
  // How many times the die was rolled (it turns each time), and the names it gave.
  const [rolls, setRolls] = useState(0);
  const rolled = useRef(new Set<string>());

  const ready = !isLoading;
  // What this browser remembers is only read once the session is known, so the
  // first render still matches what the server sent.
  const saved = ready ? readIdentity() : { name: "", character: "Adam" };
  const offered = ready ? saved.name || suggested : "";
  const name = typedName ?? offered;
  const character = cleanCharacter(pickedCharacter ?? anyone);
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
        name: typedName === null ? (saved.name ? "remembered" : "suggested") : rolled.current.has(typedName) ? "suggested" : "typed",
        character: pickedCharacter === null ? "offered" : "chosen",
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
            <Field label={t("yourName")} htmlFor="identity-name">
              <div className="relative">
                {/* Who they'll be, picked for them: a tap to choose another. */}
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    setWentBack(false);
                    setOnCharacterStep(true);
                  }}
                  aria-label={t("pickCharacter")}
                  title={t("pickCharacter")}
                  className="absolute start-1.5 top-1/2 size-9 -translate-y-1/2 cursor-pointer overflow-hidden rounded-full bg-card transition-transform active:scale-95 disabled:cursor-default"
                  style={{ containerType: "size" }}
                >
                  {ready && <PixelAvatar character={character} width="62cqw" style={{ left: "50%", top: "92%" }} />}
                </button>
                <input
                  id="identity-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  // The name is filled in, so typing replaces it rather than adding to it.
                  onFocus={(event) => event.currentTarget.select()}
                  placeholder={t("namePlaceholder")}
                  className={cn(pillInputClass, "ps-[3.25rem] pe-12")}
                  maxLength={30}
                  autoComplete="nickname"
                />
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    const next = suggestName(name.trim());
                    rolled.current.add(next);
                    setName(next);
                    setRolls((count) => count + 1);
                  }}
                  aria-label={t("anotherName")}
                  title={t("anotherName")}
                  className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-default"
                >
                  <Dice
                    className="size-[18px] transition-transform duration-300 ease-out motion-reduce:transition-none"
                    style={{ transform: `rotate(${rolls * 180}deg)` }}
                  />
                </button>
              </div>
            </Field>
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
