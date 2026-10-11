"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AlertCircle, Check, CreditCard, Download, Loader2, Zap } from "@/components/ui/icons";
import { api, type BillingDetails, type OfficeBilling, type Payment, type Plan, type PlanId } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { PLAN_NAMES, PlanIncludes, ProOffer, paidPlan } from "@/components/billing/PlanCards";
import { usePlanChange } from "@/components/billing/usePlanChange";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";
import { SUPPORT_EMAIL } from "@/lib/site";

type Asking = "cancel" | null;

/**
 * An office's plan and billing (docs/pricing.md): what it's on and what it
 * pays, how full it is and how much of its meeting hours are used, then Pro
 * for an office without it (on Pro, or trying it, what it includes instead),
 * the card and the next charge, and every past payment. Buying opens Creem's
 * checkout over the page; the card and the invoices are in Creem's portal, for
 * whoever pays; cancelling asks first. The plan itself only changes when Creem
 * says so.
 */
export function PlanSection() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [asking, setAsking] = useState<Asking>(null);

  const office = context?.office;
  const admin = office?.role === "admin";
  const on = !!catalog?.billing;
  const officeId = office?.id;

  const reloadDetails = useCallback(async () => {
    if (!officeId) return;
    const found = await api.billingDetails(officeId).catch(() => null);
    if (found) setDetails(found);
  }, [officeId]);

  const change = usePlanChange(
    officeId,
    async (next) => {
      if (next) setBilling(next);
      else if (officeId) {
        const found = await api.billing(officeId).catch(() => null);
        if (found) setBilling(found);
      }
      setAsking(null);
      await Promise.all([context?.refresh(), reloadDetails()]);
    },
    "billing",
  );

  useEffect(() => {
    if (!officeId || !admin || !on) return;
    let cancelled = false;
    api.billing(officeId).then(
      (found) => !cancelled && setBilling(found),
      () => {},
    );
    api.billingDetails(officeId).then(
      (found) => !cancelled && setDetails(found),
      () => !cancelled && setDetails({ nextCharge: null, card: null, history: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [officeId, admin, on]);

  if (!context || !office) return null;
  const members = billing?.members ?? office.members;
  const sub = billing?.subscription ?? null;
  const trial = billing?.trial ?? null;
  const planId = (office.plan as PlanId) ?? "free";
  const plans = catalog?.plans ?? [];
  const current = plans.find((plan) => plan.id === planId);
  const pro = paidPlan(plans);
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long", year: "numeric" });
  const shortDate = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "short" });
  const money = (amount: number, currency: string) => format.number(amount / 100, { style: "currency", currency });
  const manage = on && admin;
  const busy = change.busy;

  const hours = billing ? billing.usage.seconds / 3600 : null;
  const allowance = billing?.meetingHours ?? current?.meetingHours ?? null;
  const choose = (plan: Plan) => plan.id !== "free" && void change.buy(plan.id);

  // What the plan says for itself under its name: when it renews, or ends, or that it's free.
  const status = (): ReactNode => {
    if (trial) return null; // The banner below says it.
    if (!sub) return t("freeNote", { seats: plans[0]?.seats ?? 3 });
    if (sub.status === "past_due") return null;
    if (sub.endsAt) return t("ends", { date: date(sub.endsAt) });
    if (details?.nextCharge) {
      return t("nextChargeLine", {
        amount: money(details.nextCharge.amount, details.nextCharge.currency),
        date: date(details.nextCharge.at),
      });
    }
    if (sub.renewsAt) return t("renews", { date: date(sub.renewsAt) });
    return null;
  };

  return (
    <div className="space-y-8">
      {/* What the office is on, what it pays, and how much of it is used. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-muted-foreground">{t("current")}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              {PLAN_NAMES[planId] ?? office.plan}
              {trial && <Pill tone="brand">{t("pillTrial")}</Pill>}
              {sub?.status === "past_due" && <Pill tone="alert">{t("pillPastDue")}</Pill>}
              {sub?.endsAt && <Pill>{t("pillEnding")}</Pill>}
            </p>
            {manage && status() && <p className="mt-1 text-[13px] text-muted-foreground">{status()}</p>}
            {!on && <PlansSoon className="mt-2" />}
          </div>
          {current?.price && !trial ? (
            <p className="shrink-0 text-end text-[12.5px] leading-tight text-muted-foreground">
              <span className="block text-[20px] font-semibold tracking-tight text-foreground">{dollars(current.price)}</span>
              {t("perMonth")}
            </p>
          ) : null}
        </div>

        {manage && trial && (
          <Banner tone="brand" icon={<Zap className="size-4 shrink-0 text-brand" />}>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">
              {t("trialNote", { plan: PLAN_NAMES[trial.plan], date: shortDate(trial.endsAt), seats: plans[0]?.seats ?? 3 })}
            </p>
            {trial.plan !== "free" && (
              <Button size="sm" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={() => change.buy("pro")}>
                {busy === trial.plan && <Loader2 className="size-3.5 animate-spin" />}
                {t("plans.keep", { plan: PLAN_NAMES[trial.plan] })}
              </Button>
            )}
          </Banner>
        )}
        {manage && !trial && !sub && office.trialOpen && !!catalog?.trialDays && (
          <Banner tone="brand" icon={<Zap className="size-4 shrink-0 text-brand" />}>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">
              {t("trialWaiting", { free: office.seats, plan: PLAN_NAMES[catalog.trialPlan ?? "pro"], days: catalog.trialDays })}
            </p>
          </Banner>
        )}
        {manage && sub?.status === "past_due" && (
          <Banner icon={<AlertCircle className="size-4 shrink-0 text-destructive" />}>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">{t("pastDue")}</p>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-3 text-[12.5px]"
              disabled={!!busy}
              onClick={() => change.portal("card")}
            >
              {t("updateCard")}
            </Button>
          </Banner>
        )}
        {manage && sub?.endsAt && (
          <Banner>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">{t("endingNote", { date: date(sub.endsAt) })}</p>
            <Button size="sm" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={change.resume}>
              {busy === "resume" && <Loader2 className="size-3.5 animate-spin" />}
              {t("keep")}
            </Button>
          </Banner>
        )}
        {change.waiting && (
          <p className="mx-5 mb-4 flex items-center gap-2 text-[13px] text-foreground">
            {change.waiting === "now" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-ok" />}
            {change.waiting === "now" ? t("settingUp") : t("settingUpSlow")}
          </p>
        )}

        {/*
          Free's one limit is people, so it's shown as one: how many of the 3.
          A paid office sees who's in it, not how many more it may have (docs/costs.md).
        */}
        <div className="border-t border-border">
          {planId === "free" ? (
            <Usage
              label={t("membersLabel")}
              value={t("usageOf", { used: members, total: office.seats })}
              note={members >= office.seats ? t("seatsFull") : t("seatsFree", { count: office.seats - members })}
            >
              <SeatBar used={members} seats={office.seats} />
            </Usage>
          ) : (
            <Usage label={t("membersLabel")} value={String(members)} />
          )}
        </div>
        {manage && hours !== null && allowance !== null && hours >= allowance && billing && (
          <p className="border-t border-border px-5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("hoursUsedUp", { date: shortDate(billing.usage.resetsAt) })}
          </p>
        )}
        {/* On Pro, or trying it, what it gives. */}
        {planId === "pro" && current && (
          <div className="border-t border-border p-5">
            <p className="mb-3 text-[12.5px] font-medium text-muted-foreground">{t("plans.included")}</p>
            <PlanIncludes plans={plans} />
          </div>
        )}
      </section>

      {/* Pro, for an office on Free; a trial keeps it from the banner above. */}
      {on && pro && planId === "free" && !sub && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-foreground">{t("plans.upgradeTitle")}</h3>
            <p className="text-[12px] text-faint">{t("plans.note")}</p>
          </div>
          <section className="rounded-2xl border border-border bg-background p-5">
            <ProOffer plans={plans} members={members} busy={busy} disabled={!!change.waiting} canChange={manage} onChoose={choose} split />
          </section>
          {change.error && !asking && <p className="mt-3 text-[12.5px] text-destructive">{change.error}</p>}
        </div>
      )}

      {/* The card and the next charge, once there is a subscription. */}
      {manage && sub && (
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">{t("payment")}</h3>
          <div className="divide-y divide-border rounded-2xl border border-border bg-background">
            <div className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <CreditCard className="size-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">{t("cardUnknown")}</p>
              {sub.status !== "canceled" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 shrink-0 px-3 text-[12.5px]"
                  disabled={!!busy}
                  onClick={() => change.portal("card")}
                >
                  {busy === "card" && <Loader2 className="size-3.5 animate-spin" />}
                  {t("update")}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4 text-[13px]">
              <span className="text-muted-foreground">{t("nextCharge")}</span>
              <span className="text-end font-medium tabular-nums text-foreground">
                {details === null
                  ? "…"
                  : details.nextCharge
                    ? t("chargeOn", {
                        amount: money(details.nextCharge.amount, details.nextCharge.currency),
                        date: shortDate(details.nextCharge.at),
                      })
                    : sub.endsAt
                      ? t("noneAfter", { date: shortDate(sub.endsAt) })
                      : "—"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Every payment; the invoices are in Creem's portal. */}
      {manage && (sub || (details && details.history.length > 0)) && (
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">{t("history")}</h3>
          {details === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          ) : details.history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-[12.5px] text-muted-foreground">
              {t("noPayments")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
              {details.history.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <span className="w-16 shrink-0 tabular-nums text-muted-foreground sm:w-20">{shortDate(payment.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {payment.plan ? t("planPayment", { plan: PLAN_NAMES[payment.plan] }) : t("payment")}
                  </span>
                  <PaymentStatus status={payment.status} />
                  <span className="shrink-0 text-end font-medium tabular-nums text-foreground">
                    {money(payment.amount, payment.currency)}
                  </span>
                  <span className="flex w-8 shrink-0 justify-end">
                    {payment.invoice && (
                      <button
                        type="button"
                        aria-label={t("invoice")}
                        title={t("invoice")}
                        disabled={!!busy}
                        onClick={() => change.portal(`invoice:${payment.id}`)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        {busy === `invoice:${payment.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* The rest, quietly: cancelling, and the small print. */}
      {manage && (
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            {t("fine")}{" "}
            {t.rich("billingEmail", {
              email: SUPPORT_EMAIL,
              link: (chunks) => (
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground underline-offset-2 hover:underline" dir="ltr">
                  {chunks}
                </a>
              ),
            })}
          </p>
          {sub && !sub.endsAt && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setAsking("cancel")}
              className="h-8 shrink-0 cursor-pointer self-start rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {on && !admin && <p className="text-[12.5px] text-muted-foreground">{t("adminsOnly")}</p>}

      {/*
        Cancelling, said plainly: what the team would lose, and keeping the
        plan as the easy choice. Cancelling stays one click away; nothing is
        hidden or made hard.
      */}
      <Dialog
        open={asking === "cancel"}
        onClose={() => setAsking(null)}
        title={t("cancelTitle")}
        description={sub?.renewsAt ? t("cancelWhen", { date: date(sub.renewsAt) }) : undefined}
        closeLabel={tc("close")}
        footer={
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={change.cancel}
              className="me-auto inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              {busy === "cancel" && <Loader2 className="size-4 animate-spin" />}
              {t("cancelAnyway")}
            </button>
            <Button size="sm" className="h-10 px-5" onClick={() => setAsking(null)}>
              {t("plans.keep", { plan: PLAN_NAMES[planId] })}
            </Button>
          </>
        }
      >
        <ul className="space-y-2.5 pb-2 text-[13px] leading-relaxed text-foreground">
          <li className="flex items-start gap-2.5">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/40" />
            {members > (plans[0]?.seats ?? 3)
              ? t("loseSeatsOver", { members, free: plans[0]?.seats ?? 3 })
              : t("loseSeats", { seats: office.seats, free: plans[0]?.seats ?? 3 })}
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-ok" />
            {t("loseNothing")}
          </li>
        </ul>
        {change.error && <p className="mt-2 text-[12.5px] text-destructive">{change.error}</p>}
      </Dialog>
    </div>
  );
}

/** A note across the plan card: a trial, a card that failed, or a plan that's ending. */
function Banner({ tone, icon, children }: { tone?: "brand"; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-xl p-3", tone === "brand" ? "bg-muted" : "bg-muted")}>
      {icon}
      {children}
    </div>
  );
}

/** One of the plan's limits: how much of it is used, a meter, and a line under it. */
function Usage({
  label,
  value,
  note,
  className,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[13.5px] font-medium tabular-nums text-foreground">{value}</p>
      </div>
      {children}
      {note && <p className="mt-2 text-[12px] text-faint">{note}</p>}
    </div>
  );
}

/** A word beside the plan's name: on trial, its card failed, or it's ending. */
function Pill({ tone, children }: { tone?: "alert" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11.5px] font-semibold tracking-normal",
        tone === "alert"
          ? "bg-destructive/10 text-destructive"
          : tone === "brand"
            ? "bg-brand/15 text-brand"
            : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function PaymentStatus({ status }: { status: Payment["status"] }) {
  const t = useTranslations("billing.status");
  if (status === "paid") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      {t(status)}
    </span>
  );
}

export function Bar({ share }: { share: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className="h-full rounded-full bg-foreground transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(share > 0 ? 2 : 0, share * 100))}%` }}
      />
    </div>
  );
}

/** One segment a seat while they're countable, a bar once they aren't. */
function SeatBar({ used, seats }: { used: number; seats: number }) {
  return seats <= 25 ? (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: seats }, (_, index) => (
        <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < used ? "bg-foreground" : "bg-muted")} />
      ))}
    </div>
  ) : (
    <Bar share={used / seats} />
  );
}
