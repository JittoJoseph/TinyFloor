"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AlertCircle, Check, CreditCard, Download, Info, Loader2 } from "@/components/ui/icons";
import { api, type BillingDetails, type OfficeBilling, type Payment, type PlanId } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { FOUNDING, foundingOpen } from "@/lib/founding";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { PLAN_NAMES, PlanIncludes, ProPrice, paidPlan } from "@/components/billing/PlanCards";
import { usePlanChange } from "@/components/billing/usePlanChange";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";
import { Group } from "./SettingsView";
import { SUPPORT_EMAIL } from "@/lib/site";

const DAY = 24 * 60 * 60 * 1000;

/**
 * An office's plan and billing (docs/pricing.md), in the order it's looked
 * for: anything that needs doing, as one notice; the plan the office is on,
 * with the trial's progress or the next charge; then, for an office without a
 * subscription, Free and Pro side by side, where both are chosen (keeping Pro,
 * or continuing on Free after the trial); then the card and every payment.
 * Buying opens Creem's checkout over the page; the card and the invoices are
 * in Creem's portal, for whoever pays; cancelling asks first. The plan itself
 * only changes when Creem says so.
 */
export function PlanSection() {
  const t = useTranslations("billing");
  const tp = useTranslations("billing.page");
  const tc = useTranslations("common");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [asking, setAsking] = useState(false);
  const [staying, setStaying] = useState(false);
  // Read once: the trial's days don't need to tick while the page is open.
  const [now] = useState(() => Date.now());

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
      setAsking(false);
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
  const plans = catalog?.plans ?? [];
  const pro = paidPlan(plans);
  const freeSeats = plans.find((plan) => plan.price === null)?.seats ?? 3;
  const members = billing?.members ?? office.members;
  const sub = billing?.subscription ?? null;
  const trial = billing?.trial ?? null;
  const planId = (office.plan as PlanId) ?? "free";
  const manage = on && admin;
  const busy = change.busy;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long", year: "numeric" });
  const shortDate = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "short" });
  const money = (amount: number, currency: string) => format.number(amount / 100, { style: "currency", currency });

  // After the trial and before a choice: the office is on Free, and decides below.
  const ended = manage && planId === "free" && !sub && !!billing?.trialEndedAt;
  const fits = members <= freeSeats;
  const grace = billing?.graceEndsAt ?? office.graceEndsAt ?? null;
  const hoursUsed = manage && billing && billing.usage.seconds / 3600 >= billing.meetingHours;

  const stayFree = async () => {
    setStaying(true);
    try {
      setBilling(await api.stayOnFree(office.id));
      await context.refresh();
    } finally {
      setStaying(false);
    }
  };

  // The one thing that needs doing, if anything does.
  const notice = ((): { tone: "brand" | "alert"; title: string; body: string; action?: ReactNode } | null => {
    if (!manage) return null;
    if (sub?.status === "past_due") {
      return {
        tone: "alert",
        title: tp("notice.pastDueTitle"),
        body: tp("notice.pastDueBody"),
        action: (
          <NoticeButton busy={busy === "card"} disabled={!!busy} onClick={() => change.portal("card")}>
            {tp("updateCard")}
          </NoticeButton>
        ),
      };
    }
    if (sub?.endsAt) {
      return {
        tone: "brand",
        title: tp("notice.endingTitle", { date: date(sub.endsAt) }),
        body: tp("notice.endingBody", { free: freeSeats }),
        action: (
          <NoticeButton busy={busy === "resume"} disabled={!!busy} onClick={change.resume}>
            {tp("keep")}
          </NoticeButton>
        ),
      };
    }
    if (ended && fits) return { tone: "brand", title: tp("notice.endedTitle"), body: tp("notice.endedBody", { free: freeSeats }) };
    if (ended && grace) {
      return { tone: "brand", title: tp("notice.endedTitle"), body: tp("notice.graceBody", { date: date(grace), free: freeSeats }) };
    }
    if (planId === "free" && !sub && members > freeSeats) {
      return { tone: "brand", title: tp("notice.overTitle", { free: freeSeats }), body: tp("notice.overBody", { members }) };
    }
    if (hoursUsed && billing) return { tone: "brand", title: tp("notice.hoursTitle"), body: tp("notice.hoursBody", { date: shortDate(billing.usage.resetsAt) }) };
    return null;
  })();

  // The plan card's second fact: when the trial ends, the next charge, or the price.
  const fact = ((): { label: string; value: string } => {
    if (trial) return { label: tp("trialEnds"), value: date(trial.endsAt) };
    if (sub?.endsAt) return { label: tp("ends"), value: date(sub.endsAt) };
    if (sub && details?.nextCharge) {
      return {
        label: tp("nextCharge"),
        value: tp("chargeOn", { amount: money(details.nextCharge.amount, details.nextCharge.currency), date: shortDate(details.nextCharge.at) }),
      };
    }
    if (sub?.renewsAt) return { label: tp("renews"), value: date(sub.renewsAt) };
    if (sub && pro?.price) return { label: tp("price"), value: tp("perMonth", { price: dollars(pro.price) }) };
    // On Free, what the floor holds: everyone while the grace runs, then the plan's seats.
    return { label: tp("floor"), value: grace ? tp("floorEveryone", { date: shortDate(grace) }) : tp("floorAtOnce", { seats: office.seats }) };
  })();

  const trialDays = catalog?.trialDays || 14;
  const subline = trial
    ? tp("trialLine", { days: trialDays })
    : sub && pro?.price
      ? tp("proLine", { price: dollars(pro.price) })
      : tp("freeLine", { seats: freeSeats });
  const daysLeft = trial ? Math.max(0, Math.ceil((trial.endsAt - now) / DAY)) : 0;

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} />}

      {/* The plan the office is on. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="p-5">
          <p className="text-[12.5px] font-medium text-muted-foreground">{tp("yourPlan")}</p>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
            {PLAN_NAMES[planId] ?? office.plan}
            {trial && <Pill tone="brand">{tp("pillTrial")}</Pill>}
            {sub?.status === "past_due" && <Pill tone="alert">{tp("pillPastDue")}</Pill>}
            {sub?.endsAt && <Pill>{tp("pillEnding")}</Pill>}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{subline}</p>
          {!on && <PlansSoon className="mt-2" />}

          {trial && (
            // The trial as days, so how long is left reads at a glance.
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, Math.max(4, ((trialDays - daysLeft) / trialDays) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-[12.5px] font-medium text-foreground">{tp("daysLeft", { count: daysLeft })}</p>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 divide-x divide-border border-t border-border rtl:divide-x-reverse">
          <Fact label={tp("members")} value={planId === "free" && members <= office.seats ? tp("membersOf", { members, seats: office.seats }) : String(members)}>
            {planId === "free" && <SeatBar used={members} seats={office.seats} />}
          </Fact>
          <Fact label={fact.label} value={fact.value} />
        </dl>

        {manage && sub && (
          <div className="flex items-center gap-3 border-t border-border px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <CreditCard className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-foreground">{tp("paymentMethod")}</p>
              <p className="truncate text-[12.5px] text-muted-foreground">{tp("card")}</p>
            </div>
            {sub.status !== "canceled" && (
              <SmallButton busy={busy === "card"} disabled={!!busy} onClick={() => change.portal("card")}>
                {tp("update")}
              </SmallButton>
            )}
          </div>
        )}

        {change.waiting && (
          <p className="flex items-center gap-2 border-t border-border px-5 py-3.5 text-[13px] text-foreground">
            {change.waiting === "now" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-ok" />}
            {change.waiting === "now" ? t("settingUp") : t("settingUpSlow")}
          </p>
        )}
      </section>

      {/* Free and Pro side by side, for an office without a subscription. */}
      {on && pro?.price && !sub && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="text-[13px] font-semibold text-foreground">{tp("plans")}</h3>
            <p className="text-[12px] text-faint">{tp("plansNote")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Pro first on a phone: it's the one with something to decide. */}
            <PlanCard
              className="sm:order-2"
              highlight
              name={PLAN_NAMES.pro}
              pill={trial ? tp("pillYourTrial") : foundingOpen() ? tp("pillFounding") : undefined}
              price={dollars(pro.price)}
              per={tp("proPer")}
              footer={
                manage && (
                  <>
                    <button
                      type="button"
                      disabled={!!busy || !!change.waiting}
                      onClick={() => change.buy("pro")}
                      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.99] disabled:cursor-default disabled:opacity-50"
                    >
                      {busy === "pro" && <Loader2 className="size-4 animate-spin" />}
                      {trial || ended ? tp("keep") : tp("upgrade")}
                    </button>
                    <p className="mt-2 text-center text-[11.5px] text-muted-foreground">{t("offer.assurance")}</p>
                  </>
                )
              }
            >
              <ProPrice price={pro.price} members={members} anchor={false} />
              <PlanIncludes plans={plans} className="mt-4" />
            </PlanCard>
            <PlanCard
              className="sm:order-1"
              name={PLAN_NAMES.free}
              price={dollars(0)}
              per={tp("freePer")}
              footer={
                ended && fits ? (
                  <button
                    type="button"
                    disabled={staying}
                    onClick={stayFree}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong px-4 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {staying && <Loader2 className="size-4 animate-spin" />}
                    {tp("stayFree")}
                  </button>
                ) : trial ? (
                  <p className="text-[12px] leading-relaxed text-muted-foreground">{tp("afterTrial")}</p>
                ) : (
                  <p className="flex h-11 items-center justify-center rounded-full bg-muted text-[13.5px] font-medium text-muted-foreground">
                    {tp("pillCurrent")}
                  </p>
                )
              }
            >
              <ul className="space-y-2.5 text-[13.5px] text-foreground">
                {[tp("freeSeats", { seats: freeSeats }), tp("freeEverything"), tp("freeNoCard")].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </PlanCard>
          </div>
          {foundingOpen() && (
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              {t("offer.founding", {
                price: dollars(FOUNDING.laterPrice * 100),
                date: format.dateTime(new Date(FOUNDING.until), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
              })}
            </p>
          )}
          {change.error && !asking && <p className="mt-3 text-[12.5px] text-destructive">{change.error}</p>}
        </section>
      )}

      {/* On Pro: what it gives, as a reminder of what's paid for. */}
      {sub && planId === "pro" && (
        <Group title={tp("included")}>
          <PlanIncludes plans={plans} className="p-4" />
        </Group>
      )}

      {/* Every payment; the invoices are in Creem's portal. */}
      {manage && (sub || (details && details.history.length > 0)) && (
        <Group title={tp("invoices")}>
          {details === null ? (
            <div className="h-16 animate-pulse" />
          ) : details.history.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">{tp("noInvoices")}</p>
          ) : (
            details.history.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {payment.plan ? tp("invoicePlan", { plan: PLAN_NAMES[payment.plan] }) : tp("invoice")}
                  </p>
                  <p className="text-[12px] tabular-nums text-muted-foreground">{date(payment.at)}</p>
                </div>
                <PaymentStatus status={payment.status} />
                <span className="shrink-0 text-end font-medium tabular-nums text-foreground">{money(payment.amount, payment.currency)}</span>
                <span className="flex w-8 shrink-0 justify-end">
                  {payment.invoice && (
                    <button
                      type="button"
                      aria-label={tp("download")}
                      title={tp("download")}
                      disabled={!!busy}
                      onClick={() => change.portal(`invoice:${payment.id}`)}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {busy === `invoice:${payment.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </button>
                  )}
                </span>
              </div>
            ))
          )}
        </Group>
      )}

      {on && !admin && <p className="text-[12.5px] text-muted-foreground">{t("adminsOnly")}</p>}

      {/* The rest, quietly: the small print, and cancelling. */}
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
              onClick={() => setAsking(true)}
              className="h-8 shrink-0 cursor-pointer self-start rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {/*
        Cancelling, said plainly: what the team would lose, and keeping the
        plan as the easy choice. Cancelling stays one click away; nothing is
        hidden or made hard.
      */}
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
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
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="h-10 cursor-pointer rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85"
            >
              {tp("keep")}
            </button>
          </>
        }
      >
        <ul className="space-y-2.5 pb-2 text-[13px] leading-relaxed text-foreground">
          <li className="flex items-start gap-2.5">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/40" />
            {members > freeSeats ? t("loseSeatsOver", { members, free: freeSeats }) : t("loseSeats", { seats: office.seats, free: freeSeats })}
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

/** What needs doing, above everything else: what happened, and the way to answer it. */
function Notice({ tone, title, body, action }: { tone: "brand" | "alert"; title: string; body: string; action?: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl border p-4",
        tone === "alert" ? "border-destructive/25 bg-destructive/[0.06]" : "border-brand/25 bg-brand/[0.06]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center self-start rounded-full",
          tone === "alert" ? "bg-destructive/12 text-destructive" : "bg-brand/12 text-brand",
        )}
      >
        {tone === "alert" ? <AlertCircle className="size-4" /> : <Info className="size-4" />}
      </span>
      <div className="min-w-[12rem] flex-1">
        <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {action && <div className="ms-11 shrink-0 sm:ms-0">{action}</div>}
    </div>
  );
}

function NoticeButton({ busy, disabled, onClick, children }: { busy: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85 disabled:opacity-50"
    >
      {busy && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function SmallButton({ busy, disabled, onClick, children }: { busy: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
    >
      {busy && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/** One fact about the plan, in the row under it. */
function Fact({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <dt className="text-[12px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-[14px] font-semibold tabular-nums text-foreground">{value}</dd>
      {children}
    </div>
  );
}

/** A plan to choose: its name and price, what it gives, and its button at the foot. */
function PlanCard({
  name,
  pill,
  price,
  per,
  highlight,
  footer,
  className,
  children,
}: {
  name: string;
  pill?: string;
  price: string;
  per: string;
  highlight?: boolean;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-background p-5",
        highlight ? "border-foreground/80 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.2)]" : "border-border",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
        {name}
        {pill && <Pill tone={highlight ? "brand" : undefined}>{pill}</Pill>}
      </p>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[30px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-foreground">{price}</span>
        <span className="text-[12.5px] text-muted-foreground">{per}</span>
      </p>
      <div className="mt-3 flex-1">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}

/** A word beside a plan's name: on trial, its card failed, ending, current. */
function Pill({ tone, children }: { tone?: "alert" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-normal",
        tone === "alert" ? "bg-destructive/10 text-destructive" : tone === "brand" ? "bg-brand/12 text-brand" : "bg-muted text-muted-foreground",
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

/** One segment a seat while they're countable, a bar once they aren't. */
function SeatBar({ used, seats }: { used: number; seats: number }) {
  return seats <= 25 ? (
    <div className="mt-2.5 flex gap-1" aria-hidden>
      {Array.from({ length: seats }, (_, index) => (
        <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < used ? "bg-foreground" : "bg-muted")} />
      ))}
    </div>
  ) : (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (used / seats) * 100)}%` }} />
    </div>
  );
}
