"use client";

import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { track } from "@/lib/analytics";
import { usePlans } from "@/lib/billing";
import { useRouter } from "@/lib/i18n/navigation";
import { officeSettingsPath, openSettings } from "@/lib/links";

/**
 * Opens the office's plan page, from wherever a limit is felt: inviting past
 * the seats, the meeting hours, the office menu. Plans are chosen on that
 * page, never in a dialog over this one. Null for members, and where nothing
 * is on sale. `reason` is what brought them, for analytics.
 */
export function useOpenPlans(): ((reason: string) => void) | null {
  const context = useOfficeMaybe();
  const catalog = usePlans();
  const router = useRouter();
  if (!context || context.office.role !== "admin" || !catalog?.billing) return null;
  const officeId = context.office.id;
  return (reason) => {
    // Seen, against checkout_opened: whether the plans, or the price, is where buying stops.
    track("upgrade_opened", { reason });
    openSettings(router, officeSettingsPath(officeId), "plan");
  };
}
