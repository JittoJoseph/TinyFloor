"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { character as cleanCharacter, saveIdentity } from "@/lib/identity";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { ActionButton } from "@/components/ui/Action";
import { EntryHeader, EntryShell } from "./EntryShell";
import { CharacterStep, NameStep } from "./IdentitySteps";
import { ErrorNote } from "./ErrorNote";

/**
 * A new account's first door: the name people will see and who they'll walk
 * in as, asked once, where it matters. Signing up only asked for an email (or
 * Google), so the name starts as the one we guessed and can be changed here.
 */
export function Introduce({ backHref = "/dashboard" }: { backHref?: string }) {
  const t = useTranslations("entry");
  const tc = useTranslations("common");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [onCharacterStep, setOnCharacterStep] = useState(false);
  const [wentBack, setWentBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;

  const typed = (name ?? user.displayName).trim();
  const picked = cleanCharacter(character ?? user.character);

  const walkIn = async () => {
    if (!typed || busy) return;
    setBusy(true);
    setError("");
    try {
      await updateProfile({ displayName: typed, character: picked, introduced: true });
      saveIdentity({ name: typed, character: picked });
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntryShell
      backHref={backHref}
      backLabel={tc("back")}
      header={
        <EntryHeader title={t("introTitle")} subtitle={t("introSubtitle")} />
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (onCharacterStep) void walkIn();
          else if (typed) {
            setWentBack(false);
            setOnCharacterStep(true);
          }
        }}
      >
        <div key={onCharacterStep ? "character" : "name"} className="entry-step" data-back={wentBack}>
          {onCharacterStep ? (
            <CharacterStep
              name={typed}
              character={picked}
              onCharacter={setCharacter}
              onBack={() => {
                setWentBack(true);
                setOnCharacterStep(false);
              }}
            />
          ) : (
            <NameStep name={name ?? user.displayName} onName={setName} />
          )}
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <ActionButton type="submit" disabled={!typed} busy={busy} busyLabel={t("openingDoor")} className="mt-5">
          {onCharacterStep ? t("walkIn") : t("continue")}
        </ActionButton>
      </form>
    </EntryShell>
  );
}
