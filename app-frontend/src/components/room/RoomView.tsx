"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { loadPhaserGame } from "@/lib/floorWarmup";
import { useTranslations } from "next-intl";
import { AlertCircle } from "web-shared/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import ControlBar from "@/components/ControlBar";
import { Joystick } from "./Joystick";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";
import WhiteboardOverlay from "@/components/WhiteboardOverlay";
import { MeetingAudio } from "@/components/meetings/MeetingAudio";
import { MeetingMini } from "@/components/meetings/MeetingMini";
import { PipHost } from "@/components/calls/PipHost";
import { MeetingRoomPrompt } from "@/components/meetings/MeetingRoomPrompt";
import { EntryHeader, EntryShell } from "@/components/entry/EntryShell";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { Loader } from "@/components/motion/loader";
import type { RoomTicket } from "web-shared/lib/api";
import type { ShareResult } from "@/lib/share";
import { useInvite } from "@/components/app/Invite";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { FloorPrompt } from "./FloorPrompt";
import { DeskPanel } from "./DecoratePanel";
import { FLOOR_ARRIVED_EVENT, floorRequested, sinceFloorRequested } from "@/lib/floor";
import { track } from "web-shared/lib/analytics";
import { EASE_OUT } from "@/lib/ease";
import { ROOM_CONNECTION_EVENT, ROOM_ENDED_EVENT, type RoomEnd } from "@/lib/RoomSocket";

function Connecting() {
  const t = useTranslations("room");
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <Loader variant="dots" size={22} />
        <p className="text-[13px]">{t("connecting")}</p>
      </div>
    </div>
  );
}

// The loader over the floor stays until the room has welcomed you (below), not just until this arrives.
const PhaserGame = dynamic(loadPhaserGame, { ssr: false });

export interface RoomViewProps {
  user: { id: string; displayName: string; character: string };
  ticketFor: () => Promise<RoomTicket>;
  /** How someone is asked here where there's no office to invite into (the lobby shares its link). An office opens its invite dialog. */
  onInvite?: () => Promise<ShareResult>;
  /** Invite as a key of the dock too: the lobby always, an office until someone else joins. */
  inviteChip?: boolean;
  /** Where "back" goes when the room lets go of you. */
  leaveHref: string;
  /** The demo office: the dock offers an office of your own where an office has its count. */
  demo?: boolean;
}

/**
 * The floor: the map, and the dock at its foot (you, your microphone, your
 * desk, who's here, Invite while it's worth asking, the call when there is
 * one). Everything else lives in the rail.
 */
export function RoomView({ user, ticketFor, onInvite, inviteChip = false, leaveHref, demo = false }: RoomViewProps) {
  const t = useTranslations("room");
  const [copied, setCopied] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [ended, setEnded] = useState<RoomEnd | null>(null);
  const [attempt, setAttempt] = useState(0);
  // From here until the room's welcome, the code, map, ticket and connection
  // are still on their way: one loader covers all of it, then the floor fades in.
  // Which attempt arrived: a retry (Try again) starts covered again.
  const [arrivedOn, setArrivedOn] = useState(-1);
  const arrived = arrivedOn === attempt;

  // An office's invite dialog, or the lobby's link shared: the button only says
  // something when the link landed on the clipboard, where nothing else would.
  const officeInvite = useInvite();
  const canInvite = !!officeInvite || !!onInvite;
  const invite = useCallback(async () => {
    if (officeInvite) return officeInvite();
    if ((await onInvite?.()) !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [officeInvite, onInvite]);

  useEffect(() => {
    floorRequested();
    let settled = false;
    const onArrived = () => {
      settled = true;
      setArrivedOn(attempt);
    };
    // Turned away is floor_failed (below), not giving up.
    const onEnded = () => (settled = true);
    // Gone before the floor showed (closed the tab, went elsewhere): how long they had waited (docs/analytics.md).
    const gaveUp = () => {
      if (!settled) track("floor_abandoned", { waited_ms: sinceFloorRequested() });
      settled = true;
    };
    window.addEventListener(FLOOR_ARRIVED_EVENT, onArrived);
    window.addEventListener(ROOM_ENDED_EVENT, onEnded);
    window.addEventListener("pagehide", gaveUp);
    return () => {
      gaveUp();
      window.removeEventListener(FLOOR_ARRIVED_EVENT, onArrived);
      window.removeEventListener(ROOM_ENDED_EVENT, onEnded);
      window.removeEventListener("pagehide", gaveUp);
    };
  }, [attempt]);

  useEffect(() => {
    const onConnection = (event: Event) => setReconnecting((event as CustomEvent<{ state: string }>).detail.state === "reconnecting");
    const onEnded = (event: Event) => {
      const { reason } = (event as CustomEvent<{ reason: RoomEnd }>).detail;
      setEnded(reason);
      track("floor_failed", { reason });
    };

    window.addEventListener(ROOM_CONNECTION_EVENT, onConnection);
    window.addEventListener(ROOM_ENDED_EVENT, onEnded);
    return () => {
      window.removeEventListener(ROOM_CONNECTION_EVENT, onConnection);
      window.removeEventListener(ROOM_ENDED_EVENT, onEnded);
    };
  }, []);

  if (ended) {
    return (
      <div className="absolute inset-0 z-[70] overflow-y-auto bg-background">
        <RoomEnded
          reason={ended}
          leaveHref={leaveHref}
          onRetry={() => {
            setEnded(null);
            setAttempt((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[color-mix(in_oklab,var(--ui-background)_70%,var(--ui-muted))]">
      <PhaserGame key={attempt} name={user.displayName} character={user.character} userId={user.id} ticketFor={ticketFor} />
      <AnimatePresence>
        {!arrived && (
          <motion.div key="connecting" className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.26, ease: EASE_OUT } }}>
            <Connecting />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Only while the connection is coming back: everything else that sits over the floor is in the dock. */}
      <AnimatePresence>
        {reconnecting && (
          <motion.div
            key="reconnecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="pointer-events-none absolute left-1/2 top-3 z-20 flex h-8 -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/90 px-3 text-[12.5px] font-medium text-foreground shadow-float backdrop-blur-md"
          >
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-warn" />
            {t("reconnecting")}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Above the dock, one at a time: the desk you sat at, or what you can do where you stand. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-3 sm:bottom-24">
        <FloorPrompt />
      </div>
      <Joystick />
      <ProximityOverlay />
      <CallOverlay />
      <MeetingRoomPrompt />
      <MeetingMini />
      <PipHost />
      <MeetingAudio />
      <WhiteboardOverlay />
      <DeskPanel />

      <ControlBar userId={user.id} onInvite={canInvite ? invite : undefined} inviteLabel={t("invite")} inviteShown={inviteChip && canInvite} copied={copied} demo={demo} />
    </div>
  );
}

function RoomEnded({ reason, leaveHref, onRetry }: { reason: RoomEnd; leaveHref: string; onRetry: () => void }) {
  const t = useTranslations("room.ended");
  const office = useOfficeMaybe();
  // A Free office with more members than Free holds on the floor at once (docs/pricing.md) says why it's full.
  const freeFull = !!office && office.office.plan === "free" && office.overview.members.length > office.office.seats;
  const copy: Record<RoomEnd, { title: string; body: string }> = {
    full: { title: t("fullTitle"), body: freeFull ? t("fullFree", { free: office.office.seats }) : t("full") },
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
      header={
        <EntryHeader
          mark={
            <span className="flex size-12 items-center justify-center rounded-[30%] bg-warn/15 text-warn">
              <AlertCircle className="size-5" />
            </span>
          }
          title={copy[reason].title}
          subtitle={copy[reason].body}
        />
      }
    >
      {reason === "signedOut" ? (
        <ActionLink href="/auth">{t("signIn")}</ActionLink>
      ) : canRetry ? (
        <ActionButton onClick={onRetry}>{reason === "replaced" ? t("useHere") : t("tryAgain")}</ActionButton>
      ) : (
        <ActionLink href={leaveHref}>{t("back")}</ActionLink>
      )}
    </EntryShell>
  );
}
