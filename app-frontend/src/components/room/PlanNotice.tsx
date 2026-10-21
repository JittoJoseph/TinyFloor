"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { X, Zap } from "@/components/ui/icons";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { useUpgrade, type UpgradeReason } from "@/components/billing/Upgrade";
import { enter } from "./Desks";

const DAY = 24 * 60 * 60 * 1000;
/** The trial's end is said to admins in its last days, not before. */
const TRIAL_WARNING_DAYS = 3;
const hiddenKey = (officeId: string) => `tinyfloorPlanNotice:${officeId}`;
const today = () => new Date().toDateString();

function hiddenToday(officeId: string): boolean {
  try {
    return localStorage.getItem(hiddenKey(officeId)) === today();
  } catch {
    return false;
  }
}

/**
 * The plan, said on the floor only when it changes something (docs/pricing.md):
 * to admins, that the trial ends in a few days; to everyone, once the office
 * is past Free since its trial ended, that everyone can still come in until a
 * date, or that Free now holds its number on the floor at once. Admins get
 * the way to keep Pro; members, what's happening. Hidden for the rest of the
 * day with one press, in this browser.
 */
export function PlanNotice() {
  const t = useTranslations("planNotice");
  const format = useFormatter();
  const reduce = useReducedMotion();
  const context = useOfficeMaybe();
  const { open } = useUpgrade();
  const [hidden, setHidden] = useState(false);
  // Read once: the days left don't need to tick while the floor is open.
  const [now] = useState(() => Date.now());
  if (!context || !open) return null;
  const { office, overview } = context;
  const admin = office.role === "admin";
  const members = overview.members.length;
  const date = (at: number) => format.dateTime(new Date(at), { weekday: "long", day: "numeric", month: "long" });

  let says: { text: string; reason: UpgradeReason } | null = null;
  if (office.trialEndsAt && admin && office.trialEndsAt - now < TRIAL_WARNING_DAYS * DAY) {
    says = { text: t("trialEnds", { date: date(office.trialEndsAt) }), reason: "trial" };
  } else if (office.plan === "free" && members > office.seats) {
    const values = { members, free: office.seats };
    const text = office.graceEndsAt
      ? t(admin ? "overAdmin" : "overMember", { ...values, date: date(office.graceEndsAt) })
      : t(admin ? "overAdminLater" : "overMemberLater", values);
    says = { text, reason: "over" };
  }
  const shown = !!says && !hidden && !hiddenToday(office.id);

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(hiddenKey(office.id), today());
    } catch {}
  };

  return (
    <AnimatePresence>
      {shown && says && (
        <motion.div
          {...enter(reduce)}
          role="status"
          className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border border-border bg-card/95 py-1.5 ps-3.5 pe-1.5 text-[12.5px] text-foreground shadow-float backdrop-blur-md"
        >
          <Zap className="size-4 shrink-0 text-brand" />
          <span className="min-w-0">{says.text}</span>
          {admin && (
            <button
              type="button"
              onClick={() => open(says.reason)}
              className="h-7 shrink-0 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/85"
            >
              {t("keep")}
            </button>
          )}
          <button
            type="button"
            aria-label={t("hide")}
            title={t("hide")}
            onClick={hide}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
