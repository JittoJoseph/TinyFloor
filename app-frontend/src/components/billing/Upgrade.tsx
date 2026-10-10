"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Loader2 } from "@/components/ui/icons";
import { api, type OfficeBilling, type Plan, type PlanId } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { PLAN_NAMES, PlanCards, plansOnOffer, type PlanMove } from "./PlanCards";
import { usePlanChange } from "./usePlanChange";

/** What brought them to the plans: the office is full, the hours are (nearly) used, the trial is ending, or just looking. */
export type UpgradeReason = "full" | "hours" | "trial" | "plans";

interface Upgrade {
  /** Opens the plans over the page, for that reason. Null where nothing is on sale. */
  open: ((reason?: UpgradeReason) => void) | null;
}

const Context = createContext<Upgrade>({ open: null });

/**
 * The one way up (docs/22), opened in place wherever a limit is felt: inviting
 * past the seats, the meeting hours, the trial's last days, or the plan page.
 * Every plan side by side, the one that answers the reason marked, and the
 * checkout right there. Members see the same plans and who can change them.
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
  const [asking, setAsking] = useState<Plan | null>(null);
  const [done, setDone] = useState(false);
  const officeId = office?.id;
  const admin = office?.role === "admin";

  const change = usePlanChange(officeId, async (next) => {
    if (next) setBilling(next);
    else if (officeId) setBilling(await api.billing(officeId).catch(() => null));
    await context?.refresh();
    setAsking(null);
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
  const plans = catalog.plans;
  const current = (office.plan as PlanId) ?? "free";
  const members = billing?.members ?? office.members;
  const subscribed = !!billing?.subscription;
  const trialEndsAt = billing?.trial?.endsAt ?? office.trialEndsAt ?? null;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long" });
  const offer = plansOnOffer(plans, subscribed ? current : null);

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
    setAsking(null);
    setDone(false);
    change.clearError();
    onClose();
  };

  const choose = (plan: Plan, move: PlanMove) => {
    if (plan.id === "free") return; // Cancelling lives on Plan and billing, where it's explained.
    // Creem's checkout opens over this dialog, which then waits for the plan to land.
    if (move === "choose") void change.buy(plan.id);
    else setAsking(plan);
  };

  return (
    <Dialog
      open={!!reason}
      onClose={close}
      title={done ? t("doneTitle", { plan: PLAN_NAMES[current] }) : title}
      description={done ? t("doneBody") : description}
      closeLabel={tc("close")}
      className="max-w-[46rem]"
      footer={
        asking ? (
          <>
            <Button variant="ghost" size="sm" className="h-10 px-4" onClick={() => setAsking(null)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" className="h-10 px-5" disabled={!!change.busy} onClick={() => asking.id !== "free" && change.switchTo(asking.id)}>
              {change.busy && <Loader2 className="size-4 animate-spin" />}
              {tb("switchTitle", { plan: PLAN_NAMES[asking.id] })}
            </Button>
          </>
        ) : done ? (
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
      ) : asking ? (
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">{tb("switchBody")}</p>
      ) : (
        <>
          <PlanCards
            plans={offer}
            current={current}
            subscribed={subscribed}
            members={members}
            trialEndsAt={trialEndsAt}
            busy={change.busy}
            canChange={admin}
            onChoose={choose}
            className="pb-2"
          />
          <p className="pb-2 pt-1 text-[12px] leading-relaxed text-faint">{tb("fine")}</p>
        </>
      )}
      {change.error && <p className="pb-2 text-[12.5px] text-destructive">{change.error}</p>}
    </Dialog>
  );
}
