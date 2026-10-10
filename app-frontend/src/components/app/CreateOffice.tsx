"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Check, Info, Link2 } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Office, type Plan, type PlanId } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { openCheckout, waitForPlan } from "@/lib/checkout";
import { officePath } from "@/lib/links";
import { forgetOffice, pendingOffice } from "@/lib/pendingOffice";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { LitFace } from "@/components/ui/LitFace";
import { Dialog } from "@/components/ui/Dialog";
import { FloorScene } from "@/components/floor/FloorScene";
import { ActionButton } from "@/components/ui/Action";
import { EntryHeader, EntryShell, pillInputClass } from "@/components/entry/EntryShell";
import { DoorSteps, QuietChoice, StepDots, StepError, StepTitle } from "@/components/entry/DoorSteps";
import { cn } from "@/lib/utils";
import { posthogLog } from "@/lib/posthog-log";
import { withPostHog } from "@/lib/analytics";

/** How many people will work there, in the words of the question. */
type TeamSize = "few" | "small" | "medium" | "large";
const SIZES: Array<{ id: TeamSize; label: string; plan: Exclude<PlanId, "free"> }> = [
  { id: "few", label: "2–3", plan: "plus" },
  { id: "small", label: "4–10", plan: "plus" },
  { id: "medium", label: "11–25", plan: "pro" },
  { id: "large", label: "26+", plan: "pro" },
];

/** Plan names stay in English everywhere, like on the pricing page. */
const NAMES: Record<PlanId, string> = { free: "Free", plus: "Plus", pro: "Pro" };

type Step = "name" | "size" | "plan";

/**
 * Making an office (docs/15): its name, how many people it is for, and the
 * plan that fits them, paid for right here or left for later on the free
 * plan. The office is made as soon as it has a name, so the rest is only a
 * question of its plan, and leaving at any point still leaves an office.
 * Where paid plans aren't on yet, naming it is all there is.
 */
export function CreateOfficeFlow() {
  const t = useTranslations("create");
  const tEntry = useTranslations("entry");
  const tc = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
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
  const [size, setSize] = useState<TeamSize | null>(null);
  const [chosen, setChosen] = useState<Exclude<PlanId, "free"> | null>(null);
  // Chosen on the pricing page (/create?plan=pro): picked here too, whatever size they say.
  const [asked] = useState<Exclude<PlanId, "free"> | null>(() => {
    if (typeof window === "undefined") return null;
    const asked = new URLSearchParams(window.location.search).get("plan");
    return asked === "plus" || asked === "pro" ? asked : null;
  });
  const [showIncluded, setShowIncluded] = useState(false);
  const [busy, setBusy] = useState<"name" | "pay" | "free" | null>(null);
  const [error, setError] = useState("");

  // A name typed in the lobby before signing up waits here, read once the page is in the browser.
  useEffect(() => {
    const waiting = pendingOffice();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (waiting) setName(waiting);
  }, []);

  const typed = name.trim();
  const steps: Step[] = selling ? ["name", "size", "plan"] : ["name"];
  const recommended = SIZES.find((one) => one.id === size)?.plan ?? "plus";
  const plan = chosen ?? asked ?? recommended;
  const paid = catalog?.plans.filter((one): one is Plan & { id: "plus" | "pro" } => one.id !== "free") ?? [];
  const picked = paid.find((one) => one.id === plan);
  const free = catalog?.plans.find((one) => one.id === "free");

  const go = (next: Step, backwards = false) => {
    setWentBack(backwards);
    setError("");
    setStep(next);
  };

  const walkIn = (id: string) => {
    forgetOffice();
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
      if (!selling) return walkIn(made.id);
      setBusy(null);
      go("size");
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
      withPostHog((posthog) => posthog.capture("onboarding_plan_bought", { plan, size }));
      await waitForPlan(office.id, checkoutId, (now) => now === plan);
      walkIn(office.id);
    } catch (err) {
      setError(explain(err));
      setBusy(null);
    }
  };

  const stayFree = () => {
    if (!office) return;
    withPostHog((posthog) => posthog.capture("onboarding_stayed_free", { size }));
    setBusy("free");
    walkIn(office.id);
  };

  const submit = () => {
    if (step === "name") void saveName();
    else if (step === "size" && size) go("plan");
    else if (step === "plan") void pay();
  };

  const perPerson = (one: Plan) => format.number((one.price ?? 0) / 100 / one.seats, { style: "currency", currency: "USD" });

  return (
    <EntryShell
      backHref="/"
      header={
        <EntryHeader
          mark={<LitFace seed={typed.toLowerCase() || user?.id || "your-office"} size={48} phone={44} square />}
          eyebrow={t("eyebrow")}
          title={
            <motion.span key={typed ? "named" : "unnamed"} initial={reduce ? false : { opacity: 0.4 }} animate={{ opacity: 1 }} className="block truncate">
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
          onBack={step === "size" ? () => go("name", true) : step === "plan" ? () => go("size", true) : undefined}
          action={
            <ActionButton
              type="submit"
              disabled={(step === "name" && !typed) || (step === "size" && !size) || (step === "plan" && !picked) || busy === "free"}
              busy={busy === "name" || busy === "pay"}
              busyLabel={step === "plan" ? t("openingCheckout") : t("creating")}
            >
              {step === "plan" && picked
                ? t("getPlan", { plan: NAMES[picked.id], price: dollars(picked.price ?? 0) })
                : !selling
                  ? t("createIt")
                  : tEntry("continue")}
            </ActionButton>
          }
          secondary={
            step === "plan" && free ? (
              <QuietChoice onClick={stayFree}>
                {size === "few" || !size ? t("freeInstead", { count: free.seats }) : t("freeTooSmall", { count: free.seats })}
              </QuietChoice>
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
                  sitting={user ? [{ character: user.character, chair: [20, 8], name: user.displayName.split(" ")[0], status: "available" }] : []}
                  priority
                  className="absolute inset-0"
                />
              </div>
            </>
          )}

          {step === "size" && (
            <>
              <StepTitle title={t("sizeTitle")} body={t("sizeBody")} />
              <div role="radiogroup" aria-label={t("sizeTitle")} className="grid grid-cols-2 gap-2">
                {SIZES.map((one) => {
                  const on = size === one.id;
                  return (
                    <button
                      key={one.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setSize(one.id);
                        setChosen(null);
                      }}
                      className={cn(
                        "relative flex h-[76px] cursor-pointer flex-col items-start justify-center rounded-2xl border px-4 text-start outline-none transition-[border-color,background-color,transform] duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "border-foreground bg-foreground/[0.04]" : "border-border hover:border-foreground/30",
                      )}
                    >
                      <span className="text-[20px] font-semibold tabular-nums tracking-tight text-foreground">{one.label}</span>
                      <span className="text-[12.5px] text-muted-foreground">{t("people")}</span>
                      {on && <Tick />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === "plan" && (
            <>
              <StepTitle title={t("planTitle", { office: typed })} body={t("planBody")} />
              {/*
                The plans as two rows, one choice each: the name, how many
                people, the price and what that is a person. Nothing here grows
                or opens, so the step never scrolls; what every plan includes
                opens over the door instead.
              */}
              <div role="radiogroup" aria-label={t("planTitle", { office: typed })} className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {paid.map((one) => {
                  const on = plan === one.id;
                  const fits = SIZES.find((option) => option.id === size)?.plan !== "pro" || one.id === "pro";
                  return (
                    <button
                      key={one.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setChosen(one.id)}
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-start outline-none transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
                        on ? "border-foreground bg-foreground/[0.04]" : "border-border hover:border-foreground/30",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                          on ? "border-foreground bg-foreground" : "border-border-strong",
                        )}
                      >
                        {on && <span className="size-2 rounded-full bg-background" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-foreground">{NAMES[one.id]}</span>
                          {one.id === recommended && (
                            <span className="truncate rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">{t("recommended")}</span>
                          )}
                        </span>
                        <span className={cn("mt-0.5 block truncate text-[12.5px]", fits ? "text-muted-foreground" : "text-warn")}>
                          {t("upTo", { count: one.seats })}
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="flex items-baseline justify-end gap-0.5">
                          <span className="text-[19px] font-semibold tracking-tight text-foreground">{dollars(one.price ?? 0)}</span>
                          <span className="text-[12px] text-muted-foreground">{t("perMonth")}</span>
                        </span>
                        <span className="block text-[11.5px] text-muted-foreground">{t("perPerson", { price: perPerson(one) })}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowIncluded(true)}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Info className="size-3.5" />
                {t("included")}
              </button>
              <Dialog
                open={showIncluded}
                onClose={() => setShowIncluded(false)}
                title={t("included")}
                closeLabel={tc("close")}
              >
                <ul className="space-y-2.5 text-[13.5px] text-foreground">
                  {[
                    t("includedCalls"),
                    t("includedChat"),
                    t("includedMeetingsBoth", {
                      plus: paid.find((one) => one.id === "plus")?.meetingHours ?? 30,
                      pro: paid.find((one) => one.id === "pro")?.meetingHours ?? 60,
                    }),
                    t("includedCancel"),
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                      {line}
                    </li>
                  ))}
                </ul>
                {size === "large" && <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">{t("bigger")}</p>}
              </Dialog>
            </>
          )}

          {error && <StepError>{error}</StepError>}
        </DoorSteps>
      </form>
    </EntryShell>
  );
}

function Tick() {
  return (
    <span className="absolute end-2.5 top-2.5 flex size-[18px] items-center justify-center rounded-full bg-foreground text-background">
      <Check className="size-3" strokeWidth={3} />
    </span>
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
