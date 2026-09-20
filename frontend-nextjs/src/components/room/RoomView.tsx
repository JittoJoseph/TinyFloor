"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, LogOut, UserPlus, Users } from "lucide-react";
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
import { RoomButton, roomLinkClass, surface, label, quietLabel } from "@/components/room/ui";
import type { RoomTicket } from "@/lib/api";
import type { PlayerStatus } from "@/lib/types";
import { shareUrl } from "@/lib/links";
import { shareLink } from "@/lib/share";
import { ROOM_CONNECTION_EVENT, ROOM_ENDED_EVENT, type RoomEnd } from "@/lib/RoomSocket";
import { TUTORIAL_FINISHED_EVENT, tutorialDone } from "@/lib/tutorial";

function Connecting() {
  const t = useTranslations("room");
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-braun-bg)] text-[var(--color-braun-text)]">
      <div className="text-center flex flex-col items-center gap-5">
        <div className="w-9 h-9 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin" />
        <p className="font-body text-[13px] font-semibold">{t("connecting")}</p>
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

  const here = participants.length + 1;

  // The share sheet on phones, the clipboard on a desktop; the button only says
  // something when the link landed on the clipboard, where nothing else would.
  const invite = useCallback(async () => {
    if (!sharePath) return;
    const result = await shareLink(shareUrl(sharePath), title, t("inviteText", { room: title }));
    if (result !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sharePath, title, t]);

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
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-braun-bg)]">
      {/* One row across the top: where you are on the left, what you can do on
          the right, both the same height so they read as one bar. */}
      <div
        className={`absolute top-0 inset-x-0 p-3 sm:p-5 ${
          tutorialActive ? "hidden md:flex" : "flex"
        } items-start justify-between gap-3 z-10 pointer-events-none`}
      >
        <div
          className={`${surface} rounded-full pointer-events-auto flex items-center gap-2.5 h-10 ps-3.5 pe-4 min-w-0 max-w-[min(20rem,55vw)]`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              reconnecting ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            }`}
          />
          <span className="min-w-0 flex items-baseline gap-2">
            <span className={`${label} text-[var(--color-braun-text)] truncate`}>{title}</span>
            <span className={`${quietLabel} truncate hidden sm:inline`}>
              {reconnecting ? t("reconnecting") : subtitle}
            </span>
          </span>
          {here > 1 && !reconnecting && (
            <span
              className="flex items-center gap-1 shrink-0 ps-2.5 ms-0.5 border-s border-black/[0.08] text-[var(--color-braun-text)] opacity-55"
              title={t("peopleHere", { count: here })}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-body text-[12px] font-semibold">{here}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          {sharePath && (
            <RoomButton
              onClick={invite}
              icon={
                copied ? (
                  <Check className="w-4 h-4 text-[var(--color-braun-green)]" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )
              }
            >
              {copied ? t("linkCopied") : t("invite")}
            </RoomButton>
          )}
          <Link href={leaveHref} className={roomLinkClass("dark")} title={t("leave")}>
            <LogOut className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t("leave")}</span>
          </Link>
        </div>
      </div>

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
        participantCount={here}
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
