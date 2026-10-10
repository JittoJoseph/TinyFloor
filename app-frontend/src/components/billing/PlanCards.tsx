"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Check, Loader2 } from "@/components/ui/icons";
import type { Plan, PlanId } from "@/lib/api";
import { dollars } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan names stay in English everywhere, like on the pricing page. */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", plus: "Plus", pro: "Pro" };

export type PlanMove = "current" | "choose" | "upgrade" | "down";

/**
 * The paid plans side by side (docs/22), the office's own marked: what each
 * holds, what it costs, and what choosing it would do. Free isn't one of them:
 * an office on it says so above, and going back to it is cancelling, which
 * Plan and billing explains on its own. Whichever answers the reason the page
 * was opened for is marked too. Members see the plans without the buttons.
 */
export function PlanCards({
  plans,
  current,
  subscribed,
  members,
  trialEndsAt,
  suggested,
  busy,
  disabled,
  canChange,
  onChoose,
  className,
}: {
  plans: Plan[];
  current: PlanId;
  /** Paying through Creem: a move between paid plans is a switch, and Free is cancelling. */
  subscribed: boolean;
  members: number;
  trialEndsAt?: number | null;
  /** The plan that fixes what brought them here: room for everyone, or the hours. */
  suggested?: PlanId | null;
  busy?: string | null;
  disabled?: boolean;
  canChange: boolean;
  onChoose: (plan: Plan, move: PlanMove) => void;
  className?: string;
}) {
  const t = useTranslations("billing.plans");
  const format = useFormatter();
  const rank = (id: PlanId) => plans.findIndex((plan) => plan.id === id);
  const trial = !!trialEndsAt;

  const moveTo = (plan: Plan): PlanMove => {
    // A trial's plan isn't paid for yet: choosing it is buying it.
    if (plan.id === current && !trial) return "current";
    if (!subscribed) return "choose";
    return rank(plan.id) > rank(current) ? "upgrade" : "down";
  };

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {plans
        .filter((plan) => plan.price !== null)
        .map((plan) => {
        const move = moveTo(plan);
        const mine = plan.id === current;
        const tooSmall = members > plan.seats && move !== "current";
        const marked = !mine && suggested === plan.id;
        const perPerson = plan.price ? format.number(plan.price / 100 / plan.seats, { style: "currency", currency: "USD" }) : null;
        return (
          <section
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-background p-4 transition-colors sm:p-5",
              mine ? "border-foreground/70" : marked ? "border-brand/60" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{PLAN_NAMES[plan.id]}</h3>
              {mine ? (
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
                  {trial ? t("trial") : t("current")}
                </span>
              ) : (
                marked && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">{t("fits")}</span>
              )}
            </div>

            <p className="mt-3 flex items-baseline gap-1">
              <span className="text-[26px] font-semibold tabular-nums tracking-tight text-foreground">{dollars(plan.price ?? 0)}</span>
              <span className="text-[12.5px] text-muted-foreground">{plan.price ? t("perMonth") : t("forever")}</span>
            </p>
            <p className="text-[12px] text-faint">{perPerson ? t("perPerson", { price: perPerson }) : t("noCard")}</p>

            <ul className="mt-4 space-y-2 text-[13px] text-foreground">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                <span className={cn(tooSmall && "text-warn")}>{t("people", { count: plan.seats })}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                {t("hours", { count: plan.meetingHours })}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-ok" />
                {t("everything")}
              </li>
            </ul>

            {canChange && (
              <div className="mt-auto pt-5">
                <button
                  type="button"
                  disabled={disabled || !!busy || move === "current" || tooSmall}
                  onClick={() => onChoose(plan, move)}
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors disabled:cursor-default",
                    move === "current"
                      ? "bg-muted text-muted-foreground"
                      : move === "choose" || move === "upgrade"
                        ? "bg-foreground text-background hover:bg-foreground/85 disabled:opacity-50"
                        : "border border-border text-foreground hover:bg-muted disabled:opacity-50",
                  )}
                >
                  {busy === plan.id && <Loader2 className="size-3.5 animate-spin" />}
                  {move === "current"
                    ? t("currentButton")
                    : move === "choose"
                      ? trial && mine
                        ? t("keep", { plan: PLAN_NAMES[plan.id] })
                        : t("choose", { plan: PLAN_NAMES[plan.id] })
                      : move === "upgrade"
                        ? t("upgrade", { plan: PLAN_NAMES[plan.id] })
                        : t("moveTo", { plan: PLAN_NAMES[plan.id] })}
                </button>
                {tooSmall && <p className="mt-2 text-center text-[11.5px] text-warn">{t("tooSmall", { count: plan.seats, members })}</p>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Which plan fixes it: the smallest that holds everyone (and one more), or more hours than now. */
export function planThatFits(plans: Plan[], current: PlanId, need: { people?: number; hours?: boolean }): PlanId | null {
  const now = plans.find((plan) => plan.id === current);
  const fits = plans.find(
    (plan) =>
      plan.price !== null &&
      (need.people === undefined || plan.seats >= need.people) &&
      (!need.hours || !now || plan.meetingHours > now.meetingHours) &&
      plan.id !== current,
  );
  return fits?.id ?? null;
}
