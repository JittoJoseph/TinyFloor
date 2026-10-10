"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError, type OfficeBilling, type PlanId } from "@/lib/api";
import { openCheckout, openPortal, waitForPlan } from "@/lib/checkout";

type Paid = Exclude<PlanId, "free">;

/**
 * Everything that changes an office's plan, for Plan and billing and the
 * upgrade dialog alike: buying (Creem's checkout over the page), switching,
 * cancelling and keeping a plan, and Creem's portal for the card and invoices.
 * The plan itself only changes when the API says so; `onChanged` hears it.
 */
export function usePlanChange(officeId: string | undefined, onChanged: (billing?: OfficeBilling) => Promise<void> | void) {
  const t = useTranslations("billing");
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<"now" | "slow" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const explain = (problem: unknown) => {
    if (problem instanceof ApiError && problem.code === "too_many_members") return t("errors.tooManyMembers");
    if (problem instanceof ApiError && problem.code === "has_subscription") return t("errors.hasSubscription");
    if (problem instanceof ApiError && problem.code === "not_payer") return t("errors.notPayer");
    return t("errors.failed");
  };

  const run = async (key: string, action: (office: string) => Promise<void>) => {
    if (!officeId || busy) return false;
    setBusy(key);
    setError(null);
    try {
      await action(officeId);
      return true;
    } catch (problem) {
      if (!(problem instanceof Cancelled)) setError(explain(problem));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const dark = () => document.documentElement.classList.contains("dark");

  return {
    busy,
    waiting,
    error,
    clearError: () => setError(null),
    /** A free (or trial) office buys a plan. Resolves true once it's paid for. */
    buy: (plan: Paid, before?: () => void) =>
      run(plan, async (office) => {
        const { checkoutId, url } = await api.checkout(office, plan);
        before?.();
        const paid = await openCheckout({ url, locale, dark: dark() });
        if (!paid) throw new Cancelled();
        setWaiting("now");
        const landed = await waitForPlan(office, checkoutId, (now) => now === plan);
        setWaiting(landed ? null : "slow");
        await onChanged();
      }),
    /** A paying office moves to another paid plan, charged or credited for the time left. */
    switchTo: (plan: Paid) => run(plan, async (office) => onChanged(await api.changePlan(office, plan))),
    cancel: () => run("cancel", async (office) => onChanged(await api.cancelPlan(office))),
    resume: () => run("resume", async (office) => onChanged(await api.resumePlan(office))),
    portal: (key = "portal") => run(key, (office) => openPortal(office)),
  };
}

/** Closing the checkout without paying: not an error, just nothing to do. */
class Cancelled extends Error {}
