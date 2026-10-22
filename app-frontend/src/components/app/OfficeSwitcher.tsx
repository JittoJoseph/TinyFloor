"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Plus, Settings2, UserPlus } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { api, type Office, type OfficeSummary } from "@/lib/api";
import { officePath, officeSettingsPath, openSettings } from "@/lib/links";
import { Face } from "@/components/ui/Face";
import { Menu, MenuItem, MenuLabel, MenuSeparator, useCloseMenu } from "@/components/ui/Menu";
import { useWide } from "@/lib/hooks/use-wide";
import { useOpenPlans } from "@/components/billing/openPlans";
import { usePlans } from "@/lib/billing";
import { useInvite } from "./Invite";
import { useShellFrame } from "./AppShell";
import { PLAN_NAMES } from "@/components/billing/PlanCards";

const DAY = 24 * 60 * 60 * 1000;

/** Your other offices, fetched once something reaches for them, not every time an office opens. */
export function useOtherOffices(officeId: string) {
  const [offices, setOffices] = useState<OfficeSummary[]>([]);
  const asked = useRef(false);
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    api.me().then(
      ({ offices: mine }) => setOffices(mine),
      () => (asked.current = false),
    );
  };
  return { others: offices.filter((one) => one.id !== officeId), load };
}

/**
 * The office's mark at the top of the rail, and its menu: which office this
 * is, its plan for an admin, what you do for it (bring people in, its
 * settings), and the way to your other offices. Nothing here leads out of the
 * office: someone with an office has no use for the demo.
 */
export function OfficeSwitcher({ office }: { office: Office }) {
  const t = useTranslations("shell");
  const wide = useWide();
  const frame = useShellFrame();
  const { others, load } = useOtherOffices(office.id);

  return (
    <Menu
      align="start"
      within={wide ? frame : undefined}
      width={280}
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
      <OfficeMenu office={office} others={others} header />
    </Menu>
  );
}

/**
 * What the office menu holds, wherever it opens: the rail's menu, or a phone's
 * own menu, where the office is a row and this opens beneath it. Every row's
 * mark sits on one centre line, so faces, icons and the plus line up.
 */
export function OfficeMenu({ office, others, header = false }: { office: Office; others: OfficeSummary[]; header?: boolean }) {
  const t = useTranslations("shell");
  const tSettings = useTranslations("office.settings");
  const router = useRouter();
  const invite = useInvite();

  return (
    <>
      {header && (
        <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-2">
          <Face seed={office.id} size={40} square />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-snug text-foreground">{office.name}</p>
            <p className="truncate text-[12.5px] text-muted-foreground">
              {office.plan === "free" ? t("membersOf", { used: office.members, seats: office.seats }) : t("members", { count: office.members })}
            </p>
          </div>
        </div>
      )}
      <PlanCard office={office} />
      {invite && (
        <MenuItem icon={<UserPlus />} onSelect={invite}>
          {t("invitePeople")}
        </MenuItem>
      )}
      <MenuItem icon={<Settings2 />} onSelect={() => openSettings(router, officeSettingsPath(office.id), "office")}>
        {tSettings("title")}
      </MenuItem>

      {/* Opened beneath a row, the inset already sets it apart; a line there reads as a gap. */}
      {header && <MenuSeparator />}
      {others.length > 0 && <MenuLabel>{t("switchTo")}</MenuLabel>}
      {others.map((one) => (
        <MenuItem
          key={one.id}
          icon={<Face seed={one.id} size={22} square />}
          onSelect={() => router.push(officePath(one.id))}
          hint={
            one.here ? (
              <span className="flex items-center gap-1.5 tabular-nums">
                <span className="size-1.5 rounded-full bg-ok" />
                {one.here}
              </span>
            ) : undefined
          }
        >
          {one.name}
        </MenuItem>
      ))}
      <MenuItem
        icon={
          // The size of an office's mark, so a new one reads as one more office.
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[30%] border border-dashed border-border-strong [&_svg]:size-3.5">
            <Plus />
          </span>
        }
        onSelect={() => router.push("/create")}
      >
        {t("newOffice")}
      </MenuItem>
    </>
  );
}

/**
 * The plan, for an admin where plans are sold: its name and state (the
 * trial's days, billing to add after it, or Free), a press away from the plan
 * page. Members don't see it; it isn't theirs to change.
 */
function PlanCard({ office }: { office: Office }) {
  const tp = useTranslations("billing.page");
  const openPlans = useOpenPlans();
  const catalog = usePlans();
  const close = useCloseMenu();
  // Days are counted from when the menu first rendered; a trial ends at its own pace, not by the render.
  const [now] = useState(() => Date.now());
  if (!openPlans) return null;

  const trialDays = office.trialEndsAt ? Math.max(0, Math.ceil((office.trialEndsAt - now) / DAY)) : null;
  const unpaid = office.plan === "free" && !!office.trialEndedAt;
  const pro = office.plan !== "free" || unpaid;
  const pill = trialDays !== null ? tp("pillTrial") : unpaid ? tp("pillBilling") : null;
  const length = catalog?.trialDays || 14;
  const end = trialDays !== null ? tp("daysLeft", { count: trialDays }) : !pro ? tp("upgrade") : null;

  return (
    <button
      type="button"
      onClick={() => {
        close();
        openPlans(trialDays !== null ? "trial" : "plans");
      }}
      className="group mb-1 w-full cursor-pointer rounded-[12px] bg-foreground/[0.045] px-2.5 py-2.5 text-start outline-none transition-colors hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07]"
    >
      <span className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-foreground">{pro ? PLAN_NAMES.pro : PLAN_NAMES.free}</span>
        {pill && <span className="rounded-full bg-foreground/[0.08] px-1.5 py-px text-[11px] font-medium text-foreground">{pill}</span>}
        <span className="ms-auto flex min-w-0 items-center gap-0.5 text-[12px] text-muted-foreground">
          {end && <span className="truncate">{end}</span>}
          <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        </span>
      </span>
      {trialDays !== null && (
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden>
          <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(4, (1 - trialDays / length) * 100))}%` }} />
        </span>
      )}
    </button>
  );
}
