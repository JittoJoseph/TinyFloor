"use client";

import { usePlans } from "@/lib/billing";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { cn } from "@/lib/utils";

/**
 * Pro's button on the pricing page. The page is the same everywhere, but Pro
 * is only sold where Creem is set up (preview now, live once Creem has
 * reviewed the store), so the button asks the API: on, it starts an office
 * with Pro picked; off, it says Pro is coming. Until the
 * answer is in, it holds its place without a label, so nothing jumps.
 */
export function PlanAction({
  choose,
  soon,
  className,
  soonClassName,
}: {
  choose: string;
  soon: string;
  className: string;
  soonClassName: string;
}) {
  const plans = usePlans();
  if (!plans)
    return (
      <span aria-hidden className={cn(soonClassName, "pointer-events-none text-transparent")}>
        {choose}
      </span>
    );
  if (!plans.billing) return <span className={cn(soonClassName, "pointer-events-none")}>{soon}</span>;
  return (
    <Link href="/create?plan=pro" className={className}>
      {choose}
    </Link>
  );
}
