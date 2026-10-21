"use client";

import { useTranslations } from "next-intl";
import { Check } from "@/components/ui/icons";
import type { Plan, PlanId } from "@/lib/api";

/** Plan names stay in English everywhere, like on the pricing page. */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", pro: "Pro" };

/** The one paid plan (docs/pricing.md), from the catalog. */
export const paidPlan = (plans: Plan[]) => plans.find((plan) => plan.price !== null);

/**
 * What Pro gives, as three short lines: only what's different, since the
 * office already knows what it has. On the plan page's Pro card, and when an
 * office is made with Pro.
 */
export function PlanIncludes({ plans, className }: { plans: Plan[]; className?: string }) {
  const t = useTranslations("billing.offer");
  if (!paidPlan(plans)) return null;
  // No hours, no counts: what the team gets, not what it's allowed (docs/costs.md).
  const items = [t("wholeTeam"), t("meetings"), t("support")];
  return (
    <div className={className}>
      <ul className="space-y-2.5 text-[13.5px] text-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
