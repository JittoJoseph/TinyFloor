"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { invitePath, officePath } from "@/lib/links";
import { EntryShell } from "@/components/entry/EntryShell";
import { EntryProblem } from "@/components/entry/EntryProblem";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { CharacterStep, NameStep } from "@/components/entry/IdentitySteps";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { useErrorMessage } from "@/lib/useErrorMessage";

export interface InvitePreview {
  officeName: string;
  invitedBy: string;
  role: string;
  expiresAt: number;
}

/**
 * An invitation to a space. Anyone can say who they'll be first, name then
 * character; the account is only asked for at the last step, and what they
 * picked waits in this browser until they have one.
 */
export function InviteEntry({ token, initialPreview }: { token: string; initialPreview: InvitePreview | null }) {
  const t = useTranslations("office.invite");
  const tc = useTranslations("common");
  const tEntry = useTranslations("entry");
  const router = useRouter();
  const explain = useErrorMessage();
  const { user, isLoading, updateProfile } = useAuth();
  const [invite, setInvite] = useState(initialPreview);
  const [state, setState] = useState<"loading" | "ready" | "invalid">(initialPreview ? "ready" : "loading");
  const [reached, setReached] = useState<"name" | "character" | "account" | null>(null);
  // Which way the last step change went, so the new step slides in from there.
  const [wentBack, setWentBack] = useState(false);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const account = !!user && !user.guest;
  const saved = isLoading ? { name: "", character: "Adam" } : readIdentity();
  const name = typedName ?? user?.displayName ?? saved.name;
  const character = cleanCharacter(pickedCharacter ?? user?.character ?? saved.character);
  // Signed in already: who they'll be is known, so only the last step is left.
  const step = reached ?? (account ? "account" : "name");
  const setName = setTypedName;
  const setCharacter = setPickedCharacter;
  const setStep = setReached;

  useEffect(() => {
    if (initialPreview) return;
    let cancelled = false;
    api
      .invitePreview(token)
      .then(({ invite: found }) => {
        if (cancelled) return;
        setInvite(found);
        setState("ready");
      })
      .catch(() => !cancelled && setState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [initialPreview, token]);

  const trimmed = name.trim();

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      saveIdentity({ name: trimmed, character });
      // Walk in as the character they picked on the way here.
      if (user && character !== user.character) await updateProfile({ character }).catch(() => undefined);
      const { officeId } = await api.acceptInvite(token);
      router.push(officePath(officeId));
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  const preview = (
    <EntryPreview
      occupants={
        step === "name" && !trimmed
          ? []
          : [{ character, name: trimmed || t("you"), running: step !== "name" }]
      }
    />
  );

  if (state === "loading" || isLoading) {
    return (
      <EntryShell backHref="/" preview={preview}>
        <div className="space-y-4">
          <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-2/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-14 w-full rounded-full bg-muted animate-pulse" />
        </div>
      </EntryShell>
    );
  }

  if (state === "invalid" || !invite) {
    return (
      <EntryShell backHref="/" preview={preview}>
        <EntryProblem title={t("invalidTitle")} body={t("invalid")}>
          <ActionLink href="/">{t("home")}</ActionLink>
          <ActionLink href="/create" tone="secondary" icon={null}>
            {tc("createOffice")}
          </ActionLink>
        </EntryProblem>
      </EntryShell>
    );
  }

  const back = invitePath(token);

  return (
    <EntryShell backHref="/" preview={preview}>
      <div className="entry-rise">
        <p className="mb-1.5 text-[12.5px] font-medium text-muted-foreground">{t("eyebrow", { name: invite.invitedBy })}</p>
        <h1 className="break-words text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
          {invite.officeName}
        </h1>
        <p className="mb-6 mt-1.5 text-[14px] text-muted-foreground">
          {invite.role === "admin" ? t("asAdmin") : t("asMember")}
        </p>

        {error && (
          <div className="mb-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {step === "account" && account ? (
          <>
            <ActionButton onClick={join} busy={busy}>
              {t("join", { office: invite.officeName })}
            </ActionButton>
            <p className="text-center text-[12px] text-muted-foreground mt-4">
              {t("joiningAs", { name: user.displayName, email: user.email ?? "" })}
            </p>
          </>
        ) : step === "account" ? (
          <div className="space-y-3">
            <ActionLink
              href={`/auth?${new URLSearchParams({ mode: "signup", redirect: back })}`}
              onClick={() => saveIdentity({ name: trimmed, character })}
            >
              {t("createAccount")}
            </ActionLink>
            <ActionLink
              href={`/auth?${new URLSearchParams({ redirect: back })}`}
              tone="secondary"
              icon={null}
              onClick={() => saveIdentity({ name: trimmed, character })}
            >
              {t("signIn")}
            </ActionLink>
            <p className="text-center text-[12px] text-muted-foreground pt-1">
              {t("accountKeeps", { name: trimmed })}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setWentBack(false);
              if (step === "name" && trimmed) setStep("character");
              else if (step === "character") {
                saveIdentity({ name: trimmed, character });
                setStep("account");
              }
            }}
          >
            <div key={step} className="entry-step" data-back={wentBack}>
              {step === "name" ? (
                <NameStep name={name} onName={setName} />
              ) : (
                <CharacterStep
                  name={trimmed}
                  character={character}
                  onCharacter={setCharacter}
                  onBack={() => {
                    setWentBack(true);
                    setStep("name");
                  }}
                />
              )}
            </div>
            <ActionButton type="submit" disabled={!trimmed} className="mt-5">
              {step === "name" ? tEntry("continue") : t("readyToJoin")}
            </ActionButton>
          </form>
        )}
      </div>
    </EntryShell>
  );
}
