"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { VideoOff } from "lucide-react";
import type { MeetingUsage } from "@shared/messages";
import { useMeetings } from "@/lib/meetings";
import { usePlans } from "@/lib/billing";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { usePlace } from "@/components/app/place";

/** Past this share of the hours, admins see the way to more. */
const NEARLY = 0.8;

/**
 * The place's meeting hours (docs/14), ticking while meetings count: the room
 * says how much was used when it last changed, and how many meetings are
 * counting, so the rest is arithmetic until it next speaks.
 */
function useMeetingUsage(): MeetingUsage | null {
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

/** Admins of an office where plans are sold get the way to more hours. */
function useCanBuyHours(): string | null {
  const place = usePlace();
  const plans = usePlans();
  return place.kind === "office" && place.role === "admin" && plans?.billing ? `${place.paths.settings}#plan` : null;
}

function useHours() {
  const format = useFormatter();
  return (seconds: number) => format.number(seconds / 3600, { maximumFractionDigits: seconds < 36_000 ? 1 : 0 });
}

/** One quiet line under the meetings: how much of the month's hours are used. */
export function MeetingHoursLine({ className }: { className?: string }) {
  const t = useTranslations("meetings.hours");
  const usage = useMeetingUsage();
  const hours = useHours();
  const plan = useCanBuyHours();
  if (!usage || usage.allowance === null || usage.paused) return null;
  const nearly = usage.used >= usage.allowance * NEARLY;
  return (
    <p className={cn("text-center text-[12px] tabular-nums text-faint", className)}>
      {t(usage.period === "day" ? "usedToday" : "usedMonth", { used: hours(usage.used), allowance: hours(usage.allowance) })}
      {nearly && plan && (
        <>
          {" · "}
          <Link href={plan} className="font-medium text-muted-foreground underline-offset-2 hover:underline">
            {t("more")}
          </Link>
        </>
      )}
    </p>
  );
}

/** The hours are used: meetings are voice only until they reset. Says so once, quietly. */
export function VideoPausedNote({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("meetings.hours");
  const format = useFormatter();
  const usage = useMeetingUsage();
  const plan = useCanBuyHours();
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
      {plan && (
        <Link href={plan} className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline">
          {t("more")}
        </Link>
      )}
    </div>
  );
}
