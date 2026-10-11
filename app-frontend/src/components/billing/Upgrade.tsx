"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Loader2 } from "@/components/ui/icons";
import { api, type OfficeBilling, type PlanId } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { Button } from "@/components/motion/button/base";
import { Modal } from "@/components/ui/Modal";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { PLAN_NAMES, ProOffer, paidPlan } from "./PlanCards";
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
 * menu. A headline for why they came, then Pro put in their team's terms,
 * and the checkout right there. Members see the same offer and who can buy it.
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
  const free = catalog.plans.find((plan) => plan.price === null);
  const members = billing?.members ?? office.members;
  const subscribed = !!billing?.subscription;
  const trialEndsAt = billing?.trial?.endsAt ?? office.trialEndsAt ?? null;
  const trying = !!trialEndsAt && current === pro?.id;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long" });

  // The headline answers why they're here; the offer below is the same every time.
  const [title, body] = done
    ? [t("doneTitle", { plan: PLAN_NAMES[current] }), t("doneBody")]
    : reason === "full"
      ? [t("fullTitle"), t("fullBody", { office: office.name, seats: office.seats })]
      : reason === "hours"
        ? [t("hoursTitle"), t("hoursBody", { hours: pro?.meetingHours ?? 60 })]
        : reason === "trial" && trying && trialEndsAt
          ? [t("trialTitle"), t("trialBody", { date: date(trialEndsAt), free: free?.seats ?? 3 })]
          : [t("plansTitle"), t("plansBody")];

  const close = () => {
    setDone(false);
    change.clearError();
    onClose();
  };

  return (
    <Modal open={!!reason} onClose={close} label={title} closeLabel={tc("close")} className="sm:max-w-[27rem]">
      <div className="px-6 pb-6 pt-7 sm:px-7">
        <h2 className="pe-8 text-[20px] font-semibold leading-tight tracking-tight text-foreground">{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>

        {change.waiting === "now" ? (
          <p className="mt-6 flex items-center gap-2 text-[13.5px] text-foreground">
            <Loader2 className="size-4 animate-spin" />
            {tb("settingUp")}
          </p>
        ) : done ? (
          <>
            <p className="mt-5 flex items-center gap-2 text-[13.5px] text-foreground">
              <Check className="size-4 text-ok" />
              {t("doneLine", { plan: PLAN_NAMES[current] })}
            </p>
            <Button size="sm" className="mt-6 h-11 w-full" onClick={close}>
              {tc("close")}
            </Button>
          </>
        ) : (
          pro &&
          !subscribed && (
            // Creem's checkout opens over this, which then waits for the plan to land.
            <ProOffer
              plans={catalog.plans}
              members={members}
              trial={trying}
              busy={change.busy}
              canChange={admin}
              onChoose={(plan) => plan.id !== "free" && void change.buy(plan.id)}
              className="mt-5"
            />
          )
        )}
        {!admin && (
          <p className="mt-5 rounded-xl bg-muted px-3.5 py-2.5 text-[12.5px] text-foreground">
            {t("membersOnly", { office: office.name })}
          </p>
        )}
        {change.error && <p className="mt-3 text-[12.5px] text-destructive">{change.error}</p>}
      </div>
    </Modal>
  );
}
