"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link2, Zap } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Office, type PlanId } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { openCheckout, waitForPlan } from "@/lib/checkout";
import { officePath } from "@/lib/links";
import { InviteActions } from "./Invite";
import { forgetPendingOffice, pendingOffice } from "@/lib/pendingOffice";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { LitFace } from "@/components/ui/LitFace";
import { PlanIncludes, paidPlan } from "@/components/billing/PlanCards";
import { FloorScene } from "@/components/floor/FloorScene";
import { ActionButton } from "@/components/ui/Action";
import { EntryHeader, EntryShell, pillInputClass } from "@/components/entry/EntryShell";
import { DoorSteps, QuietChoice, StepDots, StepError, StepTitle } from "@/components/entry/DoorSteps";
import { posthogLog } from "@/lib/posthog-log";
import { withPostHog } from "@/lib/analytics";

/** Plan names stay in English everywhere, like on the pricing page. */
const NAMES: Record<PlanId, string> = { free: "Free", pro: "Pro" };

type Step = "name" | "invite" | "plan";

/**
 * Making an office (docs/pricing.md): its name, then the link that brings the
 * team in, then the floor. No plan is asked for before anyone else has joined:
 * an office is worth paying for once a team is in it, and the team's first two
 * weeks are on Pro anyway. Someone who chose Pro on the pricing page
 * (/create?plan=pro) gets it right after the name instead. The office is made
 * as soon as it has a name, so leaving at any point still leaves an office.
 */
export function CreateOfficeFlow() {
  const t = useTranslations("create");
  const tEntry = useTranslations("entry");
  const tOffer = useTranslations("billing.offer");
  const locale = useLocale();
  const router = useRouter();
  const explain = useErrorMessage();
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const catalog = usePlans();
  const selling = !!catalog?.billing;

  const [step, setStep] = useState<Step>("name");
  const [wentBack, setWentBack] = useState(false);
  const [name, setName] = useState("");
  const [office, setOffice] = useState<Office | null>(null);
  // Chosen on the pricing page (/create?plan=pro): bought straight after the name. Old links said plus.
  const [asked] = useState(() => {
    if (typeof window === "undefined") return false;
    const asked = new URLSearchParams(window.location.search).get("plan");
    return asked === "pro" || asked === "plus";
  });
  const [busy, setBusy] = useState<"name" | "pay" | "free" | null>(null);
  const [error, setError] = useState("");

  // A name typed in the lobby before signing up waits here, read once the page is in the browser.
  useEffect(() => {
    const waiting = pendingOffice();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (waiting) setName(waiting);
  }, []);

  const typed = name.trim();
  const steps: Step[] = selling && asked ? ["name", "plan"] : ["name", "invite"];
  const picked = paidPlan(catalog?.plans ?? []);
  const plan = "pro" as const;
  const free = catalog?.plans.find((one) => one.id === "free");

  const go = (next: Step, backwards = false) => {
    setWentBack(backwards);
    setError("");
    setStep(next);
  };

  const walkIn = (id: string) => {
    forgetPendingOffice();
    router.replace(officePath(id));
  };

  /** The name: the office is made now, or renamed if they came back to change it. */
  const saveName = async () => {
    if (!typed || busy) return;
    setBusy("name");
    setError("");
    try {
      let made = office;
      if (!made) {
        made = (await api.createOffice(typed)).office;
        withPostHog((posthog) => posthog.capture("office_created"));
        posthogLog.info("Office creation completed");
        setOffice(made);
      } else if (made.name !== typed) {
        made = (await api.renameOffice(made.id, typed)).office;
        setOffice(made);
      }
      setBusy(null);
      go(selling && asked ? "plan" : "invite");
    } catch (err) {
      setError(explain(err));
      setBusy(null);
    }
  };

  /** Creem's checkout over the door; paid, the plan lands and they walk in. */
  const pay = async () => {
    if (!office || busy) return;
    setBusy("pay");
    setError("");
    try {
      const { checkoutId, url } = await api.checkout(office.id, plan);
      withPostHog((posthog) => posthog.capture("onboarding_checkout_opened", { plan }));
      const done = await openCheckout({ url, locale, dark: document.documentElement.classList.contains("dark") });
      if (!done) return setBusy(null);
      withPostHog((posthog) => posthog.capture("onboarding_plan_bought", { plan }));
      await waitForPlan(office.id, checkoutId, (now) => now === plan);
      walkIn(office.id);
    } catch (err) {
      setError(explain(err));
      setBusy(null);
    }
  };

  const stayFree = () => {
    if (!office) return;
    withPostHog((posthog) => posthog.capture("onboarding_stayed_free"));
    setBusy("free");
    walkIn(office.id);
  };

  const submit = () => {
    if (step === "name") void saveName();
    else if (step === "invite" && office) walkIn(office.id);
    else if (step === "plan") void pay();
  };

  return (
    <EntryShell
      backHref="/"
      header={
        <EntryHeader
          mark={<LitFace seed={typed.toLowerCase() || user?.id || "your-office"} size={48} phone={44} square />}
          eyebrow={t("eyebrow")}
          title={
            <motion.span
              key={typed ? "named" : "unnamed"}
              initial={reduce ? false : { opacity: 0.4 }}
              animate={{ opacity: 1 }}
              className="block truncate"
            >
              {typed || t("untitled")}
            </motion.span>
          }
          action={steps.length > 1 ? <StepDots at={steps.indexOf(step)} of={steps.length} /> : undefined}
        />
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <DoorSteps
          step={step}
          back={wentBack}
          onBack={step === "invite" || step === "plan" ? () => go("name", true) : undefined}
          action={
            <ActionButton
              type="submit"
              disabled={(step === "name" && !typed) || (step === "plan" && !picked) || busy === "free"}
              busy={busy === "name" || busy === "pay"}
              busyLabel={step === "plan" ? t("openingCheckout") : t("creating")}
            >
              {step === "plan" && picked ? t("choose", { plan: NAMES[picked.id] }) : step === "invite" ? t("walkIn") : tEntry("continue")}
            </ActionButton>
          }
          secondary={
            step === "plan" && free ? (
              <QuietChoice onClick={stayFree}>{t("freeInstead", { count: free.seats })}</QuietChoice>
            ) : step === "name" ? (
              <span className="text-[12.5px] text-faint">{t("renameLater")}</span>
            ) : null
          }
        >
          {step === "name" && (
            <>
              <StepTitle title={t("nameTitle")} body={t("nameBody")} />
              <label htmlFor="office-name" className="sr-only">
                {t("nameLabel")}
              </label>
              <input
                id="office-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={48}
                autoFocus
                autoComplete="organization"
                className={pillInputClass}
              />
              {/* Their floor, with them already at a desk: what the name is for. */}
              <div className="relative mt-4 h-[6.5rem] overflow-hidden rounded-2xl sm:mt-5 sm:h-[8.5rem] border border-border" aria-hidden>
                <FloorScene
                  view={[18, 4.2, 16, 8]}
                  sitting={
                    user ? [{ character: user.character, chair: [20, 8], name: user.displayName.split(" ")[0], status: "available" }] : []
                  }
                  priority
                  className="absolute inset-0"
                />
              </div>
            </>
          )}

          {step === "invite" && (
            <>
              <StepTitle title={t("inviteTitle")} body={t("inviteBody", { office: typed })} />
              {/* The same ways to send it as the invite dialog: one place decides how inviting works. */}
              {office && <InviteActions officeId={office.id} officeName={typed} />}
              {selling && !!catalog?.trialDays ? (
                <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-muted p-3.5 text-[13px] leading-relaxed text-foreground">
                  <Zap className="mt-0.5 size-4 shrink-0 text-brand" />
                  {t("trialNote", {
                    free: free?.seats ?? 3,
                    plan: NAMES[catalog.trialPlan ?? "pro"],
                    days: catalog.trialDays,
                  })}
                </p>
              ) : (
                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">{t("inviteLater")}</p>
              )}
            </>
          )}

          {step === "plan" && picked && (
            <>
              <StepTitle title={t("planTitle", { office: typed })} />
              {/*
                The price once, big, framed the way it's paid; three lines of
                what changes; the promise that makes yes safe. It fits the
                door, so the step never scrolls.
              */}
              <p className="flex items-baseline gap-2">
                <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] text-foreground">
                  {dollars(picked.price ?? 0)}
                </span>
                <span className="text-[13px] text-muted-foreground">{tOffer("perMonth")}</span>
              </p>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                {tOffer("daily", { price: dollars(Math.ceil((picked.price ?? 0) / 30 / 100) * 100) })}
              </p>
              <PlanIncludes plans={catalog?.plans ?? []} className="mt-4 border-t border-border pt-4" />
              <p className="mt-auto pt-3 text-[12px] text-faint">{tOffer("assurance")}</p>
            </>
          )}

          {error && <StepError>{error}</StepError>}
        </DoorSteps>
      </form>
    </EntryShell>
  );
}

/** Pasting the link a team sent: it opens that office's invite as if it had been clicked. */
export function JoinByLink() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const join = (event: React.FormEvent) => {
    event.preventDefault();
    const found = link.trim().match(/\/invite\/([^/?#\s]+)/);
    if (!found) {
      setError(t("badLink"));
      return;
    }
    router.push(`/invite/${found[1]}`);
  };

  return (
    <form onSubmit={join}>
      <div className="flex h-11 items-center gap-1 rounded-full border border-border p-1 ps-4 transition-colors focus-within:border-foreground/25">
        <Link2 className="size-4 shrink-0 text-faint" />
        <label className="sr-only" htmlFor="invite-link">
          {t("invitePlaceholder")}
        </label>
        <input
          id="invite-link"
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError("");
          }}
          placeholder={t("invitePlaceholder")}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent ps-1.5 text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[13.5px]"
        />
        <button
          type="submit"
          disabled={!link.trim()}
          className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("join")}
        </button>
      </div>
      {error && <p className="mt-2 ps-4 text-[12.5px] text-destructive">{error}</p>}
    </form>
  );
}
