"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2 } from "@/components/ui/icons";
import type { Plan, PlanId } from "@/lib/api";
import { dollars } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan names stay in English everywhere, like on the pricing page. */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", pro: "Pro" };

/** The one paid plan (docs/23), from the catalog. */
export const paidPlan = (plans: Plan[]) => plans.find((plan) => plan.price !== null);

/**
 * The paid plan, as a card an office without it can take (docs/23): one price
 * for the whole team, what it gives, and the button. During the trial the
 * button keeps the plan the team is already on. Members see it without the
 * button.
 */
export function PlanCard({
  plan,
  trial,
  busy,
  disabled,
  canChange,
  onChoose,
  className,
}: {
  plan: Plan;
  /** The team is trying this plan: choosing it is keeping it. */
  trial?: boolean;
  busy?: string | null;
  disabled?: boolean;
  canChange: boolean;
  onChoose: (plan: Plan) => void;
  className?: string;
}) {
  const t = useTranslations("billing.plans");
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border bg-background p-5 sm:flex-row sm:items-start sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0 sm:w-56 sm:shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold tracking-tight text-foreground">{PLAN_NAMES[plan.id]}</h3>
          {trial && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("trial")}</span>}
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t("taglinePro")}</p>
        <p className="mt-4 flex items-baseline gap-1">
          <span className="text-[28px] font-semibold tabular-nums tracking-tight text-foreground">{dollars(plan.price ?? 0)}</span>
          <span className="text-[12.5px] text-muted-foreground">{t("perMonth")}</span>
        </p>
        {canChange && (
          <button
            type="button"
            disabled={disabled || !!busy}
            onClick={() => onChoose(plan)}
            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-colors hover:bg-foreground/85 disabled:cursor-default disabled:opacity-50"
          >
            {busy === plan.id && <Loader2 className="size-3.5 animate-spin" />}
            {trial ? t("keep", { plan: PLAN_NAMES[plan.id] }) : t("choose", { plan: PLAN_NAMES[plan.id] })}
          </button>
        )}
      </div>
      <PlanIncludes plan={plan} className="sm:mt-1 sm:flex-1 sm:grid-cols-1" />
    </section>
  );
}

/** What the paid plan gives, as a short list: on its card, and for the office that has it. */
export function PlanIncludes({ plan, className }: { plan: Plan; className?: string }) {
  const t = useTranslations("billing.plans");
  const items = [t("wholeTeam"), t("hd"), t("hours", { count: plan.meetingHours }), t("support")];
  return (
    <ul className={cn("grid gap-x-6 gap-y-2 text-[13px] text-foreground sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}
