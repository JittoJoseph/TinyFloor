"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronRight, X } from "@/components/ui/icons";
import { usePlans } from "@/lib/billing";
import { Link } from "@/lib/i18n/navigation";
import { officeSettingsPath } from "@/lib/links";
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
 * trial's last days, and once it has ended, that billing decides what's next,
 * whatever the office's size; the bar goes to billing, where Pro and Free are
 * both chosen. To everyone, once the office has more people than Free has
 * room for: what that means, and who can change it. On a phone the whole bar
 * is the way in. Its × hides it for the day; a new state shows again.
 */
export function PlanBar() {
  const t = useTranslations("planBar");
  const format = useFormatter();
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const [hidden, setHidden] = useState<string | null>(null);
  // Read once: the days left don't need to tick while the office is open.
  const [now] = useState(() => Date.now());
  const pathname = usePathname();
  // Billing says it all itself.
  if (!context || pathname.endsWith("/settings")) return null;
  const { office, overview } = context;
  const admin = office.role === "admin";
  const free = catalog?.plans.find((plan) => plan.price === null)?.seats ?? 3;
  const over = overview.members.length > free;
  const date = (at: number) => format.dateTime(new Date(at), { day: "numeric", month: "long" });

  let bar: { kind: string; label: string; text: string } | null = null;
  if (office.trialEndsAt && office.trialEndsAt - now < WARN_DAYS * DAY) {
    if (admin) bar = { kind: "ending", label: t("labelTrial"), text: t("ending", { date: date(office.trialEndsAt) }) };
  } else if (office.trialEndedAt && !over) {
    if (admin) bar = { kind: "ended", label: t("labelEnded"), text: t("ended") };
  } else if (office.trialEndedAt && office.graceEndsAt) {
    const until = date(office.graceEndsAt);
    bar = { kind: "grace", label: t("labelEnded"), text: admin ? t("grace", { date: until }) : t("graceMember", { date: until }) };
  } else if (office.plan === "free" && over) {
    bar = { kind: "full", label: t("labelFree"), text: admin ? t("full", { free }) : t("fullMember", { free }) };
  }
  if (!bar || hidden === bar.kind || hiddenToday(office.id, bar.kind)) return null;
  const { kind } = bar;

  const hide = () => {
    setHidden(kind);
    try {
      localStorage.setItem(hiddenKey(office.id, kind), new Date().toDateString());
    } catch {}
  };

  const body = (
    <>
      <span className="hidden shrink-0 rounded-full bg-brand-foreground px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-brand sm:inline">
        {bar.label}
      </span>
      <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-snug sm:text-[13.5px]">{bar.text}</span>
      {admin && (
        <>
          <span className="hidden h-8 shrink-0 items-center rounded-full bg-brand-foreground px-3.5 text-[12.5px] font-semibold text-brand transition-opacity group-hover:opacity-90 sm:inline-flex">
            {t("billing")}
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 sm:hidden" />
        </>
      )}
    </>
  );
  const row = "flex min-w-0 flex-1 items-center gap-3 py-2.5 sm:py-2";

  return (
    <div role="status" className="flex min-h-11 shrink-0 items-center gap-1 bg-brand ps-3.5 pe-1.5 text-brand-foreground sm:min-h-12 sm:ps-4 sm:pe-2">
      {admin ? (
        <Link href={`${officeSettingsPath(office.id)}#plan`} className={`group ${row}`}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
      <button
        type="button"
        aria-label={t("hide")}
        title={t("hide")}
        onClick={hide}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-brand-foreground/80 transition-colors hover:bg-brand-foreground/15 hover:text-brand-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
