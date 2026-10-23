"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AlertCircle, Check, CreditCard, Download, Info, Loader2 } from "@/components/ui/icons";
import { api, type BillingDetails, type OfficeBilling, type Payment } from "@/lib/api";
import { dollars, usePlans } from "@/lib/billing";
import { FOUNDING, foundingOpen } from "@/lib/founding";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { PLAN_NAMES, PlanIncludes, paidPlan } from "@/components/billing/PlanCards";
import { usePlanChange } from "@/components/billing/usePlanChange";
import { cn } from "@/lib/utils";
import { Bone } from "./HomeSkeletons";
import { useOfficeMaybe } from "./OfficeShell";
import { Group } from "./SettingsView";
import { SUPPORT_EMAIL } from "@/lib/site";

const DAY = 24 * 60 * 60 * 1000;
type Asking = "cancel" | "downgrade" | null;

/**
 * An office's plan and billing (docs/pricing.md). A trial, and a trial that
 * has ended with nothing chosen since, read as being on Pro with billing to
 * add: Pro's button updates billing, Free's downgrades. Once Free is chosen
 * it's the plan, and Pro is an upgrade. A subscribed office sees its plan,
 * card and invoices instead. Words are kept to what's needed to decide;
 * anything that needs doing (a failed card, a plan ending) comes first.
 */
export function PlanSection() {
  const t = useTranslations("billing");
  const tp = useTranslations("billing.page");
  const tc = useTranslations("common");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  // Whether the office's billing has answered (or failed): until then the page shows its shape, not a guess.
  const [billingRead, setBillingRead] = useState(false);
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const [downgrading, setDowngrading] = useState(false);
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
      setAsking(null);
      await Promise.all([context?.refresh(), reloadDetails()]);
    },
    "billing",
  );

  useEffect(() => {
    if (!officeId || !admin || !on) return;
    let cancelled = false;
    api
      .billing(officeId)
      .then(
        (found) => !cancelled && setBilling(found),
        () => {},
      )
      .finally(() => !cancelled && setBillingRead(true));
    api.billingDetails(officeId).then(
      (found) => !cancelled && setDetails(found),
      () => !cancelled && setDetails({ nextCharge: null, card: null, history: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [officeId, admin, on]);

  if (!context || !office) return null;
  // The plan list, and for its admins the office's billing: drawn once both are in, so it never shows one plan then another.
  if (!catalog || (admin && catalog.billing && !billingRead)) return <PlanSkeleton />;
  const plans = catalog.plans;
  const pro = paidPlan(plans);
  const freeSeats = plans.find((plan) => plan.price === null)?.seats ?? 3;
  const members = billing?.members ?? office.members;
  const sub = billing?.subscription ?? null;
  // Members don't read billing: the office says whether a trial runs or has ended.
  const trial = billing ? billing.trial : office.trialEndsAt ? { plan: "pro" as const, endsAt: office.trialEndsAt } : null;
  const trialEndedAt = billing ? billing.trialEndedAt : (office.trialEndedAt ?? null);
  const manage = on && admin;
  const busy = change.busy;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long", year: "numeric" });
  const shortDate = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "short" });
  const money = (amount: number, currency: string) => format.number(amount / 100, { style: "currency", currency });

  // A trial that ended with nothing chosen: still Pro to them, with billing to add.
  const unpaid = !sub && office.plan === "free" && !!trialEndedAt;
  const onPro = !!sub || !!trial || unpaid || office.plan !== "free";
  const grace = billing?.graceEndsAt ?? office.graceEndsAt ?? null;
  const trialDays = catalog?.trialDays || 14;
  const daysLeft = trial ? Math.max(0, Math.ceil((trial.endsAt - now) / DAY)) : 0;

  const downgrade = async () => {
    setDowngrading(true);
    try {
      setBilling(await api.stayOnFree(office.id));
      setAsking(null);
      await context.refresh();
    } finally {
      setDowngrading(false);
    }
  };

  // Only what needs doing gets a notice.
  const notice = ((): { tone: "brand" | "alert"; title: string; body: string; action: ReactNode } | null => {
    if (!manage) return null;
    if (sub?.status === "past_due") {
      return {
        tone: "alert",
        title: tp("notice.pastDueTitle"),
        body: tp("notice.pastDueBody"),
        action: (
          <SolidButton small busy={busy === "card"} disabled={!!busy} onClick={() => change.portal("card")}>
            {tp("updateCard")}
          </SolidButton>
        ),
      };
    }
    if (sub?.endsAt) {
      return {
        tone: "brand",
        title: tp("notice.endingTitle", { date: date(sub.endsAt) }),
        body: tp("notice.endingBody", { free: freeSeats }),
        action: (
          <SolidButton small busy={busy === "resume"} disabled={!!busy} onClick={change.resume}>
            {tp("keep")}
          </SolidButton>
        ),
      };
    }
    return null;
  })();

  // One line under the plan's name: where it stands.
  const status = trial
    ? tp("daysLeft", { count: daysLeft })
    : unpaid && trialEndedAt
      ? tp("trialEnded", { date: date(trialEndedAt) })
      : onPro && pro?.price
        ? tp("priceLine", { price: dollars(pro.price) })
        : tp("freeSeats", { seats: freeSeats });

  // The plan's facts, one a row: who's in it, then the date that matters or what the floor holds.
  const facts: { label: string; value: string }[] = [
    { label: tp("members"), value: onPro || members > office.seats ? String(members) : tp("membersOf", { members, seats: office.seats }) },
  ];
  if (trial) facts.push({ label: tp("trialEnds"), value: date(trial.endsAt) });
  else if (sub?.endsAt) facts.push({ label: tp("ends"), value: date(sub.endsAt) });
  else if (sub && details?.nextCharge) {
    facts.push({
      label: tp("nextCharge"),
      value: tp("chargeOn", { amount: money(details.nextCharge.amount, details.nextCharge.currency), date: shortDate(details.nextCharge.at) }),
    });
  } else if (sub?.renewsAt) facts.push({ label: tp("renews"), value: date(sub.renewsAt) });
  else if (!sub && (unpaid || office.plan === "free")) facts.push({ label: tp("floor"), value: grace ? tp("floorEveryone", { date: shortDate(grace) }) : tp("floorAtOnce", { seats: office.seats }) });

  return (
    <div className="space-y-6">
      {notice && <Notice {...notice} />}

      {/* The plan the office is on: its name and where it stands, then its facts as rows. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="p-5">
          <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[20px] font-semibold leading-tight tracking-tight text-foreground">
            {onPro ? PLAN_NAMES.pro : PLAN_NAMES.free}
            {trial && <Pill tone="brand">{tp("pillTrial")}</Pill>}
            {unpaid && <Pill tone="brand">{tp("pillBilling")}</Pill>}
            {sub?.status === "past_due" && <Pill tone="alert">{tp("pillPastDue")}</Pill>}
            {sub?.endsAt && <Pill>{tp("pillEnding")}</Pill>}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{status}</p>
          {!on && <PlansSoon className="mt-2" />}
        </div>
        {trial && (
          // The trial as days, so how long is left reads at a glance.
          <div className="-mt-1 px-5 pb-5" aria-hidden>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(4, ((trialDays - daysLeft) / trialDays) * 100))}%` }}
              />
            </div>
          </div>
        )}

        <dl className="divide-y divide-border border-t border-border">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-4 px-5 py-3.5 text-[13.5px]">
              <dt className="shrink-0 text-muted-foreground">{fact.label}</dt>
              <dd className="min-w-0 text-end font-medium tabular-nums text-foreground">{fact.value}</dd>
            </div>
          ))}
          {manage && sub && (
            <div className="flex items-center justify-between gap-4 px-5 py-3">
              <dt className="flex min-w-0 items-center gap-2 text-[13.5px] text-muted-foreground">
                <CreditCard className="size-4 shrink-0" />
                <span className="truncate">{tp("card")}</span>
              </dt>
              <dd>
                {sub.status !== "canceled" && (
                  <QuietButton busy={busy === "card"} disabled={!!busy} onClick={() => change.portal("card")}>
                    {tp("update")}
                  </QuietButton>
                )}
              </dd>
            </div>
          )}
        </dl>

        {change.waiting && (
          <p className="flex items-center gap-2 border-t border-border px-5 py-3.5 text-[13px] text-foreground">
            {change.waiting === "now" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-ok" />}
            {change.waiting === "now" ? t("settingUp") : t("settingUpSlow")}
          </p>
        )}
      </section>

      {/* Pro and Free side by side, for an office that hasn't subscribed. */}
      {on && pro?.price && !sub && (
        <section>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Pro first on a phone: it's the one to act on. */}
            <PlanCard
              className="sm:order-2"
              highlight
              name={PLAN_NAMES.pro}
              pill={onPro ? tp("pillCurrent") : foundingOpen() ? tp("pillFounding") : undefined}
              price={dollars(pro.price)}
              per={tp("proPer")}
              footer={
                manage && (
                  <SolidButton busy={busy === "pro"} disabled={!!busy || !!change.waiting} onClick={() => change.buy("pro")}>
                    {onPro ? tp("updateBilling") : tp("upgrade")}
                  </SolidButton>
                )
              }
            >
              <PlanIncludes plans={plans} />
            </PlanCard>
            <PlanCard
              className="sm:order-1"
              name={PLAN_NAMES.free}
              pill={!onPro ? tp("pillCurrent") : undefined}
              price={dollars(0)}
              per={tp("freePer")}
              footer={
                manage && onPro ? (
                  <button
                    type="button"
                    onClick={() => setAsking("downgrade")}
                    className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-border-strong px-4 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {tp("downgrade")}
                  </button>
                ) : null
              }
            >
              <ul className="space-y-2.5 text-[13.5px] text-foreground">
                {[tp("freeSeats", { seats: freeSeats }), tp("freeEverything")].map((item) => (
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
            <p className="mt-3 text-[12px] text-muted-foreground">
              {tp("founding", { date: format.dateTime(new Date(FOUNDING.until), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) })}
            </p>
          )}
          {change.error && !asking && <p className="mt-3 text-[12.5px] text-destructive">{change.error}</p>}
        </section>
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

      {/* The small print (cancelling any time, the refund), and cancelling itself, quietly. */}
      {manage && (
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t("offer.assurance")} {tp("fine")}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground underline-offset-2 hover:underline" dir="ltr">
              {SUPPORT_EMAIL}
            </a>
          </p>
          {sub && !sub.endsAt && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setAsking("cancel")}
              className="h-8 shrink-0 cursor-pointer self-start rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive sm:self-auto"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      )}

      {/*
        Leaving Pro, by cancelling or downgrading, is asked once, plainly: what
        changes for the team, with keeping Pro as the easy answer. Leaving
        stays one click away; nothing is hidden or made hard.
      */}
      <Dialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={asking === "downgrade" ? tp("downgradeTitle") : t("cancelTitle")}
        description={asking === "cancel" && sub?.renewsAt ? t("cancelWhen", { date: date(sub.renewsAt) }) : undefined}
        closeLabel={tc("close")}
        footer={
          <>
            <button
              type="button"
              disabled={!!busy || downgrading}
              onClick={asking === "downgrade" ? downgrade : change.cancel}
              className="me-auto inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              {(busy === "cancel" || downgrading) && <Loader2 className="size-4 animate-spin" />}
              {asking === "downgrade" ? tp("downgradeConfirm") : t("cancelAnyway")}
            </button>
            <button
              type="button"
              onClick={() => setAsking(null)}
              className="h-10 cursor-pointer rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85"
            >
              {tp("keep")}
            </button>
          </>
        }
      >
        {asking === "downgrade" ? (
          <p className="pb-2 text-[13px] leading-relaxed text-foreground">
            {members > freeSeats ? tp("downgradeOver", { free: freeSeats, members }) : tp("downgradeBody", { free: freeSeats })}
          </p>
        ) : (
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
        )}
        {change.error && <p className="mt-2 text-[12.5px] text-destructive">{change.error}</p>}
      </Dialog>
    </div>
  );
}

/** What needs doing, above everything else: what happened, and the way to answer it. */
function Notice({ tone, title, body, action }: { tone: "brand" | "alert"; title: string; body: string; action: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border p-4",
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
      <div className="ms-11 shrink-0 sm:ms-0">{action}</div>
    </div>
  );
}

function SolidButton({ small, busy, disabled, onClick, children }: { small?: boolean; busy: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground font-medium text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.99] disabled:cursor-default disabled:opacity-50",
        small ? "h-9 px-4 text-[13px]" : "h-11 w-full px-4 text-[13.5px]",
      )}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function QuietButton({ busy, disabled, onClick, children }: { busy: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
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
      <div className="mt-4 flex-1">{children}</div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}

/** The page's shape while the plan is read: the plan with its facts, then the two plans side by side. */
function PlanSkeleton() {
  const card = "rounded-2xl border border-border bg-background";
  return (
    <div className="space-y-6" aria-busy>
      <div className={card}>
        <div className="p-5">
          <Bone className="h-5 w-20" />
          <Bone className="mt-2.5 h-3 w-28" />
        </div>
        <div className="divide-y divide-border border-t border-border">
          {[0, 1].map((row) => (
            <div key={row} className="flex h-[49px] items-center justify-between px-5">
              <Bone className="h-3 w-20" />
              <Bone className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((one) => (
          <div key={one} className={cn(card, "h-[16.5rem] p-5")}>
            <Bone className="h-3.5 w-12" />
            <Bone className="mt-3 h-7 w-16" />
            <Bone className="mt-6 h-3 w-3/4" />
            <Bone className="mt-3 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A word beside a plan's name: on trial, billing to add, its card failed, ending, current. */
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
