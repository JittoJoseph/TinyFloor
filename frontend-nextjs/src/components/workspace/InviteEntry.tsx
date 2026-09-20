"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { invitePath, spacePath } from "@/lib/links";
import { EntryShell, primaryButtonClass } from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { CharacterStep, NameStep } from "@/components/entry/IdentitySteps";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { useErrorMessage } from "./useErrorMessage";

export interface InvitePreview {
  workspaceName: string;
  invitedBy: string;
  role: string;
  expiresAt: number;
}

const secondaryButtonClass =
  "cursor-pointer w-full h-14 rounded-full border border-black/10 bg-white text-[var(--color-braun-text)] font-body font-bold uppercase tracking-[0.15em] text-xs transition-colors hover:bg-[#f7f7f3] flex items-center justify-center gap-2";

/**
 * An invitation to a space. Anyone can say who they'll be first, name then
 * character; the account is only asked for at the last step, and what they
 * picked waits in this browser until they have one.
 */
export function InviteEntry({ token, initialPreview }: { token: string; initialPreview: InvitePreview | null }) {
  const t = useTranslations("workspace.invite");
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
      const { workspaceId } = await api.acceptInvite(token);
      router.push(spacePath(workspaceId));
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
          : [{ character, left: "50%", top: "79%", name: trimmed || t("you"), width: 44, running: step !== "name" }]
      }
    />
  );

  if (state === "loading" || isLoading) {
    return (
      <EntryShell backHref="/" preview={preview}>
        <div className="space-y-4">
          <div className="h-3 w-24 rounded-full bg-black/5 animate-pulse" />
          <div className="h-7 w-2/3 rounded-lg bg-black/5 animate-pulse" />
          <div className="h-14 w-full rounded-full bg-black/5 animate-pulse" />
        </div>
      </EntryShell>
    );
  }

  if (state === "invalid" || !invite) {
    return (
      <EntryShell backHref="/" preview={preview}>
        <div className="entry-rise">
          <span className="inline-flex w-11 h-11 rounded-xl bg-red-50 items-center justify-center mb-5">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </span>
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-2">
            {t("invalidTitle")}
          </h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">{t("invalid")}</p>
          <Link href="/" className={primaryButtonClass}>
            {t("home")}
          </Link>
        </div>
      </EntryShell>
    );
  }

  const back = invitePath(token);

  return (
    <EntryShell backHref="/" preview={preview}>
      <div className="entry-rise">
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-45 mb-2">
          {t("eyebrow", { name: invite.invitedBy })}
        </p>
        <h1 className="font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-1.5 break-words">
          {invite.workspaceName}
        </h1>
        <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-5">
          {invite.role === "admin" ? t("asAdmin") : t("asMember")}
        </p>

        {error && (
          <div className="mb-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {step === "account" && account ? (
          <>
            <button type="button" onClick={join} disabled={busy} className={primaryButtonClass}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("join", { workspace: invite.workspaceName })}
              {!busy && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
            </button>
            <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 text-center mt-4">
              {t("joiningAs", { name: user.displayName, email: user.email ?? "" })}
            </p>
          </>
        ) : step === "account" ? (
          <div className="space-y-3">
            <Link
              href={`/auth?${new URLSearchParams({ mode: "signup", redirect: back })}`}
              className={primaryButtonClass}
              onClick={() => saveIdentity({ name: trimmed, character })}
            >
              {t("createAccount")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <Link
              href={`/auth?${new URLSearchParams({ redirect: back })}`}
              className={secondaryButtonClass}
              onClick={() => saveIdentity({ name: trimmed, character })}
            >
              {t("signIn")}
            </Link>
            <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 text-center pt-1">
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
            <button type="submit" disabled={!trimmed} className={`${primaryButtonClass} mt-5`}>
              {step === "name" ? tEntry("continue") : t("readyToJoin")}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        )}
      </div>
    </EntryShell>
  );
}
