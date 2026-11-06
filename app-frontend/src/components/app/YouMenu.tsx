"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight, DoorOpen, Headphones, HelpCircle, LogOut, Monitor, MonitorDown, Moon, Settings2, Sun, UserPlus } from "web-shared/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useShellFrame } from "./AppShell";
import { useOfficeMaybe } from "./OfficeShell";
import { OfficeMenu, useOtherOffices } from "./OfficeSwitcher";
import { Face } from "web-shared/components/ui/Face";
import { Menu, MenuItem, MenuSeparator, useCloseMenu } from "@/components/ui/Menu";
import { MenuExpand, MenuFold, MenuRow } from "@/components/ui/MenuViews";
import { cn } from "web-shared/lib/utils";
import { useWide } from "@/lib/hooks/use-wide";
import { help } from "@/lib/help";
import { goTo, openSettings, useSitePage } from "@/lib/links";
import { install, useCanInstall } from "@/lib/install";
import { setTheme, useTheme, type ThemeChoice } from "web-shared/lib/theme";
import { useMusic } from "@/lib/music";
import { MusicOptions, MusicRow } from "./Music";
import { PresenceControls } from "./Presence";

const THEMES: Array<{ value: ThemeChoice; icon: ReactNode }> = [
  { value: "system", icon: <Monitor className="size-4" /> },
  { value: "light", icon: <Sun className="size-4" /> },
  { value: "dark", icon: <Moon className="size-4" /> },
];

/**
 * You, at the bottom of the rail: your account, the same on every page. Your
 * face as your team knows it, no status on it (that's the floor's dock), and
 * while music plays, the name tag's moving bars, so you know where to stop
 * it. Pressed: who you are (your profile, a press away), your music, the look
 * of the app, the settings you reach for most (notifications, microphone and
 * camera), installing it. On a phone, which has no rail, the office you're in
 * comes first, with its menu (plan, invite, settings, other offices), then
 * Settings and Help. Signing out is in Settings, so a slip here can't take
 * you off the floor in front of your team; a guest, who has no settings,
 * signs out here.
 *
 * Under Chat and Settings, where there's no floor and so no dock, the
 * presence strip holds you instead of the rail (useDockHoldsYou), and its
 * menu is the whole of you: this, with your status and note under who you
 * are (`presence`).
 */
export function YouMenu({
  settingsHref,
  bar = false,
  leave,
  panel,
  presence = false,
}: {
  /** Where this place keeps its settings. */
  settingsHref?: string;
  /** In a top bar (the dashboard) rather than on the rail. */
  bar?: boolean;
  /** The way out of this place. The rail has it on a wide screen; on a phone it is here. */
  leave?: { href: string; label: string };
  /** In the presence strip: this is the trigger, and the menu opens above it. */
  panel?: ReactElement;
  /** Your status and note too: where there's no dock to set them in. */
  presence?: boolean;
}) {
  const t = useTranslations("shell");
  const tSettings = useTranslations("settings");
  const tHelp = useTranslations("help");
  const router = useRouter();
  const home = useSitePage();
  const { user, isGuest, signOut } = useAuth();
  const [officeOpen, setOfficeOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  // Opened again, it starts from the top: nothing unfolded, your status first.
  const [opened, setOpened] = useState(0);
  const music = useMusic();
  const playing = !!music.item && music.playing;
  const wide = useWide();
  const frame = useShellFrame();
  const canInstall = useCanInstall();
  const theme = useTheme();
  const office = useOfficeMaybe()?.office ?? null;
  const { others, load } = useOtherOffices(office?.id ?? "");
  if (!user) return null;
  const settings = (section: string) => settingsHref && openSettings(router, settingsHref, section);

  return (
    <Menu
      side={bar ? "bottom" : "top"}
      align={panel ? "start" : "end"}
      // From the rail or a phone's bottom bar, it opens in the panel's corner beside you.
      within={bar || panel ? undefined : frame}
      width={panel ? 288 : 280}
      rootClassName={panel ? "min-w-0 flex-1" : undefined}
      // It opens with everything folded each time.
      onOpenChange={(shown) => {
        if (shown) return;
        setOfficeOpen(false);
        setMusicOpen(false);
        setOpened((now) => now + 1);
      }}
      trigger={
        panel ?? (
          <button
            type="button"
            aria-label={playing && music.item ? `${t("you")} · ${music.item.title}` : t("you")}
            className="relative cursor-pointer rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Face seed={user.id} size={34} />
            {/* Playing: the name tag's bars, on the circle's corner, where the music is stopped from. */}
            {playing && (
              <span aria-hidden className="absolute -bottom-1 -end-1 flex size-[18px] items-center justify-center rounded-full bg-rail ring-2 ring-rail">
                <span className="plate-music !m-0 !h-2">
                  <i />
                  <i />
                  <i />
                </span>
              </span>
            )}
          </button>
        )
      }
    >
      <AccountCard
        userId={user.id}
        name={user.displayName}
        line={isGuest ? t("guest") : (user.email ?? t("yourProfile"))}
        onOpen={isGuest || !settingsHref ? undefined : () => settings("profile")}
      />

      {presence && (
        <div className="px-1 pb-1">
          <PresenceControls key={opened} />
        </div>
      )}
      <MenuFold shown>
        <MusicRow open={musicOpen} onToggle={() => setMusicOpen((now) => !now)} />
        <MenuExpand open={musicOpen}>
          <MusicOptions onDone={() => setMusicOpen(false)} />
        </MenuExpand>
      </MenuFold>
      <MenuSeparator />

      {/* The look of the app, one press: it's yours, the same in every office. */}
      <div role="radiogroup" aria-label={t("theme")} className="mx-1 mb-1 mt-0.5 grid grid-cols-3 gap-1 rounded-[11px] bg-foreground/[0.05] p-1">
        {THEMES.map((one) => (
          <button
            key={one.value}
            type="button"
            role="radio"
            aria-checked={theme === one.value}
            onClick={() => setTheme(one.value)}
            className={cn(
              "flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-1.5 text-[12.5px] font-medium outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/60",
              theme === one.value ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {one.icon}
            <span className="truncate">{t(`themes.${one.value}`)}</span>
          </button>
        ))}
      </div>

      {office && !wide && (
        <>
          <MenuSeparator />
          <MenuFold shown>
            <MenuRow
              icon={<Face seed={office.id} size={18} square />}
              onClick={() => {
                load();
                setOfficeOpen((now) => !now);
              }}
              open={officeOpen}
              hint={t("members", { count: office.members })}
            >
              {office.name}
            </MenuRow>
            <MenuExpand open={officeOpen}>
              <OfficeMenu office={office} others={others} />
            </MenuExpand>
          </MenuFold>
        </>
      )}

      <MenuSeparator />
      {settingsHref && !isGuest && (
        <MenuItem icon={<Bell />} onSelect={() => settings("notifications")}>
          {tSettings("sections.notifications")}
        </MenuItem>
      )}
      {settingsHref && (
        <MenuItem icon={<Headphones />} onSelect={() => settings("media")}>
          {tSettings("sections.media")}
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
      {isGuest && (
        <MenuItem icon={<UserPlus />} onSelect={() => router.push("/auth?mode=signup")}>
          {t("makeAccount")}
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

/** Who you are, at the head of the menu: your face, your name, your email; pressed, your profile. */
function AccountCard({ userId, name, line, onOpen }: { userId: string; name: string; line: string; onOpen?: () => void }) {
  const close = useCloseMenu();
  const body = (
    <>
      <Face seed={userId} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{name}</span>
        <span className="block truncate text-[12.5px] text-muted-foreground">{line}</span>
      </span>
    </>
  );
  if (!onOpen) return <div className="flex items-center gap-3 px-2.5 py-2">{body}</div>;
  return (
    <button
      type="button"
      onClick={() => {
        close();
        onOpen();
      }}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-[12px] px-2.5 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
    >
      {body}
      <ChevronRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground rtl:rotate-180" />
    </button>
  );
}
