"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, DoorOpen, HelpCircle, LogOut, MonitorDown, Settings2, UserPlus } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setMyStatus, useMyNote, useMyStatus } from "@/lib/floor";
import { NoteGlyph } from "@/lib/noteIcons";
import type { NoteIcon } from "@shared/messages";
import { NoteOptions, NoteRow } from "./StatusNote";
import { MusicOptions, MusicRow } from "./Music";
import { useShellFrame } from "./AppShell";
import { useOfficeMaybe } from "./OfficeShell";
import { OfficeMenu, useOtherOffices } from "./OfficeSwitcher";
import type { PlayerStatus } from "@/lib/types";
import { Face } from "@/components/ui/Face";
import { Menu, MenuHeader, MenuItem, MenuSeparator, useCloseMenu } from "@/components/ui/Menu";
import { MenuExpand, MenuFold, MenuRow } from "@/components/ui/MenuViews";
import { cn } from "@/lib/utils";
import { useWide } from "@/lib/hooks/use-wide";
import { help } from "@/lib/help";
import { goTo, openSettings, useSitePage } from "@/lib/links";
import { install, useCanInstall } from "@/lib/install";

const STATUSES: Array<Exclude<PlayerStatus, "in_call" | "offline">> = ["available", "busy", "away"];
const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

type Section = "office" | "status" | "note" | "music";

/**
 * You, at the bottom of the rail: your face with your status on it, and a
 * short menu of what you reach for while working. Status, note and music are
 * a row each, saying what they are now; pressing one opens its choices beneath
 * it while the others step aside. Who you are stays at the top, your profile
 * at the bottom. On a phone, which has no rail, the office you're in is the
 * first row, and its menu (plan, invite, settings, other offices) opens beneath it.
 * Signing out is in Settings, so a slip here can't take you off the floor in
 * front of your team; a guest, who has no settings, signs out here.
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
  const [open, setOpen] = useState<Section | null>(null);
  const wide = useWide();
  const frame = useShellFrame();
  const canInstall = useCanInstall();
  const office = useOfficeMaybe()?.office ?? null;
  const { others, load } = useOtherOffices(office?.id ?? "");
  if (!user) return null;
  const close = () => setOpen(null);
  const inCall = status === "in_call";
  const shownStatus = status === "offline" ? "away" : status;

  /** A row and, pressed, its choices beneath it; the other rows fold away meanwhile. */
  const section = (which: Section, row: (open: boolean, toggle: () => void) => ReactNode, choices: ReactNode) => (
    <MenuFold shown={open === null || open === which}>
      {row(open === which, () => setOpen((now) => (now === which ? null : which)))}
      <MenuExpand open={open === which}>{choices}</MenuExpand>
    </MenuFold>
  );

  return (
    <Menu
      side={bar ? "bottom" : "top"}
      align={panel ? "start" : "end"}
      // From the rail or a phone's bottom bar, it opens in the panel's corner beside you.
      within={bar || panel ? undefined : frame}
      width={272}
      rootClassName={panel ? "min-w-0 flex-1" : undefined}
      // It opens with everything folded each time.
      onOpenChange={(shown) => !shown && close()}
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
      {/*
        You as the office sees you: your face with your status on it, your
        name, and your note when you have one. Your email address is for your
        profile, which this opens.
      */}
      {isGuest ? (
        <MenuHeader>
          <div className="flex items-center gap-3">
            <Face seed={user.id} size={40} presence={onFloor ? status : null} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">{user.displayName}</p>
              <p className="truncate text-[12.5px] text-muted-foreground">{t("guest")}</p>
            </div>
          </div>
        </MenuHeader>
      ) : (
        <ProfileCard
          userId={user.id}
          name={user.displayName}
          // Your status is the row below and the dot on your face, so the line is your note, or where this goes.
          line={onFloor && note ? { icon: note.icon, text: note.text } : { text: t("yourProfile") }}
          presence={onFloor ? status : null}
          onOpen={() => (settingsHref ? openSettings(router, settingsHref, "profile") : router.push("/account"))}
        />
      )}

      <MenuSeparator />
      {office &&
        !wide &&
        section(
          "office",
          (shown, toggle) => (
            <MenuRow
              icon={<Face seed={office.id} size={18} square />}
              onClick={() => {
                load();
                toggle();
              }}
              open={shown}
              hint={t("members", { count: office.members })}
            >
              {office.name}
            </MenuRow>
          ),
          <OfficeMenu office={office} others={others} />,
        )}
      {onFloor &&
        section(
          "status",
          (shown, toggle) => (
            <MenuRow
              icon={<span className={cn("size-2 rounded-full", STATUS_DOT[shownStatus])} />}
              // A call sets it, and ending the call gives yours back: nothing to pick until then.
              onClick={inCall ? undefined : toggle}
              open={shown}
              hint={inCall ? tStatus("in_call.description") : undefined}
            >
              {shown ? t("status") : tStatus(`${shownStatus}.label`)}
            </MenuRow>
          ),
          STATUSES.map((one) => (
            <button
              key={one}
              type="button"
              onClick={() => {
                setMyStatus(one);
                close();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06]"
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
          )),
        )}
      {!isGuest &&
        section(
          "note",
          (shown, toggle) => <NoteRow note={note} open={shown} onToggle={toggle} />,
          <NoteOptions note={note} onDone={close} />,
        )}
      {section(
        "music",
        (shown, toggle) => (
          <MusicRow open={shown} onToggle={toggle} />
        ),
        <MusicOptions onDone={close} />,
      )}


      {/* A line only when something follows it: on a wide screen, Settings and Help are on the rail. */}
      {(isGuest || (!!settingsHref && !wide) || (!wide && !bar) || canInstall) && <MenuSeparator />}
      {isGuest && (
        <MenuItem icon={<UserPlus />} onSelect={() => router.push("/auth?mode=signup")}>
          {t("makeAccount")}
        </MenuItem>
      )}
      {/* A wide screen has Settings and Help on the rail; a phone has no rail. The dashboard's bar has no help dialog. */}
      {settingsHref && !wide && (
        <MenuItem icon={<Settings2 />} onSelect={() => router.push(settingsHref)}>
          {t("settings")}
        </MenuItem>
      )}
      {!wide && !bar && (
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
  );
}

/** You, at the head of your menu: your face and status, your name, the line under it; pressed, your profile. */
function ProfileCard({
  userId,
  name,
  line,
  presence,
  onOpen,
}: {
  userId: string;
  name: string;
  line: { icon?: NoteIcon | null; text: string };
  presence: PlayerStatus | null;
  onOpen: () => void;
}) {
  const close = useCloseMenu();
  return (
    <button
      type="button"
      onClick={() => {
        close();
        onOpen();
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-2.5 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
    >
      <Face seed={userId} size={40} presence={presence} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{name}</span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          {line.icon !== undefined && <NoteGlyph icon={line.icon} className="size-3.5 shrink-0" />}
          <span className="truncate">{line.text}</span>
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground rtl:rotate-180" />
    </button>
  );
}
