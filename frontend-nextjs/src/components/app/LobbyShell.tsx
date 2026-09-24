"use client";

import { RailIcons } from "@/components/app/railIcons";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { DoorOpen, Hash, ImagePlus, LayoutGrid, LogOut, MessagesSquare, Plus, Users } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { lobbyChatPath, lobbyOfficePath, lobbyPath, lobbyPeoplePath, lobbySettingsPath } from "@/lib/links";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { clearFloor, useFloor } from "@/lib/floor";
import { RoomView } from "@/components/room/RoomView";
import { WalkIn } from "@/components/entry/WalkIn";
import { EntryDetail } from "@/components/entry/EntryShell";
import { LobbyMark as LobbyDoorMark } from "@/components/entry/DoorParts";
import { Introduce } from "@/components/entry/Introduce";
import { Menu, MenuHeader, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { FaceStack } from "@/components/ui/Face";
import { ActionLink } from "@/components/ui/Action";
import { OPEN_CONVERSATION_EVENT } from "@/components/ProximityActions";
import { dmChannelId } from "@shared/chat";
import { useWide } from "@/lib/hooks/use-wide";
import { AppShell, Logo } from "./AppShell";
import { YouMenu } from "./YouMenu";
import { ChatNudges } from "./ChatNudges";
import { PlaceProvider, type OfficeFeature, type Place } from "./place";

/**
 * The free public lobby: the door, then the same shell an office has — floor,
 * chat, people, settings — with one more place, about getting an office of
 * your own, which is what the lobby is for.
 */
export function LobbyShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lobby");
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [asked, setAsked] = useState<OfficeFeature | null>(null);
  const [door, setDoor] = useState<{ here: number; faces: Array<{ id: string; name: string }> } | null>(null);
  const { unread } = useChat();
  const everyone = useFloor();

  // Anyone with a session already has a name and a character, so the door is only for someone new;
  // a new account first says who it is (see Introduce below).
  const inside = !!user && (user.guest || user.introduced !== false);

  // Who is inside, for the door.
  useEffect(() => {
    if (inside) return;
    let cancelled = false;
    api.lobbyPeople().then(
      (found) => !cancelled && setDoor(found),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [inside]);

  // One chat for every copy of the lobby, open while you are in.
  useEffect(() => {
    if (!inside) return;
    chat.connect("lobby", api.lobbyChatTicket);
    return () => {
      chat.disconnect();
      clearFloor();
    };
  }, [inside]);

  // "Message" beside someone on the floor opens a direct message with them, one that lasts while you're both here.
  useEffect(() => {
    if (!user) return;
    const open = (event: Event) => {
      const { id } = (event as CustomEvent<{ id: string }>).detail;
      router.push(lobbyChatPath(dmChannelId(user.id, id)));
    };
    window.addEventListener(OPEN_CONVERSATION_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, open);
  }, [user, router]);

  const people = useMemo(() => everyone.map((one) => ({ id: one.id, displayName: one.name })), [everyone]);

  // A new account says who it is at its first door.
  if (user && !user.guest && user.introduced === false) return <Introduce backHref="/" />;

  if (!inside || !user) {
    return (
      <WalkIn
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        sharePath={lobbyPath}
        onReady={() => {}}
        mark={<LobbyDoorMark />}
        detail={
          door && (
            <EntryDetail
              lead={
                door.faces.length > 0 ? (
                  <FaceStack seeds={door.faces.map((one) => one.id)} size={22} max={4} />
                ) : (
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-muted">
                    <span className="size-1.5 rounded-full bg-ok" />
                  </span>
                )
              }
            >
              {t("door", { here: door.here })}
            </EntryDetail>
          )
        }
      />
    );
  }

  const on = (path: string) => pathname.endsWith(path) || pathname.includes(`${path}/`);
  const onChat = on(lobbyChatPath());
  const onPeople = on(lobbyPeoplePath);
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
      yourOffice: lobbyOfficePath,
    },
    sharePath: lobbyPath,
    officesOnly: setAsked,
  };

  const leave = { href: user.guest ? "/" : "/dashboard", label: ts("leaveLobby") };

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
            active: !onChat && !onPeople && !onSettings && !onOffice,
          },
          { key: "chat", href: lobbyChatPath(), label: ts("chat"), icon: RailIcons.chat, active: onChat, badge: unread },
          { key: "people", href: lobbyPeoplePath, label: ts("people"), icon: RailIcons.people, active: onPeople },
          { key: "office", href: lobbyOfficePath, label: ts("yourOffice"), icon: RailIcons.office, active: onOffice, dot: !onOffice },
        ]}
        settings={{ key: "settings", href: lobbySettingsPath, label: ts("settings"), icon: RailIcons.settings, active: onSettings }}
        leave={leave}
        you={<YouMenu onFloor settingsHref={lobbySettingsPath} leave={leave} />}
        floor={
          <>
            <RoomView
              title={t("title")}
              user={user}
              ticketFor={api.lobbyTicket}
              sharePath={lobbyPath}
              leaveHref={user.guest ? "/" : "/dashboard"}
              settingsHref={lobbySettingsPath}
            />
            {!onChat && <ChatNudges chatPath={lobbyChatPath} />}
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
    <Dialog
      open={!!feature}
      onClose={onClose}
      title={t(`${shown}.title`)}
      description={t(`${shown}.body`)}
      closeLabel={tc("close")}
    >
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
      <MenuItem icon={<Plus />} onSelect={() => router.push(lobbyOfficePath)}>
        {ts("yourOffice")}
      </MenuItem>
      {!guest && (
        <MenuItem icon={<LayoutGrid />} onSelect={() => router.push("/dashboard")}>
          {ts("allOffices")}
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem icon={guest ? <LogOut className="rtl:rotate-180" /> : <DoorOpen />} onSelect={() => router.push(guest ? "/" : "/dashboard")}>
        {ts("leaveLobby")}
      </MenuItem>
    </Menu>
  );
}
