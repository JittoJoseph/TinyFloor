"use client";

import { useFormatter, useTranslations } from "next-intl";
import { FOUNDING, foundingOpen } from "@/lib/founding";
import { Check, Loader2 } from "@/components/ui/icons";
import type { Plan, PlanId } from "@/lib/api";
import { dollars } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan names stay in English everywhere, like on the pricing page. */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", pro: "Pro" };

/** The one paid plan (docs/pricing.md), from the catalog. */
export const paidPlan = (plans: Plan[]) => plans.find((plan) => plan.price !== null);

/** What a per-person tool charges a person (Gather's $12, docs/pricing.md's survey), for the comparison. */
const PER_SEAT = 1200;

/**
 * Pro as an office is offered it (docs/pricing.md). The price is said three ways, each
 * true for this team: the flat price, what it comes to for each of them (or a
 * day, for one person), and what per-person tools would charge the same team.
 * Then what changes, as three short lines. The button says the price again,
 * and under it the two things that make saying yes safe. Until the founding
 * price closes, a line says the price is theirs to keep, and what it becomes
 * for offices that come later: a real date and a real price, never a
 * countdown, a crossed-out price or a "most popular".
 */
export function ProOffer({
  plans,
  members,
  trial,
  busy,
  disabled,
  canChange,
  onChoose,
  split,
  className,
}: {
  plans: Plan[];
  /** How many people the office has now: the price is put in their terms. */
  members: number;
  /** The team is trying Pro: the button keeps it. */
  trial?: boolean;
  busy?: string | null;
  disabled?: boolean;
  canChange: boolean;
  onChoose: (plan: Plan) => void;
  /** Price and button beside the list, for a wide page; stacked otherwise. */
  split?: boolean;
  className?: string;
}) {
  const t = useTranslations("billing.offer");
  const format = useFormatter();
  const pro = paidPlan(plans);
  if (!pro?.price) return null;
  const price = pro.price;
  const cents = (amount: number) => `$${(Math.ceil(amount) / 100).toFixed(2)}`;
  const each =
    members >= 2
      ? t("each", { count: members, price: cents(price / members) })
      : t("daily", { price: dollars(Math.ceil(price / 30 / 100) * 100) });

  return (
    <div className={cn("grid gap-5", split && "sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-8", className)}>
      <div className="min-w-0">
        <div className="rounded-2xl bg-muted/70 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            {PLAN_NAMES[pro.id]}
            {trial && (
              <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("trial")}</span>
            )}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[32px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-foreground">{dollars(price)}</span>
            <span className="text-[12.5px] text-muted-foreground">{t("perMonth")}</span>
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-foreground">{each}</p>
          {members >= 4 && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("anchor", { price: dollars(PER_SEAT * members) })}</p>
          )}
          {foundingOpen() && (
            <p className="mt-3 border-t border-foreground/[0.07] pt-3 text-[12px] leading-relaxed text-muted-foreground">
              {t("founding", {
                price: dollars(FOUNDING.laterPrice * 100),
                date: format.dateTime(new Date(FOUNDING.until), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
              })}
            </p>
          )}
        </div>
        {canChange && split && (
          <OfferButton price={price} trial={trial} busy={busy === pro.id} disabled={disabled || !!busy} onClick={() => onChoose(pro)} />
        )}
      </div>
      <div className="min-w-0">
        <PlanIncludes plans={plans} />
        {canChange && !split && (
          <OfferButton price={price} trial={trial} busy={busy === pro.id} disabled={disabled || !!busy} onClick={() => onChoose(pro)} />
        )}
      </div>
    </div>
  );
}

function OfferButton({
  price,
  trial,
  busy,
  disabled,
  onClick,
}: {
  price: number;
  trial?: boolean;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("billing.offer");
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.99] disabled:cursor-default disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {trial ? t("keep", { price: dollars(price) }) : t("get", { price: dollars(price) })}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] text-muted-foreground">{t("assurance")}</p>
    </div>
  );
}

/**
 * What Pro gives, as three short lines: only what's different, since the
 * office already knows what it has. On the offer, when an office is made with
 * Pro, and for an office on Pro as a reminder of what it's paying for.
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
