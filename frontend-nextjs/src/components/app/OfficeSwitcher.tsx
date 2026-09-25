"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DoorOpen, LayoutGrid, Plus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { api, type Office, type OfficeSummary } from "@/lib/api";
import { officePath } from "@/lib/links";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { useWide } from "@/lib/hooks/use-wide";

/** The office's mark at the top of the rail, and the way to your other offices. */
export function OfficeSwitcher({ office }: { office: Office }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const wide = useWide();
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

  return (
    <Menu
      side={wide ? "right" : "bottom"}
      align="start"
      offset={wide ? 16 : 8}
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
              {t("membersOf", { used: office.members, seats: office.seats })}
            </p>
          </div>
        </div>
      </MenuHeader>

      {others.length > 0 && (
        <>
          <MenuSeparator />
          <MenuLabel>{t("switchTo")}</MenuLabel>
          {others.map((one) => (
            <MenuItem
              key={one.id}
              icon={<Face seed={one.id} size={16} square />}
              onSelect={() => router.push(officePath(one.id))}
            >
              {one.name}
            </MenuItem>
          ))}
        </>
      )}

      <MenuSeparator />
      <MenuItem icon={<Plus />} onSelect={() => router.push("/create")}>
        {t("newOffice")}
      </MenuItem>
      <MenuItem icon={<LayoutGrid />} onSelect={() => router.push("/dashboard")}>
        {t("allOffices")}
      </MenuItem>
      <MenuItem icon={<DoorOpen />} onSelect={() => router.push("/lobby")}>
        {t("publicLobby")}
      </MenuItem>
    </Menu>
  );
}
