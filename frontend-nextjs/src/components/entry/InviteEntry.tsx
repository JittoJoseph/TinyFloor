"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { character as cleanCharacter, readIdentity, saveIdentity } from "@/lib/identity";
import { invitePath, officePath } from "@/lib/links";
import { EntryDetail, EntryHeader, EntryShell } from "@/components/entry/EntryShell";
import { OfficeMark, YouSummary } from "@/components/entry/DoorParts";
import { Users } from "lucide-react";
import { EntryProblem } from "@/components/entry/EntryProblem";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { CharacterStep, NameStep } from "@/components/entry/IdentitySteps";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { posthogLog } from "@/lib/posthog-log";
import posthog from "posthog-js";

const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export interface InvitePreview {
  officeId: string;
  officeName: string;
  members: number;
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
      if (posthogConfigured) posthog.capture("office_invite_accepted", { invite_role: invite?.role ?? "member" });
      posthogLog.info("Office invitation acceptance completed");
      router.push(officePath(officeId));
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  const you = step === "name" && !trimmed ? undefined : { character, name: trimmed || t("you"), running: step !== "name" };

  if (state === "loading" || isLoading) {
    return (
      <EntryShell backHref="/">
        <DoorSkeleton />
      </EntryShell>
    );
  }

  if (state === "invalid" || !invite) {
    return (
      <EntryShell backHref="/">
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
    <EntryShell backHref="/" you={you}>
      <div className="entry-rise">
        <EntryHeader
          mark={<OfficeMark officeId={invite.officeId} />}
          eyebrow={t("eyebrow", { name: invite.invitedBy })}
          title={invite.officeName}
          subtitle={invite.role === "admin" ? t("asAdmin") : t("asMember")}
          detail={
            invite.members > 0 && (
              <EntryDetail
                lead={
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="size-3" />
                  </span>
                }
              >
                {t("members", { count: invite.members })}
              </EntryDetail>
            )
          }
        />

        {error && (
          <div className="mb-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {step === "account" && account ? (
          <>
            <div className="mb-4">
              <YouSummary name={user.displayName} character={character} />
            </div>
            <ActionButton onClick={join} busy={busy}>
              {t("join", { office: invite.officeName })}
            </ActionButton>
            <p className="mt-4 text-center text-[12.5px] text-muted-foreground">
              {t("joiningAs", { name: user.displayName, email: user.email ?? "" })}
            </p>
          </>
        ) : step === "account" ? (
          <div className="space-y-2.5">
            <div className="mb-4">
              <YouSummary
                name={trimmed}
                character={character}
                changeLabel={t("change")}
                onChange={() => {
                  setWentBack(true);
                  setStep("character");
                }}
              />
            </div>
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
            <p className="pt-2 text-center text-[12.5px] text-muted-foreground">
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

/** The panel's shape while the door looks itself up. */
export function DoorSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex items-center gap-3.5">
        <span className="size-12 animate-pulse rounded-[30%] bg-foreground/[0.07]" />
        <span className="flex-1 space-y-2">
          <span className="block h-3 w-24 animate-pulse rounded-full bg-foreground/[0.07]" />
          <span className="block h-5 w-40 animate-pulse rounded-full bg-foreground/[0.07]" />
        </span>
      </div>
      <span className="mt-4 block h-3.5 w-3/4 animate-pulse rounded-full bg-foreground/[0.07]" />
      <div className="-mx-5 my-5 h-px bg-border sm:-mx-6" />
      <span className="block h-3 w-20 animate-pulse rounded-full bg-foreground/[0.07]" />
      <span className="mt-2 block h-12 w-full rounded-full border border-border" />
      <span className="mt-4 block h-11 w-full animate-pulse rounded-full bg-foreground/[0.07]" />
    </div>
  );
}
