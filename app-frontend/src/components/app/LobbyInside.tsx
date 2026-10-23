"use client";

import { RailIcons } from "@/components/app/railIcons";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoorOpen, Hash, ImagePlus, LogOut, MessagesSquare, Plus, Users } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type RoomTicket, type SessionUser } from "@/lib/api";
import {
  goTo,
  lobbyChatPath,
  lobbyMeetingsPath,
  lobbyOfficePath,
  lobbyPath,
  lobbyPeoplePath,
  lobbySettingsPath,
  shareUrl,
  useSitePage,
} from "@/lib/links";
import { shareLink } from "@/lib/share";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { useHelp } from "@/lib/help";
import { clearFloor, useFloor } from "@/lib/floor";
import { clearMeetings, usePeopleInMeetings } from "@/lib/meetings";
import { RoomView } from "@/components/room/RoomView";
import { Menu, MenuHeader, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { ActionLink } from "@/components/ui/Action";
import { OPEN_CONVERSATION_EVENT } from "@/components/ProximityActions";
import { dmChannelId } from "@shared/chat";
import { useWide } from "@/lib/hooks/use-wide";
import { AppShell, Logo, useShellFrame } from "./AppShell";
import { YouMenu } from "./YouMenu";
import { FloorNudges } from "./FloorNudges";
import { DemoPrompts } from "./DemoPrompts";
import { PlaceProvider, type OfficeFeature, type Place } from "./place";
import { useAppUpdates } from "@/lib/updates";

/**
 * Inside the lobby, past its door (LobbyShell): the same shell an office has
 * (floor, chat, people, settings) with one more place, about getting an
 * office of your own, which is what the lobby is for. Its code is its own,
 * fetched while the door is open, so the door shows without waiting on it.
 */
export default function LobbyInside({
  user,
  ticketFor,
  children,
}: {
  user: SessionUser;
  ticketFor: () => Promise<RoomTicket>;
  children: React.ReactNode;
}) {
  const t = useTranslations("lobby");
  const ts = useTranslations("shell");
  const tr = useTranslations("room");
  const pathname = usePathname();
  const router = useRouter();
  const home = useSitePage();
  const [asked, setAsked] = useState<OfficeFeature | null>(null);
  const { unread } = useChat();
  // The ticket with the TinyFloor team lives in Chat, so what's new in it counts there too.
  const helpUnread = useHelp().ticket?.unread ?? 0;
  const everyone = useFloor();
  const inMeetings = usePeopleInMeetings();

  // One chat for every copy of the lobby, open while you are in, as whoever you are.
  const me = user.id;
  useEffect(() => {
    chat.connect("lobby", api.lobbyChatTicket);
    return () => {
      chat.disconnect();
      clearFloor();
      clearMeetings();
    };
  }, [me]);

  // "Message" beside someone on the floor opens a direct message with them, one that lasts while you're both here.
  useEffect(() => {
    const open = (event: Event) => {
      const { id } = (event as CustomEvent<{ id: string }>).detail;
      router.push(lobbyChatPath(dmChannelId(me, id)));
    };
    window.addEventListener(OPEN_CONVERSATION_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, open);
  }, [me, router]);

  // Left open, the lobby keeps up with deploys that change what its floor has to agree on.
  useAppUpdates();

  const people = useMemo(() => everyone.map((one) => ({ id: one.id, displayName: one.name })), [everyone]);

  const on = (path: string) => pathname.endsWith(path) || pathname.includes(`${path}/`);
  const onChat = on(lobbyChatPath());
  const onPeople = on(lobbyPeoplePath);
  const onMeetings = on(lobbyMeetingsPath);
  const onSettings = on(lobbySettingsPath);
  const onOffice = on(lobbyOfficePath);

  const place: Place = {
    kind: "lobby",
    id: "lobby",
    name: t("title"),
    role: "guest",
    people,
    paths: {
      floor: lobbyPath,
      chat: lobbyChatPath,
      people: lobbyPeoplePath,
      settings: lobbySettingsPath,
      meetings: lobbyMeetingsPath,
      yourOffice: lobbyOfficePath,
    },
    officesOnly: setAsked,
  };

  const leave = { href: user.guest ? home : "/", label: ts("leaveLobby") };

  return (
    <PlaceProvider value={place}>
      <AppShell
        mark={<LobbyMark />}
        destinations={[
          {
            key: "floor",
            href: lobbyPath,
            label: ts("floor"),
            icon: RailIcons.floor,
            active: !onChat && !onPeople && !onMeetings && !onSettings && !onOffice,
          },
          { key: "chat", href: lobbyChatPath(), label: ts("chat"), icon: RailIcons.chat, active: onChat, badge: unread + helpUnread },
          {
            key: "meetings",
            href: lobbyMeetingsPath,
            label: ts("meetings"),
            icon: RailIcons.meetings,
            active: onMeetings,
            // Green while a meeting is on: how many are in them.
            live: inMeetings || undefined,
          },
          { key: "people", href: lobbyPeoplePath, label: ts("people"), icon: RailIcons.people, active: onPeople },
          { key: "office", href: lobbyOfficePath, label: ts("yourOffice"), icon: RailIcons.office, active: onOffice, dot: !onOffice },
        ]}
        settings={{ key: "settings", href: lobbySettingsPath, label: ts("settings"), icon: RailIcons.settings, active: onSettings }}
        leave={leave}
        you={<YouMenu onFloor settingsHref={lobbySettingsPath} leave={leave} />}
        floor={
          <>
            {/* Signing in from the floor to an account of a different person (not a guest
                made into an account, which keeps its id) walks in again as them. */}
            <RoomView
              key={user.id}
              title={t("title")}
              user={user}
              ticketFor={ticketFor}
              onInvite={() => shareLink(shareUrl(lobbyPath), t("title"), tr("inviteText", { room: t("title") }))}
              inviteChip
              leaveHref={leave.href}
              settingsHref={lobbySettingsPath}
            />
            {!onChat && <FloorNudges chatPath={lobbyChatPath} />}
            <DemoPrompts />
          </>
        }
      >
        {children}
      </AppShell>

      <OfficesOnly
        feature={asked}
        onClose={() => setAsked(null)}
        onGo={() => {
          setAsked(null);
          router.push(lobbyOfficePath);
        }}
      />
    </PlaceProvider>
  );
}

const FEATURE_ICON: Record<OfficeFeature, React.ReactNode> = {
  channels: <Hash className="size-5" />,
  directMessages: <MessagesSquare className="size-5" />,
  attachments: <ImagePlus className="size-5" />,
  invites: <Users className="size-5" />,
};

/** What you just reached for is an office's: say so, and offer one. */
function OfficesOnly({ feature, onClose, onGo }: { feature: OfficeFeature | null; onClose: () => void; onGo: () => void }) {
  const t = useTranslations("lobby.officesOnly");
  const tc = useTranslations("common");
  const shown = feature ?? "channels";
  return (
    <Dialog open={!!feature} onClose={onClose} title={t(`${shown}.title`)} description={t(`${shown}.body`)} closeLabel={tc("close")}>
      <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]">
          {FEATURE_ICON[shown]}
        </span>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t("free")}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 pb-3 sm:flex-row-reverse">
        <span className="sm:flex-1" onClickCapture={onGo}>
          <ActionLink href={lobbyOfficePath}>{t("go")}</ActionLink>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="h-11 cursor-pointer rounded-full px-5 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {t("notNow")}
        </button>
      </div>
    </Dialog>
  );
}

/** The top of the rail in the lobby: where you are, and the ways out. */
function LobbyMark() {
  const t = useTranslations("lobby");
  const ts = useTranslations("shell");
  const router = useRouter();
  const home = useSitePage();
  const wide = useWide();
  const frame = useShellFrame();
  const { user } = useAuth();
  const guest = !user || user.guest;
  return (
    <Menu
      align="start"
      within={wide ? frame : undefined}
      width={256}
      trigger={
        <button type="button" aria-label={t("title")} className="cursor-pointer rounded-[30%] transition-transform active:scale-95">
          <Logo size={40} />
        </button>
      }
    >
      <MenuHeader>
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-foreground">{t("title")}</p>
            <p className="truncate text-[12px] text-muted-foreground">{t("eyebrow")}</p>
          </div>
        </div>
      </MenuHeader>
      <MenuSeparator />
      <MenuItem icon={<Plus />} onSelect={() => router.push(lobbyOfficePath)}>
        {ts("yourOffice")}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={guest ? <LogOut className="rtl:rotate-180" /> : <DoorOpen />} onSelect={() => goTo(router, guest ? home : "/")}>
        {ts("leaveLobby")}
      </MenuItem>
    </Menu>
  );
}
