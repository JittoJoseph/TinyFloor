"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoorOpen, LayoutGrid, LogOut, Map as MapIcon, MessagesSquare, Plus, Users } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { lobbyChatPath, lobbyPath, lobbyPeoplePath } from "@/lib/links";
import { roomChat, useRoomChat } from "@/lib/roomChat";
import { clearFloor } from "@/lib/floor";
import { rememberInside, wasInside } from "@/lib/inside";
import { RoomView } from "@/components/room/RoomView";
import { WalkIn } from "@/components/entry/WalkIn";
import SettingsModal from "@/components/SettingsModal";
import { Menu, MenuHeader, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { useWide } from "@/lib/hooks/use-wide";
import { AppShell, Logo } from "./AppShell";
import { YouMenu } from "./YouMenu";
import { ChatNudges } from "./ChatNudges";
import { OPEN_CONVERSATION_EVENT } from "@/components/ProximityActions";

/** The free public lobby: the door, then the same shell an office has. */
export function LobbyShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lobby");
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [inside, setInside] = useState(false);
  const [devices, setDevices] = useState(false);
  const { unread } = useRoomChat();

  // Reloading the page: you were already in, so you stay in.
  useEffect(() => {
    if (user && wasInside("lobby")) queueMicrotask(() => setInside(true));
  }, [user]);

  // The lobby's chat lives as long as you are in the room.
  useEffect(() => {
    if (!inside) return;
    rememberInside("lobby", true);
    return () => {
      roomChat.reset();
      clearFloor();
      rememberInside("lobby", false);
    };
  }, [inside]);

  // The lobby has one conversation; "Message" beside someone opens it.
  useEffect(() => {
    const open = () => router.push(lobbyChatPath);
    window.addEventListener(OPEN_CONVERSATION_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, open);
  }, [router]);

  if (!inside || !user) {
    return (
      <WalkIn
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        sharePath={lobbyPath}
        onReady={() => setInside(true)}
      />
    );
  }

  const onChat = pathname.endsWith(lobbyChatPath);
  const onPeople = pathname.endsWith(lobbyPeoplePath);

  return (
    <AppShell
      mark={<LobbyMark />}
      destinations={[
        { key: "floor", href: lobbyPath, label: ts("floor"), icon: <MapIcon />, active: !onChat && !onPeople },
        { key: "chat", href: lobbyChatPath, label: ts("chat"), icon: <MessagesSquare />, active: onChat, badge: unread },
        { key: "people", href: lobbyPeoplePath, label: ts("people"), icon: <Users />, active: onPeople },
      ]}
      you={<YouMenu onFloor onDevices={() => setDevices(true)} />}
      floor={
        <>
          <RoomView
            title={t("title")}
            user={user}
            ticketFor={api.lobbyTicket}
            sharePath={lobbyPath}
            leaveHref={user.guest ? "/" : "/dashboard"}
            onDevices={() => setDevices(true)}
          />
          {!onChat && <ChatNudges lobbyChatHref={lobbyChatPath} />}
          <SettingsModal isOpen={devices} onClose={() => setDevices(false)} />
        </>
      }
    >
      {children}
    </AppShell>
  );
}

/** The top of the rail in the lobby: where you are, and the ways out. */
function LobbyMark() {
  const t = useTranslations("lobby");
  const ts = useTranslations("shell");
  const router = useRouter();
  const wide = useWide();
  const { user } = useAuth();
  const guest = !user || user.guest;
  return (
    <Menu
      side={wide ? "right" : "bottom"}
      align="start"
      offset={wide ? 16 : 8}
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
      {guest ? (
        <MenuItem icon={<Plus />} onSelect={() => router.push("/auth?mode=signup")}>
          {ts("makeAccount")}
        </MenuItem>
      ) : (
        <>
          <MenuItem icon={<Plus />} onSelect={() => router.push("/create")}>
            {ts("newOffice")}
          </MenuItem>
          <MenuItem icon={<LayoutGrid />} onSelect={() => router.push("/dashboard")}>
            {ts("allOffices")}
          </MenuItem>
        </>
      )}
      <MenuSeparator />
      <MenuItem icon={guest ? <LogOut className="rtl:rotate-180" /> : <DoorOpen />} onSelect={() => router.push(guest ? "/" : "/dashboard")}>
        {ts("leaveLobby")}
      </MenuItem>
    </Menu>
  );
}
