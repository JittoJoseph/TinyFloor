"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Copy, LogOut, WifiOff } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import ControlBar from "@/components/ControlBar";
import SettingsModal from "@/components/SettingsModal";
import ChatPanel from "@/components/ChatPanel";
import { ChatToasts } from "@/components/ChatToasts";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";
import WhiteboardOverlay from "@/components/WhiteboardOverlay";
import JukeboxPanel from "@/components/JukeboxPanel";
import RoomTutorial from "@/components/RoomTutorial";
import { EntryShell, primaryButtonClass } from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import type { RoomTicket } from "@/lib/api";
import type { PlayerStatus } from "@/lib/types";
import { shareUrl } from "@/lib/links";
import { ROOM_CONNECTION_EVENT, ROOM_ENDED_EVENT, type RoomEnd } from "@/lib/RoomSocket";
import { TUTORIAL_FINISHED_EVENT, tutorialDone } from "@/lib/tutorial";

function Connecting() {
  const t = useTranslations("room");
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-braun-bg)] text-[var(--color-braun-text)] font-sans text-sm font-bold tracking-widest uppercase">
      <div className="text-center flex flex-col items-center gap-6">
        <div className="w-10 h-10 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin"></div>
        {t("connecting")}
      </div>
    </div>
  );
}

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <Connecting />,
});

export interface RoomViewProps {
  title: string;
  subtitle?: string;
  user: { id: string; displayName: string; character: string };
  ticketFor: () => Promise<RoomTicket>;
  /** A path worth sharing from inside the room, if there is one. */
  sharePath?: string;
  /** Where "Leave" goes. */
  leaveHref: string;
}

/** A room: the floor, the overlays, and what to show when the room lets go of you. */
export function RoomView({ title, subtitle, user, ticketFor, sharePath, leaveHref }: RoomViewProps) {
  const t = useTranslations("room");
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<PlayerStatus>("available");
  const [tutorialActive, setTutorialActive] = useState(() => !tutorialDone());
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [ended, setEnded] = useState<RoomEnd | null>(null);
  const [attempt, setAttempt] = useState(0);

  const copyLink = useCallback(() => {
    if (!sharePath || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareUrl(sharePath));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sharePath]);

  const handleStatusChange = useCallback((status: PlayerStatus) => {
    setCurrentStatus(status);
    window.dispatchEvent(new CustomEvent("statusChange", { detail: { status } }));
  }, []);

  useEffect(() => {
    const onOpenChat = () => setShowChat(true);
    const onPlayers = (event: Event) => {
      const everyone = (event as CustomEvent<Array<{ id: string; name: string }>>).detail;
      setParticipants(everyone.filter((person) => person.id !== user.id));
    };
    const onTutorialFinished = () => setTutorialActive(false);
    const onConnection = (event: Event) =>
      setReconnecting((event as CustomEvent<{ state: string }>).detail.state === "reconnecting");
    const onEnded = (event: Event) => setEnded((event as CustomEvent<{ reason: RoomEnd }>).detail.reason);

    window.addEventListener(TUTORIAL_FINISHED_EVENT, onTutorialFinished);
    window.addEventListener("openChat", onOpenChat);
    window.addEventListener("playerListUpdated", onPlayers);
    window.addEventListener(ROOM_CONNECTION_EVENT, onConnection);
    window.addEventListener(ROOM_ENDED_EVENT, onEnded);
    return () => {
      window.removeEventListener(TUTORIAL_FINISHED_EVENT, onTutorialFinished);
      window.removeEventListener("openChat", onOpenChat);
      window.removeEventListener("playerListUpdated", onPlayers);
      window.removeEventListener(ROOM_CONNECTION_EVENT, onConnection);
      window.removeEventListener(ROOM_ENDED_EVENT, onEnded);
    };
  }, [user.id]);

  if (ended) {
    return (
      <RoomEnded
        reason={ended}
        leaveHref={leaveHref}
        character={user.character}
        onRetry={() => {
          setEnded(null);
          setAttempt((count) => count + 1);
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-braun-bg)]">
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 ${
          tutorialActive ? "hidden md:flex" : "flex"
        } flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 z-10 pointer-events-none`}
      >
        <div className="bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-sm pointer-events-auto flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className={`w-2 h-2 rounded-full ${reconnecting ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm text-[var(--color-braun-text)] tracking-wide truncate">{title}</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5 truncate">
              {reconnecting ? t("reconnecting") : subtitle ?? t("peopleHere", { count: participants.length + 1 })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto self-end sm:self-auto">
          {sharePath && (
            <button
              onClick={copyLink}
              className="cursor-pointer bg-white hover:bg-gray-50 text-[var(--color-braun-text)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-[rgba(0,0,0,0.06)] shadow-sm transition-all font-bold uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {t("copyLink")}
                </>
              )}
            </button>
          )}
          <Link
            href={leaveHref}
            className="cursor-pointer bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm transition-all font-bold uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
            {t("leave")}
          </Link>
        </div>
      </div>

      {reconnecting && (
        <div
          role="status"
          className="absolute top-24 sm:top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 font-body text-[12px] text-amber-800 shadow-sm"
        >
          <WifiOff className="w-3.5 h-3.5" />
          {t("reconnectingNote")}
        </div>
      )}

      <PhaserGame
        key={attempt}
        name={user.displayName}
        character={user.character}
        userId={user.id}
        ticketFor={ticketFor}
      />

      <ProximityOverlay />
      <CallOverlay />
      <WhiteboardOverlay />
      <JukeboxPanel />

      <RoomTutorial name={user.displayName} character={user.character} sharePath={sharePath} />

      <div className={tutorialActive ? "hidden md:block" : undefined}>
        <ControlBar
          onSettingsClick={() => setShowSettings(true)}
          onChatClick={() => setShowChat((open) => !open)}
          onStatusChange={handleStatusChange}
          currentStatus={currentStatus}
          unreadChatCount={unreadChatCount}
        />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        userId={user.id}
        userName={user.displayName}
        onUnreadChange={setUnreadChatCount}
        participantCount={participants.length + 1}
      />

      <ChatToasts isChatOpen={showChat} onOpenChat={() => setShowChat(true)} />
    </div>
  );
}

function RoomEnded({
  reason,
  leaveHref,
  character,
  onRetry,
}: {
  reason: RoomEnd;
  leaveHref: string;
  character: string;
  onRetry: () => void;
}) {
  const t = useTranslations("room.ended");
  const copy: Record<RoomEnd, { title: string; body: string }> = {
    full: { title: t("fullTitle"), body: t("full") },
    replaced: { title: t("replacedTitle"), body: t("replaced") },
    closed: { title: t("closedTitle"), body: t("closed") },
    revoked: { title: t("revokedTitle"), body: t("revoked") },
    signedOut: { title: t("signedOutTitle"), body: t("signedOut") },
    notFound: { title: t("notFoundTitle"), body: t("notFound") },
  };
  const canRetry = reason === "full" || reason === "replaced";

  return (
    <EntryShell
      backHref={leaveHref}
      backLabel={t("back")}
      preview={<EntryPreview occupants={[{ character, left: "50%", top: "79%", width: 44 }]} />}
    >
      <div className="entry-rise">
        <span className="inline-flex w-11 h-11 rounded-xl bg-amber-50 items-center justify-center mb-5">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </span>
        <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-2">
          {copy[reason].title}
        </h1>
        <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">{copy[reason].body}</p>
        {reason === "signedOut" ? (
          <Link href="/auth" className={primaryButtonClass}>
            {t("signIn")}
          </Link>
        ) : canRetry ? (
          <button type="button" onClick={onRetry} className={primaryButtonClass}>
            {reason === "replaced" ? t("useHere") : t("tryAgain")}
          </button>
        ) : (
          <Link href={leaveHref} className={primaryButtonClass}>
            {t("back")}
          </Link>
        )}
      </div>
    </EntryShell>
  );
}
