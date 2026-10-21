"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Settings2, UserPlus, Zap } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { api, type Office, type OfficeSummary } from "@/lib/api";
import { officePath, officeSettingsPath, openSettings } from "@/lib/links";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { useWide } from "@/lib/hooks/use-wide";
import { usePlans } from "@/lib/billing";
import { useOpenPlans } from "@/components/billing/openPlans";
import { useInvite } from "./Invite";
import { useShellFrame } from "./AppShell";
import { PLAN_NAMES } from "@/components/billing/PlanCards";
import type { PlanId } from "@/lib/api";

const DAY = 24 * 60 * 60 * 1000;

/**
 * The office's mark at the top of the rail: what you do for this office
 * (bring people in, its plan, its settings) and the way to your other offices.
 * Its header says the plan's trial while one runs (docs/pricing.md). Nothing
 * here leads out of the office: someone with an office has no use for the demo.
 */
export function OfficeSwitcher({ office }: { office: Office }) {
  const t = useTranslations("shell");
  const tSettings = useTranslations("office.settings");
  const router = useRouter();
  const wide = useWide();
  const frame = useShellFrame();
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const asked = useRef(false);

  // Your other offices appear only in the menu, so they're fetched once it's
  // reached for, not every time an office opens.
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    api.me().then(
      ({ offices: mine }) => setOffices(mine),
      () => (asked.current = false),
    );
  };

  const others = offices.filter((one) => one.id !== office.id);
  const plans = usePlans();
  const openPlans = useOpenPlans();
  const invite = useInvite();
  // Days are counted from when the switcher opened; a trial ends at its own pace, not by the render.
  const [now] = useState(() => Date.now());
  const trialDays = office.trialEndsAt ? Math.max(1, Math.ceil((office.trialEndsAt - now) / DAY)) : null;
  const top = plans?.plans[plans.plans.length - 1]?.id === office.plan;
  const offerPlans = !!openPlans && (!!trialDays || !top);

  return (
    <Menu
      align="start"
      within={wide ? frame : undefined}
      width={264}
      trigger={
        <button
          type="button"
          aria-label={t("switchOffice")}
          title={office.name}
          onPointerEnter={load}
          onFocus={load}
          onPointerDown={load}
          className="cursor-pointer rounded-[30%] outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Face seed={office.id} size={40} square />
        </button>
      }
    >
      <MenuHeader>
        <div className="flex items-center gap-3">
          <Face seed={office.id} size={36} square />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-foreground">{office.name}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {office.plan === "free"
                ? t("membersOf", { used: office.members, seats: office.seats })
                : t("members", { count: office.members })}
            </p>
            {trialDays && (
              <p className="truncate text-[12px] font-medium text-brand">
                {t("trialLeft", { plan: PLAN_NAMES[office.plan as PlanId] ?? office.plan, count: trialDays })}
              </p>
            )}
          </div>
        </div>
      </MenuHeader>
      {invite && (
        <MenuItem icon={<UserPlus />} onSelect={invite}>
          {t("invitePeople")}
        </MenuItem>
      )}
      {offerPlans && (
        <MenuItem icon={<Zap />} onSelect={() => openPlans?.(trialDays ? "trial" : "plans")}>
          {trialDays ? t("choosePlan") : t("upgrade")}
        </MenuItem>
      )}
      <MenuItem icon={<Settings2 />} onSelect={() => openSettings(router, officeSettingsPath(office.id), "office")}>
        {tSettings("title")}
      </MenuItem>

      {others.length > 0 && (
        <>
          <MenuSeparator />
          <MenuLabel>{t("switchTo")}</MenuLabel>
          {others.map((one) => (
            <MenuItem key={one.id} icon={<Face seed={one.id} size={16} square />} onSelect={() => router.push(officePath(one.id))}>
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{one.name}</span>
                {!!one.here && (
                  <span className="flex items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-ok" />
                    {one.here}
                  </span>
                )}
              </span>
            </MenuItem>
          ))}
        </>
      )}

      <MenuSeparator />
      <MenuItem icon={<Plus />} onSelect={() => router.push("/create")}>
        {t("newOffice")}
      </MenuItem>
    </Menu>
  );
}
