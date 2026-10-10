"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { VideoOff, Zap } from "@/components/ui/icons";
import type { MeetingUsage } from "@shared/messages";
import { useMeetings } from "@/lib/meetings";
import { usePlans } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { usePlace } from "@/components/app/place";
import { useUpgrade } from "@/components/billing/Upgrade";
import { PLAN_NAMES } from "@/components/billing/PlanCards";
import type { PlanId } from "@/lib/api";

/** Past this share of the hours, the meter warms and admins see the way to more. */
const NEARLY = 0.8;

/**
 * The place's meeting hours (docs/14), ticking while meetings count: the room
 * says how much was used when it last changed, and how many meetings are
 * counting, so the rest is arithmetic until it next speaks.
 */
export function useMeetingUsage(): MeetingUsage | null {
  const { usage, usageAt } = useMeetings();
  const [now, setNow] = useState(() => Date.now());
  const counting = !!usage?.live;
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [counting]);
  if (!usage) return null;
  const extra = usage.live && !usage.paused ? (usage.live * Math.max(0, now - usageAt)) / 1000 : 0;
  return { ...usage, used: usage.used + extra };
}

/** Admins of an office where plans are sold open the plans, in place, about the hours. */
function useMoreHours(): (() => void) | null {
  const place = usePlace();
  const { open } = useUpgrade();
  return place.kind === "office" && place.role === "admin" && open ? () => open("hours") : null;
}

function useHours() {
  const format = useFormatter();
  return (seconds: number) => format.number(seconds / 3600, { maximumFractionDigits: seconds < 36_000 ? 1 : 0 });
}

/**
 * The month's meeting hours, for everyone on the Meetings page (docs/22): how
 * many are used of how many, a meter that warms near the end, when they reset
 * and on which plan; for admins, the way to more. In the lobby, the day's.
 */
export function MeetingUsageCard({ className }: { className?: string }) {
  const t = useTranslations("meetings.usage");
  const format = useFormatter();
  const place = usePlace();
  const plans = usePlans();
  const usage = useMeetingUsage();
  const hours = useHours();
  const more = useMoreHours();
  const lobby = place.kind === "lobby";

  if (!usage || usage.allowance === null) {
    return <div aria-hidden className={cn("h-[188px] animate-pulse rounded-2xl bg-muted", className)} />;
  }
  const share = Math.min(1, usage.used / usage.allowance);
  const nearly = share >= NEARLY;
  const resets = format.dateTime(usage.resetsAt, { month: "short", day: "numeric" });
  const planId = (place.kind === "office" ? place.plan : null) as PlanId | null;
  const plan = planId && PLAN_NAMES[planId];
  const top = !!plans && plans.plans[plans.plans.length - 1]?.id === planId;

  return (
    <section className={cn("rounded-2xl border border-border bg-background p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-muted-foreground">{usage.period === "day" ? t("today") : t("month")}</p>
        {plan && <span className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-semibold text-muted-foreground">{plan}</span>}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5 tabular-nums">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-foreground">{hours(usage.used)}</span>
        <span className="text-[13px] text-muted-foreground">{t("of", { allowance: hours(usage.allowance) })}</span>
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", usage.paused ? "bg-destructive" : nearly ? "bg-warn" : "bg-foreground")}
          style={{ width: `${Math.max(usage.used > 0 ? 2 : 0, share * 100)}%` }}
        />
      </div>
      <p className={cn("mt-2 text-[12px]", usage.paused ? "text-destructive" : nearly ? "text-warn" : "text-faint")}>
        {usage.paused
          ? usage.period === "day"
            ? t("pausedToday")
            : t("pausedMonth", { date: resets })
          : usage.period === "day"
            ? t("resetsTomorrow")
            : t("resets", { date: resets })}
      </p>

      <p className="mt-4 border-t border-border pt-4 text-[12.5px] leading-relaxed text-muted-foreground">
        {lobby ? t("lobby", { hours: hours(usage.allowance) }) : t("counts")}
      </p>
      {more && !top && (
        <button
          type="button"
          onClick={more}
          className={cn(
            "mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors",
            nearly || usage.paused ? "bg-foreground text-background hover:bg-foreground/85" : "border border-border text-foreground hover:bg-muted",
          )}
        >
          <Zap className="size-3.5" />
          {t("more")}
        </button>
      )}
      {!more && !lobby && (nearly || usage.paused) && <p className="mt-3 text-[12px] text-faint">{t("askAdmin")}</p>}
    </section>
  );
}

/** The hours are used: meetings are voice only until they reset. Says so once, quietly. */
export function VideoPausedNote({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("meetings.hours");
  const format = useFormatter();
  const usage = useMeetingUsage();
  const more = useMoreHours();
  if (!usage?.paused) return null;
  const until = format.dateTime(usage.resetsAt, { month: "short", day: "numeric" });
  const body = usage.period === "day" ? t("pausedToday") : t("pausedMonth", { date: until });
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-border bg-card text-[12.5px] text-muted-foreground",
        compact ? "px-3 py-1.5" : "px-4 py-2",
        className,
      )}
    >
      <VideoOff className="size-3.5 shrink-0 text-faint" aria-hidden />
      <span className="min-w-0">
        <span className="font-medium text-foreground">{t("paused")}</span> · {body}
      </span>
      {more && (
        <button type="button" onClick={more} className="shrink-0 cursor-pointer font-medium text-foreground underline-offset-2 hover:underline">
          {t("more")}
        </button>
      )}
    </div>
  );
}
