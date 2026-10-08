"use client";

import { usePlans } from "@/lib/billing";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { cn } from "@/lib/utils";

/**
 * A paid plan's button on the pricing page. The page is the same everywhere,
 * but paid plans are only sold where Paddle is set up (preview now, live once
 * Paddle approves the account), so the button asks the API: on, it starts an
 * office with that plan picked; off, it says the plan is coming. Until the
 * answer is in, it holds its place without a label, so nothing jumps.
 */
export function PlanAction({
  plan,
  choose,
  soon,
  className,
  soonClassName,
}: {
  plan: "plus" | "pro";
  choose: string;
  soon: string;
  className: string;
  soonClassName: string;
}) {
  const plans = usePlans();
  if (!plans) return <span aria-hidden className={cn(soonClassName, "pointer-events-none text-transparent")}>{choose}</span>;
  if (!plans.billing) return <span className={cn(soonClassName, "pointer-events-none")}>{soon}</span>;
  return (
    <Link href={`/create?${new URLSearchParams({ plan })}`} className={className}>
      {choose}
    </Link>
  );
}
