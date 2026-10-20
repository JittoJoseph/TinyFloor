"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DoorOpen, HelpCircle, LogOut, MonitorDown, Settings2, SmilePlus, UserRound, UserPlus } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setMyStatus, useMyNote, useMyStatus } from "@/lib/floor";
import { StatusNoteDialog } from "./StatusNote";
import type { PlayerStatus } from "@/lib/types";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";
import { useWide } from "@/lib/hooks/use-wide";
import { help } from "@/lib/help";
import { goTo, openSettings, useSitePage } from "@/lib/links";
import { install, useCanInstall } from "@/lib/install";

const STATUSES: Array<Exclude<PlayerStatus, "in_call" | "offline">> = ["available", "busy", "away"];
const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

/**
 * You, at the bottom of the rail: your face with your status on it, and a
 * short menu of what you reach for while working — your status first, then
 * your note ("🍜 Lunch, back at 2"), then your profile. Theme and devices live in Settings, and so does signing out:
 * a slip in a menu this close at hand would take you off the floor in front of
 * your team. A guest has no account settings, so a guest signs out here.
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
  const tHelp = useTranslations("help");
  const tStatus = useTranslations("status");
  const tNote = useTranslations("note");
  const router = useRouter();
  const home = useSitePage();
  const { user, isGuest, signOut } = useAuth();
  const status = useMyStatus();
  const note = useMyNote();
  const [noting, setNoting] = useState(false);
  const wide = useWide();
  const canInstall = useCanInstall();
  if (!user) return null;
  // On a phone the rail isn't there, so Help and feedback is in here; never in the dashboard's bar, which has no dialog.
  const helpHere = !wide && !bar;

  return (
    <>
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
            <p data-ph-mask className="truncate text-[12px] text-muted-foreground">
              {user.email ?? t("guest")}
            </p>
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

      {/* A note says what a status can't: what you're doing. */}
      {!isGuest && (
        <>
          <MenuSeparator />
          {note ? (
            <MenuItem
              icon={<span className="text-[15px] leading-none">{note.emoji ?? "💬"}</span>}
              onSelect={() => setNoting(true)}
            >
              <span className="block truncate">{note.text || tNote("title")}</span>
            </MenuItem>
          ) : (
            <MenuItem icon={<SmilePlus />} onSelect={() => setNoting(true)}>
              {tNote("set")}
            </MenuItem>
          )}
        </>
      )}

      <MenuSeparator />
      {isGuest ? (
        <MenuItem icon={<UserPlus />} onSelect={() => router.push("/auth?mode=signup")}>
          {t("makeAccount")}
        </MenuItem>
      ) : (
        // In a place, your profile is a section of its settings; outside one, its own page.
        <MenuItem
          icon={<UserRound />}
          onSelect={() => (settingsHref ? openSettings(router, settingsHref, "profile") : router.push("/account"))}
        >
          {t("yourProfile")}
        </MenuItem>
      )}
      {/* On a wide screen Settings is the gear on the rail, just above; a phone has no rail. */}
      {settingsHref && !wide && (
        <MenuItem icon={<Settings2 />} onSelect={() => router.push(settingsHref)}>
          {t("settings")}
        </MenuItem>
      )}
      {helpHere && (
        <MenuItem icon={<HelpCircle />} onSelect={() => help.open()}>
          {tHelp("title")}
        </MenuItem>
      )}
      {/* Only when the browser can install it, and it isn't already. */}
      {canInstall && (
        <MenuItem icon={<MonitorDown />} onSelect={() => void install()}>
          {t("installApp")}
        </MenuItem>
      )}
      {leave && !wide && (
        <>
          <MenuSeparator />
          <MenuItem icon={<DoorOpen className="rtl:-scale-x-100" />} onSelect={() => goTo(router, leave.href)}>
            {leave.label}
          </MenuItem>
        </>
      )}
      {isGuest && (
        <>
          <MenuSeparator />
          <MenuItem
            icon={<LogOut className="rtl:rotate-180" />}
            onSelect={async () => {
              await signOut();
              window.location.assign(home);
            }}
          >
            {t("signOut")}
          </MenuItem>
        </>
      )}
    </Menu>
    {noting && <StatusNoteDialog open onClose={() => setNoting(false)} note={note} />}
    </>
  );
}
