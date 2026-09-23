"use client";

import { RailIcons } from "@/components/app/railIcons";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Member, type Office } from "@/lib/api";
import { officeChatPath, officePath, officePeoplePath, officeSettingsPath } from "@/lib/links";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { clearFloor } from "@/lib/floor";
import { RoomView } from "@/components/room/RoomView";
import { Loader } from "@/components/motion/loader";
import { AppShell } from "./AppShell";
import { YouMenu } from "./YouMenu";
import { OfficeSwitcher } from "./OfficeSwitcher";
import { PlaceProvider, type Place } from "./place";
import { ChatNudges } from "./ChatNudges";
import { OPEN_CONVERSATION_EVENT } from "@/components/ProximityActions";
import { dmChannelId } from "@shared/chat";

interface OfficeContext {
  office: Office;
  /** Everyone in the office, for chat's direct messages and the People view. */
  members: Member[];
  /** Re-reads the office and its members after something changed them. */
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

/** An office: the shell with the floor inside it. Members walk straight in as the character on their account. */
export function OfficeShell({ officeId, children }: { officeId: string; children: React.ReactNode }) {
  const t = useTranslations("office");
  const ts = useTranslations("shell");
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [office, setOffice] = useState<Office | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [gone, setGone] = useState(false);
  const { unread } = useChat();

  const refresh = useCallback(async () => {
    const found = await api.overview(officeId);
    setOffice(found.office);
    setMembers(found.members);
  }, [officeId]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: officePath(officeId) })}`);
      return;
    }
    let cancelled = false;
    api
      .overview(officeId)
      .then((found) => {
        if (cancelled) return;
        setOffice(found.office);
        setMembers(found.members);
      })
      .catch((error) => {
        if (!cancelled && error instanceof ApiError && error.status === 404) setGone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, officeId, router]);

  // One chat socket for the whole office, opened with the shell rather than
  // with the chat view, so unread counts work while you are on the floor.
  useEffect(() => {
    if (!office?.id) return;
    chat.connect(office.id, () => api.chatTicket(office.id));
    return () => {
      chat.disconnect();
      clearFloor();
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
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-[13px] font-medium text-background"
          >
            {t("backToOffices")}
          </Link>
        </div>
      </div>
    );
  }

  if (!office || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <Loader variant="dots" size={20} />
      </div>
    );
  }

  const floor = officePath(office.id);
  const chatPath = officeChatPath(office.id);
  const people = officePeoplePath(office.id);
  const settingsPath = officeSettingsPath(office.id);
  const on = (path: string) => pathname.endsWith(path) || pathname.includes(`${path}/`);
  const onChat = on(chatPath);
  const onPeople = on(people);
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
    },
    sharePath: floor,
    officesOnly: () => {},
  };

  const leave = { href: "/dashboard", label: ts("leaveOffice") };

  return (
    <Context.Provider value={{ office, members, refresh }}>
      <PlaceProvider value={place}>
        <AppShell
          mark={<OfficeSwitcher office={office} />}
          destinations={[
            { key: "floor", href: floor, label: ts("floor"), icon: RailIcons.floor, active: !onChat && !onPeople && !onSettings },
            { key: "chat", href: chatPath, label: ts("chat"), icon: RailIcons.chat, active: onChat, badge: unread },
            { key: "people", href: people, label: ts("people"), icon: RailIcons.people, active: onPeople },
          ]}
          settings={{ key: "settings", href: settingsPath, label: ts("settings"), icon: RailIcons.settings, active: onSettings }}
          leave={leave}
          you={<YouMenu onFloor settingsHref={settingsPath} leave={leave} />}
          floor={
            <>
              <RoomView
                title={office.name}
                user={user}
                ticketFor={() => api.officeTicket(office.id)}
                sharePath={floor}
                inviteHref={people}
                leaveHref="/dashboard"
                settingsHref={settingsPath}
              />
              {!onChat && <ChatNudges chatPath={(channel) => officeChatPath(office.id, channel)} />}
            </>
          }
        >
          {children}
        </AppShell>
      </PlaceProvider>
    </Context.Provider>
  );
}
