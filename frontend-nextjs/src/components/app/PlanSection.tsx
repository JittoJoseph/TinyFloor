"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, CreditCard, Download, Loader2 } from "lucide-react";
import { api, ApiError, type BillingDetails, type OfficeBilling, type Payment, type Plan, type PlanId } from "@/lib/api";
import { dollars, openCheckout, usePlans, waitForPlan } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";

/** Plan names stay in English everywhere, like on the pricing page. */
const NAMES: Record<PlanId, string> = { free: "Free", plus: "Plus", pro: "Pro" };

type Asking = { kind: "switch"; plan: Plan } | { kind: "cancel" } | null;

/**
 * An office's plan and billing (docs/14): what it's on and how much of it is
 * used, the plans side by side, the card and the next charge, and every past
 * payment with its invoice. Buying and new cards open Paddle's checkout over
 * the page; switching and cancelling ask first. The plan itself only changes
 * when Paddle says so.
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
      const { transactionId, email } = await api.checkout(office.id, plan.id);
      const paid = await openCheckout({ transactionId, email, locale, dark: dark() });
      if (!paid) return;
      setWaiting("now");
      const landed = await waitForPlan(office.id, transactionId, (now) => now === plan.id);
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

  const updateCard = () =>
    run("card", async () => {
      const { transactionId } = await api.paymentMethod(office.id);
      if (await openCheckout({ transactionId, email: null, locale, dark: dark() })) await reload();
    });

  const invoice = (payment: Payment) =>
    run(`invoice:${payment.id}`, async () => {
      // Opened before asking, so the browser treats it as the click's own tab.
      const tab = window.open("about:blank", "_blank");
      try {
        const { url } = await api.invoice(office.id, payment.id);
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else window.location.href = url;
      } catch (problem) {
        tab?.close();
        throw problem;
      }
    });

  const status = (): ReactNode => {
    if (!sub) return t("freeNote");
    if (sub.status === "past_due") return null;
    if (sub.endsAt) return t("ends", { date: date(sub.endsAt) });
    if (sub.renewsAt) return t("renews", { date: date(sub.renewsAt) });
    return null;
  };

  const hours = billing ? billing.usage.seconds / 3600 : null;
  const allowance = billing?.meetingHours ?? current?.meetingHours ?? null;
  const showHours = on && admin && allowance !== null;

  return (
    <>
      {/* What the office is on now, and how much of it is used. */}
      <section className="mb-8 rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <p className="text-[12.5px] font-medium text-muted-foreground">{t("current")}</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">{NAMES[planId] ?? office.plan}</p>
          </div>
          {current?.price ? (
            <p className="text-[13px] text-muted-foreground">
              <span className="text-[15px] font-semibold text-foreground">{dollars(current.price)}</span> {t("perMonth")}
            </p>
          ) : null}
        </div>
        {on && admin && status() && <p className="mt-1 text-[13px] text-muted-foreground">{status()}</p>}
        {!on && <PlansSoon className="mt-2" />}

        <div className={cn("mt-5 grid gap-5", showHours && "sm:grid-cols-2")}>
          <Meter label={t("membersLabel")} value={t("members", { used: members, seats: office.seats })}>
            <SeatBar used={members} seats={office.seats} />
          </Meter>
          {showHours && (
            <Meter
              label={t("hoursLabel")}
              value={
                hours === null
                  ? "…"
                  : t("hours", {
                      used: format.number(hours, { maximumFractionDigits: hours < 10 ? 1 : 0 }),
                      allowance,
                    })
              }
              note={billing ? t("hoursResets", { date: shortDate(billing.usage.resetsAt) }) : undefined}
            >
              <Bar share={hours === null ? 0 : hours / allowance} />
            </Meter>
          )}
        </div>
        {on && admin && hours !== null && allowance !== null && hours >= allowance && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("hoursUsedUp", { date: shortDate(billing!.usage.resetsAt) })}
          </p>
        )}

        {on && admin && sub?.status === "past_due" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-warn/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <p className="flex-1 text-[13px] leading-relaxed text-foreground">{t("pastDue")}</p>
            <Button size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={updateCard}>
              {t("updateCard")}
            </Button>
          </div>
        )}
        {on && admin && sub?.endsAt && (
          <Button size="sm" className="mt-4 h-9 px-4 text-[13px]" disabled={!!busy} onClick={resume}>
            {busy === "resume" && <Loader2 className="size-4 animate-spin" />}
            {t("keep")}
          </Button>
        )}
        {waiting && (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-foreground">
            {waiting === "now" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-ok" />}
            {waiting === "now" ? t("settingUp") : t("settingUpSlow")}
          </p>
        )}
      </section>

      {on && admin && catalog && (
        <>
          <h3 className="mb-3 text-[13px] font-semibold text-foreground">{t("plans")}</h3>
          <ul className="grid gap-3 sm:grid-cols-3">
            {catalog.plans.map((plan) => {
              const isCurrent = sub ? sub.plan === plan.id : plan.id === "free";
              const tooSmall = members > plan.seats;
              let action: ReactNode;
              if (isCurrent) {
                action = <span className="text-[13px] font-medium text-muted-foreground">{t("currentPlan")}</span>;
              } else if (plan.id === "free") {
                action = sub?.endsAt ? (
                  <span className="text-[12.5px] text-muted-foreground">{t("from", { date: shortDate(sub.endsAt) })}</span>
                ) : (
                  <Button variant="secondary" size="sm" className="h-9 w-full text-[13px]" disabled={!!busy} onClick={() => setAsking({ kind: "cancel" })}>
                    {t("cancel")}
                  </Button>
                );
              } else if (tooSmall) {
                action = <span className="text-[12.5px] leading-snug text-muted-foreground">{t("tooMany")}</span>;
              } else {
                action = (
                  <Button
                    size="sm"
                    variant={sub ? "secondary" : "primary"}
                    className="h-9 w-full text-[13px]"
                    disabled={!!busy || !!waiting}
                    onClick={() => (sub ? setAsking({ kind: "switch", plan }) : buy(plan))}
                  >
                    {busy === plan.id && <Loader2 className="size-4 animate-spin" />}
                    {sub ? t("switch") : t("choose")}
                  </Button>
                );
              }
              return (
                <li
                  key={plan.id}
                  className={cn("flex flex-col rounded-2xl border bg-background p-4", isCurrent ? "border-foreground/40" : "border-border")}
                >
                  <p className="text-[14px] font-semibold text-foreground">{NAMES[plan.id]}</p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-[26px] font-semibold tracking-tight text-foreground">{plan.price ? dollars(plan.price) : "$0"}</span>
                    {plan.price && <span className="text-[12.5px] text-muted-foreground">{t("perMonth")}</span>}
                  </p>
                  <ul className="mt-2 space-y-1 text-[12.5px] text-muted-foreground">
                    <li>{t("upTo", { count: plan.seats })}</li>
                    <li>{t("hoursAMonth", { count: plan.meetingHours })}</li>
                  </ul>
                  <div className="mt-auto pt-4">{action}</div>
                </li>
              );
            })}
          </ul>
          {error && <p className="mt-3 text-[12.5px] text-destructive">{error}</p>}
          <p className="mt-3 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("hoursExplained")}</p>

          {/* The card and what's next, once there is a subscription. */}
          {sub && (
            <section className="mt-8">
              <h3 className="mb-3 text-[13px] font-semibold text-foreground">{t("payment")}</h3>
              <div className="divide-y divide-border rounded-2xl border border-border bg-background">
                <div className="flex items-center gap-3 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <CreditCard className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-foreground">
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
          {(sub || (details && details.history.length > 0)) && (
            <section className="mt-8">
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
                      <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{shortDate(payment.at)}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {payment.plan ? t("planPayment", { plan: NAMES[payment.plan] }) : t("payment")}
                      </span>
                      <PaymentStatus status={payment.status} />
                      <span className="w-20 shrink-0 text-end font-medium tabular-nums text-foreground">{money(payment.amount, payment.currency)}</span>
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

          <p className="mt-6 max-w-lg text-[12px] leading-relaxed text-muted-foreground">{t("fine")}</p>
        </>
      )}

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
      />
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
    </>
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

function Meter({ label, value, note, children }: { label: string; value: string; note?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[13px] tabular-nums text-foreground">{value}</p>
      </div>
      {children}
      {note && <p className="mt-1.5 text-[12px] text-faint">{note}</p>}
    </div>
  );
}

function Bar({ share }: { share: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div
        className={cn("h-full rounded-full", share >= 1 ? "bg-warn" : "bg-foreground")}
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
