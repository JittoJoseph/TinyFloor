"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { anyCharacter, character as cleanCharacter, saveIdentity } from "@/lib/identity";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { ActionButton } from "@/components/ui/Action";
import { EntryHeader, EntryShell } from "./EntryShell";
import { DoorSteps, StepDots, StepError } from "./DoorSteps";
import { NameQuestion, CharacterQuestion } from "./IdentitySteps";
import { YouMark } from "./DoorParts";

/**
 * A new account's first door (docs/product.md): the name people will see, then who
 * they'll be on the floor, one at a time. Someone who signed up with Google
 * finds their Google name filled in and still presses Continue (or changes
 * it); someone who used an email types it. A character is already picked, at
 * random, so the second step can be one press too.
 */
export function Introduce({ backHref = "/" }: { backHref?: string }) {
  const t = useTranslations("entry");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "character">("name");
  const [wentBack, setWentBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [anyone] = useState(anyCharacter);

  // A new account at its first door: the funnel from signing up to the floor (docs/analytics.md).
  const here = !!user;
  useEffect(() => {
    if (here) track("door_viewed", { door: "introduce" });
  }, [here]);

  if (!user) return null;

  // Google gave us their name, so it's there to confirm; an email sign-up only
  // gave an address, so they type it (what we guessed from it isn't a name).
  const suggested = user.google ? user.displayName : "";
  const typed = (name ?? suggested).trim();
  const picked = cleanCharacter(character ?? anyone);

  const finish = async () => {
    if (!typed || busy) return;
    setBusy(true);
    setError("");
    try {
      await updateProfile({ displayName: typed, character: picked, introduced: true });
      saveIdentity({ name: typed, character: picked });
      // A new account's first door: who gets past it to their office (docs/analytics.md).
      track("profile_introduced", { character: character === null ? "offered" : "chosen" });
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  return (
    <EntryShell
      backHref={backHref}
      header={
        <EntryHeader
          mark={<YouMark character={picked} />}
          eyebrow={t("introEyebrow")}
          title={typed || t("introTitle")}
          action={<StepDots at={step === "name" ? 0 : 1} of={2} />}
        />
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "character") void finish();
          else if (typed) {
            track("door_name_entered", { door: "introduce", name: name === null && suggested ? "suggested" : "typed" });
            setWentBack(false);
            setStep("character");
          }
        }}
      >
        <DoorSteps
          step={step}
          back={wentBack}
          onBack={
            step === "character"
              ? () => {
                  setWentBack(true);
                  setStep("name");
                }
              : undefined
          }
          action={
            <ActionButton type="submit" disabled={!typed} busy={busy} busyLabel={t("openingDoor")} shine>
              {step === "name" ? t("continue") : t("thatsMe")}
            </ActionButton>
          }
        >
          {step === "name" ? (
            <NameQuestion name={name ?? suggested} onName={setName} />
          ) : (
            <CharacterQuestion character={picked} onCharacter={setCharacter} />
          )}
          {error && <StepError>{error}</StepError>}
        </DoorSteps>
      </form>
    </EntryShell>
  );
}
