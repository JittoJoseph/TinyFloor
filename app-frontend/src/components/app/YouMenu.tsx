"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, DoorOpen, HelpCircle, LogOut, MonitorDown, Settings2, UserRound, UserPlus } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setMyStatus, useMyNote, useMyStatus } from "@/lib/floor";
import { NoteRow, NoteView } from "./StatusNote";
import { MusicRow, MusicView } from "./Music";
import type { PlayerStatus } from "@/lib/types";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { MenuRow, MenuViews } from "@/components/ui/MenuViews";
import { cn } from "@/lib/utils";
import { useWide } from "@/lib/hooks/use-wide";
import { help } from "@/lib/help";
import { goTo, openSettings, useSitePage } from "@/lib/links";
import { install, useCanInstall } from "@/lib/install";

const STATUSES: Array<Exclude<PlayerStatus, "in_call" | "offline">> = ["available", "busy", "away"];
const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

type View = "main" | "status" | "note" | "music";

/**
 * You, at the bottom of the rail: your face with your status on it, and a
 * short menu of what you reach for while working. Your status, your note
 * ("🍜 Lunch") and music are a row each, saying what they are now; pressing
 * one turns the menu into its choices, and its row, at the top, turns it back.
 * Theme and devices live in Settings, and so does signing out: a slip in a
 * menu this close at hand would take you off the floor in front of your team.
 * A guest has no account settings, so a guest signs out here.
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
  const router = useRouter();
  const home = useSitePage();
  const { user, isGuest, signOut } = useAuth();
  const status = useMyStatus();
  const note = useMyNote();
  const [view, setView] = useState<View>("main");
  const wide = useWide();
  const canInstall = useCanInstall();
  if (!user) return null;
  // On a phone the rail isn't there, so Help and feedback is in here; never in the dashboard's bar, which has no dialog.
  const helpHere = !wide && !bar;
  const back = () => setView("main");
  const inCall = status === "in_call";
  const shownStatus = status === "offline" ? "away" : status;

  const statusRow = (open: boolean) => (
    <MenuRow
      icon={<span className={cn("size-2 rounded-full", STATUS_DOT[shownStatus])} />}
      // A call sets it, and ending the call gives yours back: nothing to pick until then.
      onClick={inCall ? undefined : open ? back : () => setView("status")}
      open={open}
      hint={inCall ? tStatus("in_call.description") : undefined}
    >
      {/* Open, it heads the choices, which say what each one is. */}
      {open ? t("status") : tStatus(`${shownStatus}.label`)}
    </MenuRow>
  );

  return (
    <Menu
      side={panel ? "top" : bar ? "bottom" : wide ? "right" : "top"}
      align={panel ? "start" : "end"}
      offset={panel ? 8 : bar ? 8 : wide ? 20 : 10}
      width={272}
      rootClassName={panel ? "min-w-0 flex-1" : undefined}
      // It opens on its main view each time.
      onOpenChange={(open) => !open && setView("main")}
      trigger={
        panel ?? (
          <button
            type="button"
            aria-label={t("you")}
            className="cursor-pointer rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Face seed={user.id} size={34} presence={onFloor ? status : null} />
          </button>
        )
      }
    >
      <MenuViews view={view}>
        {view === "status" && (
          <>
            {statusRow(true)}
            <div className="flex flex-col pb-0.5 pt-0.5">
              {STATUSES.map((one) => (
                <button
                  key={one}
                  type="button"
                  onClick={() => {
                    setMyStatus(one);
                    back();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <span className={cn("size-2 rounded-full", STATUS_DOT[one])} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-foreground">{tStatus(`${one}.label`)}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{tStatus(`${one}.description`)}</span>
                  </span>
                  {status === one && <Check className="size-4 shrink-0 text-foreground" />}
                </button>
              ))}
            </div>
          </>
        )}

        {view === "note" && <NoteView note={note} onDone={back} />}

        {view === "music" && <MusicView onDone={back} />}

        {view === "main" && (
          <>
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

            <MenuSeparator />
            {onFloor && statusRow(false)}
            {/* A note says what a status can't: what you're doing. */}
            {!isGuest && <NoteRow note={note} onOpen={() => setView("note")} />}
            {/* Something to play while working, from Spotify; what plays shows on your card. */}
            <MusicRow onOpen={() => setView("music")} />

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
          </>
        )}
      </MenuViews>
    </Menu>
  );
}
