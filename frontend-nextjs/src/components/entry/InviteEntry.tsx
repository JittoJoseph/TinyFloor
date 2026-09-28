"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Users } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { character as cleanCharacter, saveIdentity } from "@/lib/identity";
import { invitePath } from "@/lib/links";
import { EntryDetail, EntryHeader, EntryShell } from "@/components/entry/EntryShell";
import { OfficeMark, YouSummary } from "@/components/entry/DoorParts";
import { EntryProblem } from "@/components/entry/EntryProblem";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { CharacterQuestion, NameQuestion } from "@/components/entry/IdentitySteps";
import { DoorSteps, QuietChoice, StepDots, StepError, StepTitle } from "@/components/entry/DoorSteps";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { Agree } from "@/components/legal/Agree";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { posthogLog } from "@/lib/posthog-log";
import { withPostHog } from "@/lib/analytics";
import { Link } from "@/lib/i18n/navigation";

export interface InvitePreview {
  officeId: string;
  officeName: string;
  members: number;
  role: string;
  full?: boolean;
}

type Step = "account" | "name" | "character" | "join";

/**
 * An office's invite link (docs/15). An account first, with Google if they
 * like; then, for someone new, their name and their character, one at a time;
 * and then they are in: the office is joined and waiting on their dashboard.
 * Someone who already has an account and a character joins with one press.
 */
export function InviteEntry({ token, initialPreview }: { token: string; initialPreview: InvitePreview | null }) {
  const t = useTranslations("office.invite");
  const tc = useTranslations("common");
  const tEntry = useTranslations("entry");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const explain = useErrorMessage();
  const { user, isLoading, updateProfile, signInWithGoogle } = useAuth();
  const [invite, setInvite] = useState(initialPreview);
  const [state, setState] = useState<"loading" | "ready" | "invalid">(initialPreview ? "ready" : "loading");
  const [identity, setIdentity] = useState<"name" | "character">("name");
  const [wentBack, setWentBack] = useState(false);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [pickedCharacter, setPickedCharacter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googling, setGoogling] = useState(false);
  const [error, setError] = useState("");

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

  const account = !!user && !user.guest;
  const introduced = account && user.introduced !== false;
  const step: Step = !account ? "account" : introduced ? "join" : identity;
  // Google's name to confirm, for a Google account; an email sign-up types it.
  const suggested = user?.google ? user.displayName : "";
  const name = (typedName ?? suggested).trim();
  const character = cleanCharacter(pickedCharacter ?? user?.character ?? "Adam");

  /** Into the office, then home, where it is waiting with a way to walk in. */
  const join = async () => {
    setBusy(true);
    setError("");
    try {
      if (!introduced) {
        await updateProfile({ displayName: name, character, introduced: true });
        saveIdentity({ name, character });
      }
      const { officeId } = await api.acceptInvite(token);
      withPostHog((posthog) => posthog.capture("office_invite_accepted"));
      posthogLog.info("Office invitation acceptance completed");
      router.replace(`/dashboard?${new URLSearchParams({ office: officeId })}`);
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  const withGoogle = async (code: string) => {
    setError("");
    setGoogling(true);
    try {
      await signInWithGoogle({ code });
    } catch {
      setError(tAuth("errors.google_failed"));
    } finally {
      setGoogling(false);
    }
  };

  if (state === "loading" || isLoading) {
    return (
      <EntryShell backHref="/" header={<DoorHeaderSkeleton />}>
        <DoorSkeleton />
      </EntryShell>
    );
  }

  if (state === "invalid" || !invite) {
    return (
      <EntryProblem backHref="/" title={t("invalidTitle")} body={t("invalid")}>
        <ActionLink href="/">{t("home")}</ActionLink>
        <ActionLink href="/create" tone="secondary" icon={null}>
          {tc("createOffice")}
        </ActionLink>
      </EntryProblem>
    );
  }

  const here = invitePath(token);
  const emailHref = `/auth?${new URLSearchParams({ mode: "signup", redirect: here })}`;
  // The dots count what is left for this person: new people have three steps, others one.
  const steps: Step[] = account && introduced ? ["join"] : ["account", "name", "character"];
  const full = !!invite.full;

  const back = () => {
    setWentBack(true);
    setIdentity("name");
  };

  return (
    <EntryShell
      backHref="/"
      header={
        <EntryHeader
          mark={<OfficeMark officeId={invite.officeId} />}
          eyebrow={t("eyebrow")}
          title={invite.officeName}
          action={steps.length > 1 ? <StepDots at={steps.indexOf(step)} of={steps.length} /> : undefined}
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
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (full) return;
          setWentBack(false);
          if (step === "name" && name) setIdentity("character");
          else if (step === "character" || step === "join") void join();
        }}
      >
        <DoorSteps
          step={step}
          back={wentBack}
          onBack={step === "character" ? back : undefined}
          action={
            step === "account" ? (
              googleAvailable ? (
                <GoogleButton label={tAuth("continueWithGoogle")} busy={googling} onCode={withGoogle} onError={() => setError(tAuth("errors.google_failed"))} />
              ) : (
                <ActionLink href={emailHref}>{t("createAccount")}</ActionLink>
              )
            ) : (
              <ActionButton type="submit" disabled={full || (step === "name" && !name)} busy={busy} busyLabel={t("joining")}>
                {step === "name" ? tEntry("continue") : t("join", { office: invite.officeName })}
              </ActionButton>
            )
          }
          secondary={
            step === "account" ? (
              googleAvailable ? (
                <QuietChoice href={emailHref}>{t("useEmail")}</QuietChoice>
              ) : (
                <QuietChoice href={`/auth?${new URLSearchParams({ redirect: here })}`}>{t("signIn")}</QuietChoice>
              )
            ) : null
          }
        >
          {step === "account" && (
            <>
              <StepTitle title={t("accountTitle")} body={t("accountBody")} />
              <ul className="space-y-2.5 text-[13.5px] text-muted-foreground">
                {(["perkFloor", "perkTalk", "perkChat"] as const).map((key) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/30" />
                    {t(key)}
                  </li>
                ))}
              </ul>
              <Agree className="mt-5 text-[12px]" />
            </>
          )}
          {step === "name" && <NameQuestion name={typedName ?? suggested} onName={setTypedName} />}
          {step === "character" && <CharacterQuestion character={character} onCharacter={setPickedCharacter} />}
          {step === "join" && user && (
            <>
              <StepTitle title={full ? t("fullTitle") : t("joinTitle")} body={full ? t("fullBody") : t("joinBody")} />
              <YouSummary name={user.displayName} character={character} />
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                {t("joiningAs", { email: user.email ?? user.displayName })}{" "}
                <Link href="/account" className="underline-offset-2 hover:text-foreground hover:underline">
                  {t("change")}
                </Link>
              </p>
            </>
          )}
          {full && step !== "join" && step !== "account" && <StepError>{t("fullBody")}</StepError>}
          {error && <StepError>{error}</StepError>}
        </DoorSteps>
      </form>
    </EntryShell>
  );
}

/** The door's own shape while it looks itself up: the place, on the bezel. */
export function DoorHeaderSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex items-center gap-3.5">
        <span className="size-12 animate-pulse rounded-[30%] bg-foreground/[0.08]" />
        <span className="flex-1 space-y-2">
          <span className="block h-3 w-24 animate-pulse rounded-full bg-foreground/[0.08]" />
          <span className="block h-5 w-40 animate-pulse rounded-full bg-foreground/[0.08]" />
        </span>
      </div>
      <span className="mt-4 block h-3.5 w-3/4 animate-pulse rounded-full bg-foreground/[0.08]" />
    </div>
  );
}

/** And what it will ask, in the panel. */
export function DoorSkeleton() {
  return (
    <div aria-hidden>
      <span className="block h-3 w-20 animate-pulse rounded-full bg-foreground/[0.07]" />
      <span className="mt-2 block h-12 w-full rounded-full bg-rail" />
      <span className="mt-4 block h-11 w-full animate-pulse rounded-full bg-foreground/[0.07]" />
    </div>
  );
}
