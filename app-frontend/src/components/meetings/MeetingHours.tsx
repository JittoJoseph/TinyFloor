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
 * The month's meeting hours, as one line under the meetings (docs/22): used of
 * how many, a small meter, when they reset and on which plan, and for admins
 * the way to more. Quiet while there's plenty; it warms near the end and says
 * so once they're used. In the lobby, the day's.
 */
export function MeetingUsageLine({ className }: { className?: string }) {
  const t = useTranslations("meetings.usage");
  const format = useFormatter();
  const place = usePlace();
  const plans = usePlans();
  const usage = useMeetingUsage();
  const hours = useHours();
  const more = useMoreHours();
  const lobby = place.kind === "lobby";

  if (!usage || usage.allowance === null) return <div aria-hidden className={cn("h-9", className)} />;
  const share = Math.min(1, usage.used / usage.allowance);
  const nearly = share >= NEARLY;
  const loud = nearly || usage.paused;
  const resets = format.dateTime(usage.resetsAt, { month: "short", day: "numeric" });
  const planId = (place.kind === "office" ? place.plan : null) as PlanId | null;
  const plan = planId && PLAN_NAMES[planId];
  const top = !!plans && plans.plans[plans.plans.length - 1]?.id === planId;

  return (
    <section className={cn("flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-muted-foreground", className)}>
      <span>{usage.period === "day" ? t("today") : t("month")}</span>
      <span className="font-medium tabular-nums text-foreground">
        {hours(Math.min(usage.used, usage.allowance))} {t("of", { allowance: hours(usage.allowance) })}
      </span>
      <span className="h-1 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className={cn("block h-full rounded-full transition-[width] duration-700", usage.paused ? "bg-destructive" : nearly ? "bg-foreground" : "bg-foreground/60")}
          style={{ width: `${Math.max(usage.used > 0 ? 3 : 0, share * 100)}%` }}
        />
      </span>
      <span className={cn(usage.paused ? "text-destructive" : nearly ? "text-foreground" : "text-faint")}>
        {usage.paused
          ? usage.period === "day"
            ? t("pausedToday")
            : t("pausedMonth", { date: resets })
          : usage.period === "day"
            ? t("resetsTomorrow")
            : t("resets", { date: resets })}
        {plan && !usage.paused && <> · {plan}</>}
      </span>
      {more && !top && (
        <button
          type="button"
          onClick={more}
          className={cn(
            "ms-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors",
            loud ? "bg-foreground text-background hover:bg-foreground/85" : "text-foreground hover:bg-muted",
          )}
        >
          <Zap className="size-3.5" />
          {t("more")}
        </button>
      )}
      {!more && !lobby && loud && <span className="ms-auto text-faint">{t("askAdmin")}</span>}
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
