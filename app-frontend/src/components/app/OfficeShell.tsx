"use client";

import { RailIcons } from "@/components/app/railIcons";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Office, type OfficeOverview } from "@/lib/api";
import { officeChatPath, officeMeetingsPath, officePath, officePeoplePath, officeSettingsPath } from "@/lib/links";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { useHelp } from "@/lib/help";
import { clearMeetings, peopleInMeetings, useMeetings } from "@/lib/meetings";
import { clearFloor } from "@/lib/floor";
import { useInviteLink } from "@/lib/inviteLink";
import { UpgradeProvider } from "@/components/billing/Upgrade";
import { Introduce } from "@/components/entry/Introduce";
import { RoomView } from "@/components/room/RoomView";
import { AppShell } from "./AppShell";
import { YouMenu } from "./YouMenu";
import { OfficeSwitcher } from "./OfficeSwitcher";
import { PlaceProvider, type Place } from "./place";
import { Entering } from "./Entering";
import { ChatNudges } from "./ChatNudges";
import { OPEN_CONVERSATION_EVENT } from "@/components/ProximityActions";
import { dmChannelId } from "@shared/chat";
import { rememberOffice } from "@/lib/lastOffice";
import { callManager } from "@/lib/CallManager";

interface OfficeContext {
  office: Office;
  /** The office as the People view shows it: its members and seats. */
  overview: OfficeOverview;
  /** When `overview` was read, so a view can tell whether it's worth reading again. */
  readAt: number;
  /** Re-reads the office after something changed it. */
  refresh: () => Promise<void>;
}

/** The office, where a screen is shared with the lobby and only sometimes has one. */
export function useOfficeMaybe(): OfficeContext | null {
  return useContext(Context);
}

const Context = createContext<OfficeContext | null>(null);

export function useOffice(): OfficeContext {
  const value = useContext(Context);
  if (!value) throw new Error("useOffice outside the shell");
  return value;
}

/**
 * An office: the shell with the floor inside it. Which office is read from the
 * address, since one page serves them all, and the shell is keyed by it, so
 * moving to another office starts at its door.
 */
export function OfficeShell({ children }: { children: React.ReactNode }) {
  const officeId = decodeURIComponent(usePathname().match(/\/office\/([^/]+)/)?.[1] ?? "");
  return (
    <Office key={officeId} officeId={officeId}>
      {children}
    </Office>
  );
}

/** Members walk straight in as the character on their account. */
function Office({ officeId, children }: { officeId: string; children: React.ReactNode }) {
  const t = useTranslations("office");
  const ts = useTranslations("shell");
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  // The office and everyone in it, read once here for every screen in the shell.
  const [read, setRead] = useState<{ overview: OfficeOverview; at: number } | null>(null);
  const [gone, setGone] = useState(false);
  // Inviting from the floor shares the office's one link.
  const inviteLink = useInviteLink(read ? officeId : undefined);
  const { unread } = useChat();
  // The ticket with the TinyFloor team lives in Chat, so what's new in it counts there too.
  const helpUnread = useHelp().ticket?.unread ?? 0;
  const { meetings: meetingList } = useMeetings();
  const overview = read?.overview ?? null;
  const office = overview?.office ?? null;
  const members = overview?.members ?? [];

  // The office is read on arrival, and again by any screen that changed it; both land here.
  const load = useCallback(() => api.overview(officeId).then((found) => setRead({ overview: found, at: Date.now() })), [officeId]);
  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: officePath(officeId) })}`);
      return;
    }
    load().catch((error) => {
      if (error instanceof ApiError && error.status === 404) setGone(true);
    });
  }, [isLoading, user, load, officeId, router]);

  // Opening the app again brings you back here.
  useEffect(() => {
    if (office?.id) rememberOffice(office.id);
  }, [office?.id]);

  // HD video in meetings is Pro's; anywhere else, and on leaving, the standard layer.
  useEffect(() => {
    callManager.setHd(office?.plan === "pro");
    return () => callManager.setHd(false);
  }, [office?.plan]);

  // One chat socket for the whole office, opened with the shell rather than
  // with the chat view, so unread counts work while you are on the floor.
  useEffect(() => {
    if (!office?.id) return;
    chat.connect(office.id, () => api.chatTicket(office.id));
    return () => {
      chat.disconnect();
      clearFloor();
      clearMeetings();
    };
  }, [office?.id]);

  // "Message" beside someone on the floor opens your conversation with them.
  useEffect(() => {
    if (!office?.id || !user) return;
    const open = (event: Event) => {
      const { id } = (event as CustomEvent<{ id: string }>).detail;
      router.push(officeChatPath(office.id, dmChannelId(user.id, id)));
    };
    window.addEventListener(OPEN_CONVERSATION_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERSATION_EVENT, open);
  }, [office?.id, user, router]);

  if (gone) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <h1 className="mb-2 text-xl font-semibold tracking-tight text-foreground">{t("goneTitle")}</h1>
          <p className="mb-6 text-[14px] text-muted-foreground">{t("gone")}</p>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[13px] font-medium text-background"
          >
            {t("backToOffices")}
          </Link>
        </div>
      </div>
    );
  }

  // A new account says who it is at its first door, before its office opens.
  if (!isLoading && user && user.introduced === false) return <Introduce />;

  if (!read || !office || !user) return <Entering />;

  const floor = officePath(office.id);
  const chatPath = officeChatPath(office.id);
  const people = officePeoplePath(office.id);
  const meetings = officeMeetingsPath(office.id);
  const settingsPath = officeSettingsPath(office.id);
  const on = (path: string) => pathname.endsWith(path) || pathname.includes(`${path}/`);
  const onChat = on(chatPath);
  const onPeople = on(people);
  const onMeetings = on(meetings);
  const onSettings = on(settingsPath);

  const place: Place = {
    kind: "office",
    id: office.id,
    name: office.name,
    role: office.role,
    people: members,
    plan: office.plan,
    owner: office.owner,
    paths: {
      floor,
      chat: (channel) => officeChatPath(office.id, channel),
      people,
      settings: settingsPath,
      meetings,
    },
  };

  // An office is home: there's no button out of it, only the switcher to another. Where the
  // room itself sends you out (open elsewhere, removed), it's to the office's door.
  const door = `/?${new URLSearchParams({ left: office.id })}`;

  return (
    <Context.Provider value={{ office, overview: read.overview, readAt: read.at, refresh }}>
      <UpgradeProvider>
        <PlaceProvider value={place}>
          <AppShell
            mark={<OfficeSwitcher office={office} />}
            destinations={[
              { key: "floor", href: floor, label: ts("floor"), icon: RailIcons.floor, active: !onChat && !onPeople && !onMeetings && !onSettings },
              { key: "chat", href: chatPath, label: ts("chat"), icon: RailIcons.chat, active: onChat, badge: unread + helpUnread },
              {
                key: "meetings",
                href: meetings,
                label: ts("meetings"),
                icon: RailIcons.meetings,
                active: onMeetings,
                // Green while a meeting is on: how many are in them.
                live: peopleInMeetings(meetingList) || undefined,
                },
              { key: "people", href: people, label: ts("people"), icon: RailIcons.people, active: onPeople },
            ]}
            settings={{ key: "settings", href: settingsPath, label: ts("settings"), icon: RailIcons.settings, active: onSettings }}
            you={<YouMenu onFloor settingsHref={settingsPath} />}
            floor={
              <>
                <RoomView
                  title={office.name}
                  user={user}
                  ticketFor={() => api.officeTicket(office.id)}
                  invitePath={inviteLink}
                  // Once someone else has joined, inviting lives in People, not over the floor.
                  inviteChip={members.length <= 1}
                  leaveHref={door}
                  settingsHref={settingsPath}
                />
                {!onChat && <ChatNudges chatPath={(channel) => officeChatPath(office.id, channel)} />}
              </>
            }
          >
            {children}
          </AppShell>
        </PlaceProvider>
      </UpgradeProvider>
    </Context.Provider>
  );
}
