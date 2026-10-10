"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Minus } from "@/components/ui/icons";
import type { Plan, PlanId } from "@/lib/api";
import { dollars } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Plan names stay in English everywhere, like on the pricing page. */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", plus: "Plus", pro: "Pro" };

export type PlanMove = "current" | "choose" | "upgrade" | "down";

/**
 * The plans worth showing an office (docs/22). Without a paid plan (on Free,
 * or trying one) both, Pro first; on Plus, only Pro; on Pro, none: there's
 * nothing above it, and nothing below worth offering.
 */
export function plansOnOffer(plans: Plan[], subscribed: PlanId | null): Plan[] {
  const paid = plans.filter((plan) => plan.price !== null);
  const pro = paid.filter((plan) => plan.id === "pro");
  if (subscribed === "pro") return [];
  if (subscribed === "plus") return pro;
  return [...pro, ...paid.filter((plan) => plan.id !== "pro")];
}

/**
 * The paid plans an office can move to, each with what it gives and what
 * choosing it would do (docs/22). The plans differ in how the office works,
 * not only in who fits: Pro is the full office (HD video, twice the meeting
 * time, help first), Plus the essentials, and its card says plainly what it
 * leaves out. Pro is marked as the one to have, and comes first. Members see
 * the plans without the buttons.
 */
export function PlanCards({
  plans,
  current,
  subscribed,
  members,
  trialEndsAt,
  busy,
  disabled,
  canChange,
  onChoose,
  className,
}: {
  /** The plans to show, from `plansOnOffer`. */
  plans: Plan[];
  current: PlanId;
  /** Paying through Creem: a move between paid plans is a switch. */
  subscribed: boolean;
  members: number;
  trialEndsAt?: number | null;
  busy?: string | null;
  disabled?: boolean;
  canChange: boolean;
  onChoose: (plan: Plan, move: PlanMove) => void;
  className?: string;
}) {
  const t = useTranslations("billing.plans");
  const trial = !!trialEndsAt;
  const plus = plans.find((plan) => plan.id === "plus");
  const order: PlanId[] = ["free", "plus", "pro"];

  const moveTo = (plan: Plan): PlanMove => {
    // A trial's plan isn't paid for yet: choosing it is buying it.
    if (plan.id === current && !trial) return "current";
    if (!subscribed) return "choose";
    return order.indexOf(plan.id) > order.indexOf(current) ? "upgrade" : "down";
  };

  if (!plans.length) return null;
  return (
    <div className={cn("grid gap-3", plans.length > 1 && "sm:grid-cols-2", className)}>
      {plans.map((plan) => {
        const pro = plan.id === "pro";
        const move = moveTo(plan);
        const mine = plan.id === current;
        const tooSmall = members > plan.seats && move !== "current";
        const perks: Array<{ on: boolean; label: ReactNode }> = pro
          ? [
              {
                on: true,
                label: (
                  <>
                    {t("hours", { count: plan.meetingHours })}
                    {plus && plan.meetingHours > plus.meetingHours && (
                      <span className="text-muted-foreground"> · {t("times", { count: Math.round(plan.meetingHours / plus.meetingHours) })}</span>
                    )}
                  </>
                ),
              },
              { on: true, label: t("hd") },
              { on: true, label: t("support") },
              { on: true, label: t("people", { count: plan.seats }) },
            ]
          : [
              { on: true, label: t("hours", { count: plan.meetingHours }) },
              { on: true, label: t("sd") },
              { on: false, label: t("hd") },
              { on: false, label: t("support") },
              { on: true, label: t("people", { count: plan.seats }) },
            ];
        return (
          <section
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-background p-5",
              pro ? "border-foreground/80 shadow-[0_1px_0_rgb(0_0_0/0.02),0_12px_32px_-18px_rgb(0_0_0/0.35)]" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[16px] font-semibold tracking-tight text-foreground">{PLAN_NAMES[plan.id]}</h3>
              {mine && trial ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("trial")}</span>
              ) : (
                pro && <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] font-semibold text-background">{t("best")}</span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">{pro ? t("taglinePro") : t("taglinePlus")}</p>

            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-[28px] font-semibold tabular-nums tracking-tight text-foreground">{dollars(plan.price ?? 0)}</span>
              <span className="text-[12.5px] text-muted-foreground">{t("perMonth")}</span>
            </p>

            {pro && plus && <p className="mt-4 text-[12.5px] font-medium text-foreground">{t("everythingIn", { plan: PLAN_NAMES.plus })}</p>}
            <ul className={cn("space-y-2 text-[13px]", pro && plus ? "mt-2" : "mt-4")}>
              {perks.map((perk, index) => (
                <li key={index} className={cn("flex items-start gap-2", perk.on ? "text-foreground" : "text-faint")}>
                  {perk.on ? <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" /> : <Minus className="mt-0.5 size-3.5 shrink-0" />}
                  <span className={cn(!perk.on && "line-through decoration-faint/60")}>{perk.label}</span>
                </li>
              ))}
            </ul>

            {canChange && (
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  disabled={disabled || !!busy || move === "current" || tooSmall}
                  onClick={() => onChoose(plan, move)}
                  className={cn(
                    "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:cursor-default",
                    move === "current"
                      ? "bg-muted text-muted-foreground"
                      : pro
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
                {tooSmall && <p className="mt-2 text-center text-[11.5px] text-muted-foreground">{t("tooSmall", { count: plan.seats, members })}</p>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** What Pro gives, as a short list: for the office that has it, a reminder of what it's paying for. */
export function ProIncludes({ plan, plus, className }: { plan: Plan; plus?: Plan; className?: string }) {
  const t = useTranslations("billing.plans");
  const items = [
    plus && plan.meetingHours > plus.meetingHours
      ? `${t("hours", { count: plan.meetingHours })} · ${t("times", { count: Math.round(plan.meetingHours / plus.meetingHours) })}`
      : t("hours", { count: plan.meetingHours }),
    t("hd"),
    t("support"),
    t("people", { count: plan.seats }),
  ];
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
