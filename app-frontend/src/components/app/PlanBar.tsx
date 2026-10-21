"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2, X } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { useUpgrade, type UpgradeReason } from "@/components/billing/Upgrade";
import { useOfficeMaybe } from "./OfficeShell";

const DAY = 24 * 60 * 60 * 1000;
/** The trial's end is said to admins in its last days, not before. */
const WARN_DAYS = 3;
const hiddenKey = (officeId: string, kind: string) => `tinyfloorPlanBar:${officeId}:${kind}`;

function hiddenToday(officeId: string, kind: string): boolean {
  try {
    return localStorage.getItem(hiddenKey(officeId, kind)) === new Date().toDateString();
  } catch {
    return false;
  }
}

/**
 * The plan, where it changes something (docs/pricing.md): one bar across the
 * top of the office, part of it rather than floating over it. To admins: the
 * trial's last days, and once it has ended, the choice every office makes,
 * whatever its size: keep Pro, or carry on with Free. To everyone, once the
 * office has more people than Free holds: what that means for them. A press
 * hides it for the day; a new state shows again.
 */
export function PlanBar() {
  const t = useTranslations("planBar");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const { open } = useUpgrade();
  const [hidden, setHidden] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Read once: the days left don't need to tick while the office is open.
  const [now] = useState(() => Date.now());
  if (!context || !open) return null;
  const { office, overview, refresh } = context;
  const admin = office.role === "admin";
  const members = overview.members.length;
  const free = catalog?.plans.find((plan) => plan.price === null)?.seats ?? 3;
  const over = members > free;
  const date = (at: number) => format.dateTime(new Date(at), { weekday: "long", day: "numeric", month: "long" });

  let bar: { kind: string; label: string; text: string; reason?: UpgradeReason; stayFree?: boolean } | null = null;
  if (office.trialEndsAt && office.trialEndsAt - now < WARN_DAYS * DAY) {
    if (admin) bar = { kind: "ending", label: t("labelTrial"), text: t("ending", { date: date(office.trialEndsAt) }), reason: "trial" };
  } else if (office.trialEndedAt) {
    if (admin && !over) bar = { kind: "ended", label: t("labelEnded"), text: t("ended", { free }), reason: "ended", stayFree: true };
    else if (admin && office.graceEndsAt) bar = { kind: "grace", label: t("labelEnded"), text: t("grace", { free, date: date(office.graceEndsAt) }), reason: "over" };
    else if (admin) bar = { kind: "full", label: t("labelFree"), text: t("full", { free }), reason: "over" };
    else if (office.graceEndsAt) bar = { kind: "grace", label: t("labelEnded"), text: t("graceMember", { free, date: date(office.graceEndsAt) }) };
    else if (over) bar = { kind: "full", label: t("labelFree"), text: t("fullMember", { free }) };
  } else if (office.plan === "free" && over) {
    bar = admin
      ? { kind: "full", label: t("labelFree"), text: t("full", { free }), reason: "over" }
      : { kind: "full", label: t("labelFree"), text: t("fullMember", { free }) };
  }
  if (!bar || hidden === bar.kind || hiddenToday(office.id, bar.kind)) return null;
  const { kind } = bar;

  const hide = () => {
    setHidden(kind);
    try {
      localStorage.setItem(hiddenKey(office.id, kind), new Date().toDateString());
    } catch {}
  };
  const stayFree = async () => {
    setBusy(true);
    try {
      await api.stayOnFree(office.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="flex min-h-12 shrink-0 items-center gap-3 border-b border-border bg-muted/50 px-3 py-2 sm:px-4">
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand/12 px-2.5 py-1 text-[11.5px] font-semibold text-brand sm:inline-flex">
        <span aria-hidden className="size-1.5 rounded-full bg-brand" />
        {bar.label}
      </span>
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground sm:text-[13px]">
        {/* On a phone the label leads the sentence instead of standing beside it. */}
        <span className="font-semibold text-brand sm:hidden">{bar.label} · </span>
        {bar.text}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        {bar.stayFree && (
          <button
            type="button"
            disabled={busy}
            onClick={stayFree}
            className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50 sm:flex"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {t("stayFree")}
          </button>
        )}
        {bar.reason && (
          <button
            type="button"
            onClick={() => open(bar.reason)}
            className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-colors hover:bg-foreground/85"
          >
            {t("keep")}
          </button>
        )}
        <button
          type="button"
          aria-label={t("hide")}
          title={t("hide")}
          onClick={hide}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
