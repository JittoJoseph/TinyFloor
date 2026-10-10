"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ArrowUp, Check, CreditCard, Download, Loader2 } from "@/components/ui/icons";
import { api, ApiError, type BillingDetails, type OfficeBilling, type Payment, type Plan, type PlanId } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { openCheckout, openPortal, waitForPlan } from "@/lib/checkout";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";

/** Plan names stay in English everywhere, like on the pricing page. */
const NAMES: Record<PlanId, string> = { free: "Free", plus: "Plus", pro: "Pro" };

type Asking = { kind: "switch"; plan: Plan } | { kind: "cancel" } | null;

/**
 * An office's plan and billing (docs/14, docs/15): what it's on and what it
 * pays, how full it is and how much of its meeting hours are used, and one
 * way up: the plan above this one, with what it adds, not every plan at once.
 * Then the card and the next charge, every past payment with its invoice, and
 * quietly at the end, moving down a plan or cancelling. Buying opens Creem's
 * checkout over the page, and the card and invoices are in Creem's customer
 * portal, for whoever pays; switching and cancelling ask first. The plan
 * itself only changes when Creem says so.
 */
export function PlanSection() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<"now" | "slow" | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const reload = useCallback(async () => {
    if (!officeId) return;
    const found = await api.billing(officeId).catch(() => null);
    if (found) setBilling(found);
    await reloadDetails();
  }, [officeId, reloadDetails]);

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
  const { refresh } = context;
  const members = billing?.members ?? office.members;
  const sub = billing?.subscription ?? null;
  const planId = (office.plan as PlanId) ?? "free";
  const current = catalog?.plans.find((plan) => plan.id === planId);
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long", year: "numeric" });
  const shortDate = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "short" });
  const money = (amount: number, currency: string) => format.number(amount / 100, { style: "currency", currency });

  const explain = (problem: unknown) => {
    if (problem instanceof ApiError && problem.code === "too_many_members") return t("errors.tooManyMembers");
    if (problem instanceof ApiError && problem.code === "has_subscription") return t("errors.hasSubscription");
    if (problem instanceof ApiError && problem.code === "not_payer") return t("errors.notPayer");
    return t("errors.failed");
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(explain(problem));
    } finally {
      setBusy(null);
    }
  };

  const dark = () => document.documentElement.classList.contains("dark");

  const buy = (plan: Plan) =>
    run(plan.id, async () => {
      const { checkoutId, url } = await api.checkout(office.id, plan.id);
      const paid = await openCheckout({ url, locale, dark: dark() });
      if (!paid) return;
      setWaiting("now");
      const landed = await waitForPlan(office.id, checkoutId, (now) => now === plan.id);
      setWaiting(landed ? null : "slow");
      await Promise.all([refresh(), reload()]);
    });

  const switchTo = (plan: Plan) =>
    run(plan.id, async () => {
      setBilling(await api.changePlan(office.id, plan.id));
      setAsking(null);
      await Promise.all([refresh(), reloadDetails()]);
    });

  const cancel = () =>
    run("cancel", async () => {
      setBilling(await api.cancelPlan(office.id));
      setAsking(null);
      await reloadDetails();
    });

  const resume = () =>
    run("resume", async () => {
      setBilling(await api.resumePlan(office.id));
      await reloadDetails();
    });

  // The card and the invoices are both in Creem's customer portal.
  const updateCard = () => run("card", () => openPortal(office.id));
  const invoice = (payment: Payment) => run(`invoice:${payment.id}`, () => openPortal(office.id));

  const hours = billing ? billing.usage.seconds / 3600 : null;
  const allowance = billing?.meetingHours ?? current?.meetingHours ?? null;
  const seatsShare = office.seats ? members / office.seats : 0;
  const hoursShare = hours !== null && allowance ? hours / allowance : 0;
  const plans = catalog?.plans ?? [];
  // The one plan above this one, if there is one: what the page offers.
  const next = plans[plans.findIndex((plan) => plan.id === planId) + 1] ?? null;
  const below = plans[plans.findIndex((plan) => plan.id === planId) - 1];
  const other = !sub && next ? plans[plans.indexOf(next) + 1] : undefined;
  const manage = on && admin;
  const offering = manage && !!next?.price && !sub?.endsAt;

  // What the plan says for itself under its name: when it renews, or ends, or that it's free.
  const status = (): ReactNode => {
    if (!sub) return t("freeNote");
    if (sub.status === "past_due") return null;
    if (sub.endsAt) return t("ends", { date: date(sub.endsAt) });
    if (details?.nextCharge) {
      return t("nextChargeLine", { amount: money(details.nextCharge.amount, details.nextCharge.currency), date: date(details.nextCharge.at) });
    }
    if (sub.renewsAt) return t("renews", { date: date(sub.renewsAt) });
    return null;
  };

  // Why the next plan, said in one line: whichever limit is closest.
  const reason =
    seatsShare >= 1 ? t("upgradeFull") : hoursShare >= 0.8 ? t("upgradeHours") : sub ? t("upgradeRoom") : t("upgradeFree");

  return (
    <div className="space-y-6">
      {/* What the office is on, what it pays, and how much of it is used. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-muted-foreground">{t("current")}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              {NAMES[planId] ?? office.plan}
              {sub?.status === "past_due" && <Pill tone="warn">{t("pillPastDue")}</Pill>}
              {sub?.endsAt && <Pill>{t("pillEnding")}</Pill>}
            </p>
            {manage && status() && <p className="mt-1 text-[13px] text-muted-foreground">{status()}</p>}
            {!on && <PlansSoon className="mt-2" />}
          </div>
          {current?.price ? (
            <p className="shrink-0 text-end text-[12.5px] leading-tight text-muted-foreground">
              <span className="block text-[20px] font-semibold tracking-tight text-foreground">{dollars(current.price)}</span>
              {t("perMonth")}
            </p>
          ) : null}
        </div>

        {manage && sub?.status === "past_due" && (
          <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-warn/10 p-3">
            <AlertTriangle className="size-4 shrink-0 text-warn" />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">{t("pastDue")}</p>
            <Button size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={updateCard}>
              {t("updateCard")}
            </Button>
          </div>
        )}
        {manage && sub?.endsAt && (
          <div className="mx-5 mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted p-3">
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">{t("endingNote", { date: date(sub.endsAt) })}</p>
            <Button size="sm" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={resume}>
              {busy === "resume" && <Loader2 className="size-3.5 animate-spin" />}
              {t("keep")}
            </Button>
          </div>
        )}
        {waiting && (
          <p className="mx-5 mb-4 flex items-center gap-2 text-[13px] text-foreground">
            {waiting === "now" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-ok" />}
            {waiting === "now" ? t("settingUp") : t("settingUpSlow")}
          </p>
        )}

        {/* The two limits, side by side where there's room. */}
        <div className="grid border-t border-border sm:grid-cols-2">
          <Usage
            label={t("membersLabel")}
            value={t("usageOf", { used: members, total: office.seats })}
            note={members >= office.seats ? t("seatsFull") : t("seatsFree", { count: office.seats - members })}
            warn={members >= office.seats}
          >
            <SeatBar used={members} seats={office.seats} />
          </Usage>
          {manage && allowance !== null && (
            <Usage
              label={t("hoursLabel")}
              value={hours === null ? "…" : t("hours", { used: format.number(hours, { maximumFractionDigits: hours < 10 ? 1 : 0 }), allowance })}
              note={billing ? t("hoursResets", { date: shortDate(billing.usage.resetsAt) }) : undefined}
              warn={hoursShare >= 1}
              className="border-t border-border sm:border-s sm:border-t-0"
            >
              <Bar share={hoursShare} warmAt={0.8} />
            </Usage>
          )}
        </div>
        {manage && hours !== null && allowance !== null && hours >= allowance && billing && (
          <p className="border-t border-border px-5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("hoursUsedUp", { date: shortDate(billing.usage.resetsAt) })}
          </p>
        )}
      </section>

      {/*
        The way up: only the plan above this one, with what it adds next to
        what the office has now, and why it might be time. The top plan gets
        a line about going bigger instead.
      */}
      {offering && next?.price && (
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className={cn("text-[12.5px] font-medium", seatsShare >= 1 || hoursShare >= 0.8 ? "text-warn" : "text-brand")}>{reason}</p>
              <p className="mt-1 text-[17px] font-semibold tracking-tight text-foreground">{t("upgradeTitle", { plan: NAMES[next.id] })}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Gain value={t("gainPeople", { count: next.seats })} now={t("gainNow", { value: office.seats })} />
                <Gain value={t("gainHours", { count: next.meetingHours })} now={t("gainNow", { value: allowance ?? current?.meetingHours ?? 0 })} />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <Button
                size="md"
                className="h-11 gap-2 px-5 text-[14px]"
                disabled={!!busy || !!waiting}
                onClick={() => (sub ? setAsking({ kind: "switch", plan: next }) : buy(next))}
              >
                {busy === next.id && <Loader2 className="size-4 animate-spin" />}
                {t("upgradeButton", { plan: NAMES[next.id], price: dollars(next.price) })}
              </Button>
              {other?.price && (
                <button
                  type="button"
                  disabled={!!busy || !!waiting}
                  onClick={() => buy(other)}
                  className="cursor-pointer text-center text-[12.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50 sm:text-end"
                >
                  {t("orPlan", { plan: NAMES[other.id], count: other.seats, price: dollars(other.price) })}
                </button>
              )}
            </div>
          </div>
          {error && <p className="mt-3 text-[12.5px] text-destructive">{error}</p>}
        </section>
      )}
      {manage && !next && sub && (
        <p className="rounded-2xl bg-muted/60 px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">{t("topPlan", { count: current?.seats ?? 25 })}</p>
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-foreground">
                  {details === null ? "…" : details.card ? cardName(details.card, t) : t("cardUnknown")}
                </p>
                {details?.card?.expires && <p className="text-[12px] text-muted-foreground">{t("expires", { date: details.card.expires })}</p>}
              </div>
              {sub.status !== "canceled" && (
                <Button variant="secondary" size="sm" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={updateCard}>
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
                    ? t("chargeOn", { amount: money(details.nextCharge.amount, details.nextCharge.currency), date: shortDate(details.nextCharge.at) })
                    : sub.endsAt
                      ? t("noneAfter", { date: shortDate(sub.endsAt) })
                      : "—"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Every payment, with its invoice. */}
      {manage && (sub || (details && details.history.length > 0)) && (
        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">{t("history")}</h3>
          {details === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          ) : details.history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong px-4 py-6 text-center text-[12.5px] text-muted-foreground">{t("noPayments")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
              {details.history.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <span className="w-16 shrink-0 tabular-nums text-muted-foreground sm:w-20">{shortDate(payment.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {payment.plan ? t("planPayment", { plan: NAMES[payment.plan] }) : t("payment")}
                  </span>
                  <PaymentStatus status={payment.status} />
                  <span className="shrink-0 text-end font-medium tabular-nums text-foreground">{money(payment.amount, payment.currency)}</span>
                  <span className="flex w-8 shrink-0 justify-end">
                    {payment.invoice && (
                      <button
                        type="button"
                        aria-label={t("invoice")}
                        title={t("invoice")}
                        disabled={!!busy}
                        onClick={() => invoice(payment)}
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

      {/* The rest, quietly: moving down a plan, cancelling, and the small print. */}
      {manage && (
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">
            {t("hoursExplained")} {t("fine")}
          </p>
          {sub && !sub.endsAt && (
            <div className="flex shrink-0 gap-1">
              {below?.price && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => setAsking({ kind: "switch", plan: below })}
                  className="h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {t("moveDown", { plan: NAMES[below.id] })}
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setAsking({ kind: "cancel" })}
                className="h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
      )}
      {manage && !offering && error && <p className="text-[12.5px] text-destructive">{error}</p>}

      {on && !admin && <p className="text-[12.5px] text-muted-foreground">{t("adminsOnly")}</p>}

      <Dialog
        open={asking?.kind === "switch"}
        onClose={() => setAsking(null)}
        title={asking?.kind === "switch" ? t("switchTitle", { plan: NAMES[asking.plan.id] }) : ""}
        description={t("switchBody")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="ghost" size="sm" className="h-10 px-4" onClick={() => setAsking(null)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" className="h-10 px-5" disabled={!!busy} onClick={() => asking?.kind === "switch" && switchTo(asking.plan)}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("switch")}
            </Button>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
      <Dialog
        open={asking?.kind === "cancel"}
        onClose={() => setAsking(null)}
        title={t("cancelTitle")}
        description={sub?.renewsAt ? t("cancelBody", { date: date(sub.renewsAt) }) : t("cancelBodyNow")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="ghost" size="sm" className="h-10 px-4" onClick={() => setAsking(null)}>
              {t("keep")}
            </Button>
            <Button size="sm" className="h-10 bg-destructive px-5 text-white hover:bg-destructive/90" disabled={!!busy} onClick={cancel}>
              {busy === "cancel" && <Loader2 className="size-4 animate-spin" />}
              {t("cancel")}
            </Button>
          </>
        }
      />
    </div>
  );
}

/** One of the plan's limits: how much of it is used, a meter, and a line under it. */
function Usage({
  label,
  value,
  note,
  warn,
  className,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  warn?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[13.5px] font-medium tabular-nums text-foreground">{value}</p>
      </div>
      {children}
      {note && <p className={cn("mt-2 text-[12px]", warn ? "text-warn" : "text-faint")}>{note}</p>}
    </div>
  );
}

/** What the next plan brings, beside what the office has now. */
function Gain({ value, now }: { value: string; now: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pe-3 ps-2.5 text-[12.5px]">
      <ArrowUp className="size-3.5 text-ok" />
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-muted-foreground">{now}</span>
    </span>
  );
}

/** A word beside the plan's name: its card failed, or it's ending. */
function Pill({ tone, children }: { tone?: "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11.5px] font-semibold tracking-normal",
        tone === "warn" ? "bg-warn/15 text-warn" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function cardName(card: NonNullable<BillingDetails["card"]>, t: ReturnType<typeof useTranslations<"billing">>) {
  const brand = card.brand === "card" ? t("card") : card.brand.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
  return card.last4 ? t("cardEnding", { brand, last4: card.last4 }) : brand;
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

function Bar({ share, warmAt = 1 }: { share: number; warmAt?: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", share >= warmAt ? "bg-warn" : "bg-foreground")}
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
