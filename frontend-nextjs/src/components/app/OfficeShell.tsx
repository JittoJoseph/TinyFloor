"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, Map, MessageSquare, Settings, Users } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Office } from "@/lib/api";
import { officeChatPath, officePath, officePeoplePath } from "@/lib/links";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { Badge } from "@/components/room/ui";
import { RoomView } from "@/components/room/RoomView";
import { WalkIn } from "@/components/entry/WalkIn";
import { PresenceDock } from "./PresenceDock";
import { OfficeSettings } from "./OfficeSettings";

interface OfficeContext {
  office: Office;
  /** Re-reads the office after something changed it. */
  refresh: () => Promise<void>;
}

const Context = createContext<OfficeContext | null>(null);

export function useOffice(): OfficeContext {
  const value = useContext(Context);
  if (!value) throw new Error("useOffice outside the shell");
  return value;
}

/**
 * The frame every office view sits in: a rail that never moves, and the floor
 * filling the rest. Chat and People render *over* the floor rather than in
 * place of it, so the room keeps your socket, your call and your position while
 * you read a message.
 */
export function OfficeShell({ officeId, children }: { officeId: string; children: React.ReactNode }) {
  const t = useTranslations("office");
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [office, setOffice] = useState<Office | null>(null);
  const [gone, setGone] = useState(false);
  const [inside, setInside] = useState(false);
  const [settings, setSettings] = useState(false);
  const { unread } = useChat();

  const refresh = useCallback(async () => {
    const { office: found } = await api.office(officeId);
    setOffice(found);
  }, [officeId]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: officePath(officeId) })}`);
      return;
    }
    let cancelled = false;
    api
      .office(officeId)
      .then(({ office: found }) => !cancelled && setOffice(found))
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
    if (!office || !inside) return;
    chat.connect(office.id);
    return () => chat.disconnect();
  }, [office, inside]);

  if (gone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-braun-bg)]">
        <div className="text-center">
          <h1 className="font-body text-xl font-medium text-[var(--color-braun-text)] mb-2">{t("goneTitle")}</h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">{t("gone")}</p>
          <Link href="/dashboard" className="font-body text-[13px] font-semibold underline">
            {t("backToOffices")}
          </Link>
        </div>
      </div>
    );
  }

  if (!office || !user) return <div className="min-h-screen bg-[var(--color-braun-bg)]" />;

  // The door, before any of the shell: pick who you'll be in there.
  if (!inside) {
    return (
      <WalkIn
        eyebrow={t("office")}
        title={office.name}
        backHref="/dashboard"
        sharePath={officePath(office.id)}
        onReady={() => setInside(true)}
      />
    );
  }

  const floor = officePath(office.id);
  const chatPath = officeChatPath(office.id);
  const people = officePeoplePath(office.id);
  const on = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Context.Provider value={{ office, refresh }}>
      <div className="fixed inset-0 flex bg-[var(--color-braun-bg)]">
        {/* The rail. Always there, never scrolls. */}
        <nav className="w-14 shrink-0 flex flex-col items-center gap-1 py-3 border-e border-black/[0.06] bg-[#fbfbf9] z-30">
          <Link
            href="/dashboard"
            title={t("offices")}
            className="w-9 h-9 rounded-xl bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] flex items-center justify-center font-body text-[13px] font-semibold mb-2 shrink-0"
          >
            {office.name.slice(0, 1).toUpperCase()}
          </Link>

          <RailLink href={floor} active={!on(chatPath) && !on(people)} label={t("floor")}>
            <Map className="w-[18px] h-[18px]" />
          </RailLink>
          <RailLink href={chatPath} active={on(chatPath)} label={t("chat")}>
            <MessageSquare className="w-[18px] h-[18px]" />
            {unread > 0 && <Badge count={unread} />}
          </RailLink>
          <RailLink href={people} active={on(people)} label={t("peopleTab")}>
            <Users className="w-[18px] h-[18px]" />
          </RailLink>

          <button
            type="button"
            onClick={() => setSettings(true)}
            title={t("settingsButton")}
            aria-label={t("settingsButton")}
            className="mt-auto w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-braun-text)] opacity-55 hover:opacity-100 hover:bg-black/[0.04] transition-colors duration-150 cursor-pointer"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          <Link
            href="/dashboard"
            title={t("leave")}
            aria-label={t("leave")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-braun-text)] opacity-55 hover:opacity-100 hover:bg-black/[0.04] transition-colors duration-150"
          >
            <LogOut className="w-[18px] h-[18px] rtl:rotate-180" />
          </Link>
        </nav>

        <div className="flex-1 min-w-0 relative">
          {/* The floor is always mounted: leaving it on screen is the only way
              to stay in the room while you are reading something else. */}
          <RoomView
            title={office.name}
            user={user}
            ticketFor={() => api.officeTicket(office.id)}
            sharePath={floor}
            leaveHref="/dashboard"
          />
          {children}
        </div>
      </div>

      {settings && <OfficeSettings onClose={() => setSettings(false)} />}
    </Context.Provider>
  );
}

function RailLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150 ${
        active
          ? "bg-[var(--color-braun-text)]/[0.08] text-[var(--color-braun-text)]"
          : "text-[var(--color-braun-text)] opacity-55 hover:opacity-100 hover:bg-black/[0.04]"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * A view that covers the floor: the column on the left, the view itself on the
 * right. Opaque, because the floor is still running underneath it.
 */
export function OfficeView({
  title,
  action,
  column,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  column: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-[60] flex bg-[var(--color-braun-bg)]">
      <aside className="w-full sm:w-60 shrink-0 flex flex-col border-e border-black/[0.06] bg-[#fbfbf9]">
        <header className="h-14 shrink-0 flex items-center gap-2 px-4">
          <h2 className="font-body text-[15px] font-semibold text-[var(--color-braun-text)] truncate me-auto">
            {title}
          </h2>
          {action}
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">{column}</div>
        <PresenceDock />
      </aside>

      <div className="flex-1 min-w-0 hidden sm:flex flex-col">{children}</div>
    </div>
  );
}
