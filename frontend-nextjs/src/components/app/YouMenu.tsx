"use client";

import { useTranslations } from "next-intl";
import { DoorOpen, LayoutGrid, LogOut, Monitor, Moon, Settings2, Sun, UserRound, UserPlus } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { setMyStatus, useMyStatus } from "@/lib/floor";
import type { PlayerStatus } from "@/lib/types";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";
import { useWide } from "@/lib/hooks/use-wide";

const STATUSES: Array<Exclude<PlayerStatus, "in_call" | "offline">> = ["available", "busy", "away"];
const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

/**
 * You, at the bottom of the rail: your face with your status on it, and one
 * menu for everything about you — status, theme, devices, account, leaving.
 */
export function YouMenu({
  settingsHref,
  onFloor,
  bar = false,
  panel,
  leave,
}: {
  /** Where this place keeps its settings. */
  settingsHref?: string;
  /** Whether you are standing on a floor right now, so status means something. */
  onFloor: boolean;
  /** In a top bar (the dashboard) rather than on the rail. */
  bar?: boolean;
  /** In the presence dock: this is the trigger, and the menu opens above it. */
  panel?: React.ReactElement;
  /** The way out of this place. The rail has it on a wide screen; on a phone it is here. */
  leave?: { href: string; label: string };
}) {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const { user, isGuest, signOut } = useAuth();
  const theme = useTheme();
  const status = useMyStatus();
  const wide = useWide();
  if (!user) return null;

  const themes: Array<{ value: ThemeChoice; icon: React.ReactNode }> = [
    { value: "system", icon: <Monitor /> },
    { value: "light", icon: <Sun /> },
    { value: "dark", icon: <Moon /> },
  ];

  return (
    <Menu
      side={panel ? "top" : bar ? "bottom" : wide ? "right" : "top"}
      align={panel ? "start" : "end"}
      offset={panel ? 8 : bar ? 8 : wide ? 20 : 10}
      width={260}
      rootClassName={panel ? "min-w-0 flex-1" : undefined}
      trigger={
        panel ?? <button
          type="button"
          aria-label={t("you")}
          className="cursor-pointer rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Face seed={user.id} size={34} presence={onFloor ? status : null} />
        </button>
      }
    >
      <MenuHeader>
        <div className="flex items-center gap-3">
          <Face seed={user.id} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-foreground">{user.displayName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{user.email ?? t("guest")}</p>
          </div>
        </div>
      </MenuHeader>

      {onFloor && (
        <>
          <MenuSeparator />
          <MenuLabel>{t("status")}</MenuLabel>
          {status === "in_call" ? (
            // A call sets it, and ending the call gives yours back: nothing to pick until then.
            <div className="flex items-start gap-2.5 px-2.5 py-2">
              <span className={cn("mt-[5px] size-2 shrink-0 rounded-full", STATUS_DOT.in_call)} />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">{tStatus("in_call.label")}</span>
                <span className="block text-[12px] text-muted-foreground">{tStatus("in_call.description")}</span>
              </span>
            </div>
          ) : STATUSES.map((one) => (
            <MenuItem
              key={one}
              checked={status === one}
              onSelect={() => setMyStatus(one)}
              icon={<span className={cn("size-2 rounded-full", STATUS_DOT[one])} />}
            >
              {tStatus(`${one}.label`)}
            </MenuItem>
          ))}
        </>
      )}

      <MenuSeparator />
      <MenuLabel>{t("theme")}</MenuLabel>
      <div className="grid grid-cols-3 gap-1 px-1 pb-1">
        {themes.map((one) => (
          <button
            key={one.value}
            type="button"
            onClick={() => setTheme(one.value)}
            aria-pressed={theme === one.value}
            className={cn(
              "flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border text-[11px] transition-colors [&_svg]:size-4",
              theme === one.value
                ? "border-foreground/20 bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {one.icon}
            {t(`themes.${one.value}`)}
          </button>
        ))}
      </div>

      <MenuSeparator />
      {settingsHref && (
        <MenuItem icon={<Settings2 />} onSelect={() => router.push(settingsHref)}>
          {t("settings")}
        </MenuItem>
      )}
      {isGuest ? (
        <MenuItem icon={<UserPlus />} onSelect={() => router.push("/auth?mode=signup")}>
          {t("makeAccount")}
        </MenuItem>
      ) : (
        <>
          <MenuItem icon={<UserRound />} onSelect={() => router.push("/account")}>
            {t("account")}
          </MenuItem>
          <MenuItem icon={<LayoutGrid />} onSelect={() => router.push("/dashboard")}>
            {t("allOffices")}
          </MenuItem>
        </>
      )}
      {leave && !wide && (
        <>
          <MenuSeparator />
          <MenuItem icon={<DoorOpen className="rtl:-scale-x-100" />} onSelect={() => router.push(leave.href)}>
            {leave.label}
          </MenuItem>
        </>
      )}
      <MenuSeparator />
      <MenuItem
        icon={<LogOut className="rtl:rotate-180" />}
        onSelect={async () => {
          await signOut();
          router.push("/");
        }}
      >
        {t("signOut")}
      </MenuItem>
    </Menu>
  );
}
