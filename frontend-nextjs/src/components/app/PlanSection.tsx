"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, ExternalLink, Loader2 } from "lucide-react";
import { api, ApiError, type BillingInterval, type OfficeBilling, type Plan, type PlanId } from "@/lib/api";
import { dollars, openCheckout, usePlans, waitForPlan } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";

/** Plan names stay in English everywhere, like on the pricing page. */
const NAMES: Record<PlanId, string> = { free: "Free", team: "Team", business: "Business" };

type Asking = { kind: "switch"; plan: Plan } | { kind: "cancel" } | null;

/**
 * An office's plan: what it's on, the others side by side, and the way to each
 * (docs/13). Buying opens Paddle's checkout over the page; switching and
 * cancelling ask first. The plan itself only changes when Paddle says so.
 */
export function PlanSection() {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  const [cycle, setCycle] = useState<BillingInterval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<"now" | "slow" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<Asking>(null);

  const office = context?.office;
  const admin = office?.role === "admin";
  const on = !!catalog?.billing;

  const officeId = office?.id;
  const reload = useCallback(async () => {
    if (!officeId) return;
    const found = await api.billing(officeId).catch(() => null);
    if (found) setBilling(found);
  }, [officeId]);

  useEffect(() => {
    if (!officeId || !admin || !on) return;
    let cancelled = false;
    api.billing(officeId).then(
      (found) => {
        if (cancelled) return;
        setBilling(found);
        if (found.subscription) setCycle(found.subscription.interval);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [officeId, admin, on]);

  if (!context || !office) return null;
  const { refresh } = context;
  const members = billing?.members ?? office.members;
  const sub = billing?.subscription ?? null;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long", year: "numeric" });

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

  const buy = (plan: Plan) =>
    run(plan.id, async () => {
      const { transactionId, email } = await api.checkout(office.id, plan.id, cycle);
      const paid = await openCheckout({ transactionId, email, locale, dark: document.documentElement.classList.contains("dark") });
      if (!paid) return;
      setWaiting("now");
      const landed = await waitForPlan(office.id, transactionId, (current) => current === plan.id);
      setWaiting(landed ? null : "slow");
      await Promise.all([refresh(), reload()]);
    });

  const switchTo = (plan: Plan) =>
    run(plan.id, async () => {
      setBilling(await api.changePlan(office.id, plan.id, cycle));
      setAsking(null);
      await refresh();
    });

  const cancel = () =>
    run("cancel", async () => {
      setBilling(await api.cancelPlan(office.id));
      setAsking(null);
    });

  const resume = () =>
    run("resume", async () => {
      setBilling(await api.resumePlan(office.id));
    });

  const portal = () =>
    run("portal", async () => {
      const { url } = await api.billingPortal(office.id);
      window.open(url, "_blank", "noopener");
    });

  const status = () => {
    if (!sub) return t("freeNote", { seats: office.seats });
    if (sub.status === "past_due") return null;
    if (sub.endsAt) return t("ends", { date: date(sub.endsAt) });
    if (sub.renewsAt) {
      const price = catalog?.plans.find((plan) => plan.id === sub.plan)?.prices?.[sub.interval];
      return t("renews", { date: date(sub.renewsAt), price: price ? dollars(price) : "", per: t(sub.interval === "year" ? "perYear" : "perMonth") });
    }
    return null;
  };

  return (
    <>
      {/* What the office is on now. */}
      <section className="mb-8 rounded-2xl border border-border bg-background p-5">
        <p className="text-[12.5px] font-medium text-muted-foreground">{t("current")}</p>
        <p className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">{NAMES[(office.plan as PlanId) ?? "free"] ?? office.plan}</p>
        <SeatBar used={members} seats={office.seats} />
        <p className="mt-2 text-[13px] text-muted-foreground">{t("members", { used: members, seats: office.seats })}</p>
        {on && admin && status() && <p className="mt-1 text-[13px] text-muted-foreground">{status()}</p>}
        {!on && <PlansSoon className="mt-2" />}

        {on && admin && sub?.status === "past_due" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-warn/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <p className="flex-1 text-[13px] leading-relaxed text-foreground">{t("pastDue")}</p>
            <Button size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-[12.5px]" disabled={!!busy} onClick={portal}>
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-foreground">{t("plans")}</h3>
            <div role="radiogroup" aria-label={t("billedEvery")} className="flex rounded-full bg-muted p-1">
              {(["month", "year"] as const).map((one) => (
                <button
                  key={one}
                  type="button"
                  role="radio"
                  aria-checked={cycle === one}
                  onClick={() => setCycle(one)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
                    cycle === one ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(one === "month" ? "monthly" : "yearly")}
                  {one === "year" && <span className="text-ok">{t("twoFree")}</span>}
                </button>
              ))}
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            {catalog.plans.map((plan) => {
              const current = sub ? sub.plan === plan.id && sub.interval === cycle : plan.id === "free";
              const onThisPlan = sub ? sub.plan === plan.id : plan.id === "free";
              const tooSmall = members > plan.seats;
              let action: React.ReactNode;
              if (current) {
                action = <span className="text-[13px] font-medium text-muted-foreground">{t("currentPlan")}</span>;
              } else if (plan.id === "free") {
                action = sub?.endsAt ? (
                  <span className="text-[12.5px] text-muted-foreground">{t("ends", { date: date(sub.endsAt) })}</span>
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
                    {sub ? (onThisPlan ? t(cycle === "year" ? "toYearly" : "toMonthly") : t("switch")) : t("choose")}
                  </Button>
                );
              }
              return (
                <li
                  key={plan.id}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4",
                    current ? "border-foreground/40 bg-background" : "border-border bg-background",
                  )}
                >
                  <p className="text-[14px] font-semibold text-foreground">{NAMES[plan.id]}</p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="text-[26px] font-semibold tracking-tight text-foreground">{plan.prices ? dollars(plan.prices[cycle]) : "$0"}</span>
                    {plan.prices && <span className="text-[12.5px] text-muted-foreground">{t(cycle === "year" ? "perYear" : "perMonth")}</span>}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{t("upTo", { count: plan.seats })}</p>
                  <div className="mt-auto pt-4">{action}</div>
                </li>
              );
            })}
          </ul>

          {error && <p className="mt-3 text-[12.5px] text-destructive">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground">{t("fine")}</p>
            {sub && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-3 text-[13px]" disabled={!!busy} onClick={portal}>
                {t("invoices")}
                <ExternalLink className="size-3.5" />
              </Button>
            )}
          </div>
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

/** One segment a seat while they're countable, a bar once they aren't. */
function SeatBar({ used, seats }: { used: number; seats: number }) {
  return seats <= 25 ? (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: seats }, (_, index) => (
        <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < used ? "bg-foreground" : "bg-muted")} />
      ))}
    </div>
  ) : (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (used / seats) * 100)}%` }} />
    </div>
  );
}
