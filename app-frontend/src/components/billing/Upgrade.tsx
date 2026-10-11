"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Loader2 } from "@/components/ui/icons";
import { api, type OfficeBilling, type PlanId } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { PLAN_NAMES, PlanCard, paidPlan } from "./PlanCards";
import { usePlanChange } from "./usePlanChange";

/** What brought them to the plans: the office is full, the hours are (nearly) used, the trial is ending, or just looking. */
export type UpgradeReason = "full" | "hours" | "trial" | "plans";

interface Upgrade {
  /** Opens the plans over the page, for that reason. Null where nothing is on sale. */
  open: ((reason?: UpgradeReason) => void) | null;
}

const Context = createContext<Upgrade>({ open: null });

/**
 * The one way up (docs/23), opened in place wherever a limit is felt: inviting
 * past the seats, the meeting hours, the trial's last days, or the office
 * menu. Pro, and the checkout right there. Members see the same card and who
 * can buy it.
 */
export function useUpgrade(): Upgrade {
  return useContext(Context);
}

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [reason, setReason] = useState<UpgradeReason | null>(null);
  const on = !!catalog?.billing && !!context;
  const open = useCallback((why: UpgradeReason = "plans") => setReason(why), []);
  const value = useMemo<Upgrade>(() => ({ open: on ? open : null }), [on, open]);
  return (
    <Context.Provider value={value}>
      {children}
      {on && <UpgradeDialog reason={reason} onClose={() => setReason(null)} />}
    </Context.Provider>
  );
}

function UpgradeDialog({ reason, onClose }: { reason: UpgradeReason | null; onClose: () => void }) {
  const t = useTranslations("billing.upgrade");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const office = context?.office;
  const [billing, setBilling] = useState<OfficeBilling | null>(null);
  const [done, setDone] = useState(false);
  const officeId = office?.id;
  const admin = office?.role === "admin";

  const change = usePlanChange(officeId, async (next) => {
    if (next) setBilling(next);
    else if (officeId) setBilling(await api.billing(officeId).catch(() => null));
    await context?.refresh();
    setDone(true);
  });

  useEffect(() => {
    if (!reason || !officeId || !admin) return;
    let cancelled = false;
    api.billing(officeId).then(
      (found) => !cancelled && setBilling(found),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [reason, officeId, admin]);

  if (!office || !catalog) return null;
  const current = (office.plan as PlanId) ?? "free";
  const pro = paidPlan(catalog.plans);
  const subscribed = !!billing?.subscription;
  const trialEndsAt = billing?.trial?.endsAt ?? office.trialEndsAt ?? null;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long" });

  const title =
    reason === "full"
      ? t("fullTitle", { office: office.name })
      : reason === "hours"
        ? t("hoursTitle")
        : reason === "trial" && trialEndsAt
          ? t("trialTitle")
          : t("plansTitle");
  const description = !admin
    ? t("membersOnly", { office: office.name })
    : reason === "full"
      ? t("fullBody", { seats: office.seats })
      : reason === "hours"
        ? t("hoursBody")
        : reason === "trial" && trialEndsAt
          ? t("trialBody", { plan: PLAN_NAMES[current], date: date(trialEndsAt) })
          : t("plansBody");

  const close = () => {
    setDone(false);
    change.clearError();
    onClose();
  };

  return (
    <Dialog
      open={!!reason}
      onClose={close}
      title={done ? t("doneTitle", { plan: PLAN_NAMES[current] }) : title}
      description={done ? t("doneBody") : description}
      closeLabel={tc("close")}
      className="max-w-[40rem]"
      footer={
        done ? (
          <Button size="sm" className="h-10 px-5" onClick={close}>
            {tc("close")}
          </Button>
        ) : undefined
      }
    >
      {change.waiting === "now" ? (
        <p className="flex items-center gap-2 py-6 text-[13.5px] text-foreground">
          <Loader2 className="size-4 animate-spin" />
          {tb("settingUp")}
        </p>
      ) : done ? (
        <p className="flex items-center gap-2 py-2 text-[13.5px] text-foreground">
          <Check className="size-4 text-ok" />
          {t("doneLine", { plan: PLAN_NAMES[current] })}
        </p>
      ) : (
        <>
          {pro && !subscribed && (
            // Creem's checkout opens over this dialog, which then waits for the plan to land.
            <PlanCard
              plan={pro}
              trial={!!trialEndsAt && current === pro.id}
              busy={change.busy}
              canChange={admin}
              onChoose={(plan) => plan.id !== "free" && void change.buy(plan.id)}
              className="mb-2"
            />
          )}
          <p className="pb-2 pt-1 text-[12px] leading-relaxed text-faint">{tb("fine")}</p>
        </>
      )}
      {change.error && <p className="pb-2 text-[12.5px] text-destructive">{change.error}</p>}
    </Dialog>
  );
}
