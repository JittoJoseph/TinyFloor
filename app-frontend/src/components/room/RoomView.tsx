"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, UserPlus } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ControlBar from "@/components/ControlBar";
import { Joystick } from "./Joystick";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";
import WhiteboardOverlay from "@/components/WhiteboardOverlay";
import { MeetingAudio } from "@/components/meetings/MeetingAudio";
import { MeetingMini } from "@/components/meetings/MeetingMini";
import { MeetingRoomPrompt } from "@/components/meetings/MeetingRoomPrompt";
import { EntryHeader, EntryShell } from "@/components/entry/EntryShell";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { Button } from "@/components/motion/button/base";
import { Loader } from "@/components/motion/loader";
import { Face, FaceStack } from "@/components/ui/Face";
import { PersonPill } from "@/components/ui/Person";
import { DoneChip } from "@/components/ui/DoneChip";
import type { RoomTicket } from "@/lib/api";
import type { ShareResult } from "@/lib/share";
import { useInvite } from "@/components/app/Invite";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { FloorPrompt } from "./FloorPrompt";
import { DecoratePanel } from "./DecoratePanel";
import { FLOOR_ARRIVED_EVENT, floorRequested, sinceFloorRequested, useFloor } from "@/lib/floor";
import { track } from "@/lib/analytics";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
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
const PhaserGame = dynamic(() => import("@/components/PhaserGame"), { ssr: false });

export interface RoomViewProps {
  title: string;
  user: { id: string; displayName: string; character: string };
  ticketFor: () => Promise<RoomTicket>;
  /** How someone is asked here where there's no office to invite into (the lobby shares its link). An office opens its invite dialog. */
  onInvite?: () => Promise<ShareResult>;
  /** Invite over the floor's top right too: the lobby always, an office until someone else joins. */
  inviteChip?: boolean;
  /** Where "back" goes when the room lets go of you. */
  leaveHref: string;
  /** Where this place's settings are, for the dock's gear. */
  settingsHref?: string;
}

/**
 * The floor: the map, and only what has to float over it — where you are and
 * who is here (top left), Invite (top right, while it's worth asking), and your microphone and camera
 * (bottom). Everything else lives in the rail.
 */
export function RoomView({ title, user, ticketFor, onInvite, inviteChip = false, leaveHref, settingsHref }: RoomViewProps) {
  const t = useTranslations("room");
  const [copied, setCopied] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [ended, setEnded] = useState<RoomEnd | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [peopleOpen, setPeopleOpen] = useState(false);
  // From here until the room's welcome, the code, map, ticket and connection
  // are still on their way: one loader covers all of it, then the floor fades in.
  // Which attempt arrived: a retry (Try again) starts covered again.
  const [arrivedOn, setArrivedOn] = useState(-1);
  const arrived = arrivedOn === attempt;
  const everyone = useFloor();
  const reduce = useReducedMotion();
  const peopleBox = useRef<HTMLDivElement>(null);

  // The list closes when you press anywhere else, the map included.
  useEffect(() => {
    if (!peopleOpen) return;
    const close = (event: PointerEvent) => {
      if (!peopleBox.current?.contains(event.target as Node)) setPeopleOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [peopleOpen]);

  // You first, then everyone else as they arrived.
  const here = [...everyone.filter((one) => one.id === user.id), ...everyone.filter((one) => one.id !== user.id)];
  const count = Math.max(here.length, 1);

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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4">
        {/* Where you are and who is with you. Pressing it lists them. */}
        <div ref={peopleBox} className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setPeopleOpen((open) => !open)}
            aria-expanded={peopleOpen}
            className="flex h-10 max-w-[min(22rem,60vw)] cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card/90 ps-3.5 pe-2 shadow-float backdrop-blur-md transition-colors hover:bg-card [--face-ring:var(--ui-card)]"
          >
            <span className={cn("size-2 shrink-0 rounded-full", reconnecting ? "animate-pulse bg-warn" : "bg-ok")} aria-hidden />
            <span className="truncate text-[13px] font-medium text-foreground">{reconnecting ? t("reconnecting") : title}</span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-0.5 ps-0.5 pe-2 [--face-ring:var(--ui-muted)]">
              <FaceStack seeds={here.map((one) => one.id)} size={20} max={3} />
              <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{count}</span>
            </span>
          </button>

          <AnimatePresence>
            {peopleOpen && (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                style={{ transformOrigin: "top left" }}
                className="absolute start-0 top-12 w-72 rounded-2xl border border-border bg-popover p-2 shadow-float"
              >
                {here.length > 1 ? (
                  <>
                    <p className="px-2 pb-2 pt-1 text-[12px] font-medium text-muted-foreground">{t("peopleHere", { count })}</p>
                    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                      {here.map((one) => (
                        <PersonPill
                          key={one.id}
                          id={one.id}
                          name={one.id === user.id ? t("you", { name: one.name }) : one.name}
                          presence={one.status}
                          size="sm"
                          className="border-transparent bg-transparent hover:bg-muted [--face-ring:var(--ui-popover)]"
                        />
                      ))}
                    </div>
                    {canInvite && (
                      <Button variant="secondary" size="sm" onClick={invite} className="mt-2 h-9 w-full gap-2 text-[13px]">
                        {copied ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {copied ? t("linkCopied") : t("invite")}
                      </Button>
                    )}
                  </>
                ) : (
                  // Alone: your face beside the empty places, and the way to fill them.
                  <div className="flex flex-col items-center px-3 pb-2 pt-4 text-center [--face-ring:var(--ui-popover)]">
                    <span className="flex items-center">
                      <Face seed={user.id} size={40} presence="available" />
                      {[0, 1].map((one) => (
                        <span
                          key={one}
                          className="-ms-2 flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-popover text-faint"
                        >
                          <UserPlus className="size-4" />
                        </span>
                      ))}
                    </span>
                    <p className="mt-3 text-[14px] font-semibold text-foreground">{t("aloneTitle")}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{t(canInvite ? "aloneBody" : "aloneQuiet")}</p>
                    {canInvite && (
                      <Button size="sm" onClick={invite} className="mt-3 h-9 w-full gap-2 text-[13px]">
                        {copied ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {copied ? t("linkCopied") : t("inviteSomeone")}
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {inviteChip && canInvite && <InviteChip copied={copied} onClick={invite} />}
      </div>

      {/* Above the dock, one at a time: the desk you sat at, or what you can do where you stand. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-3 sm:bottom-24">
        <FloorPrompt />
      </div>
      <Joystick />
      <ProximityOverlay />
      <CallOverlay />
      <MeetingRoomPrompt />
      <MeetingMini />
      <MeetingAudio />
      <WhiteboardOverlay />
      <DecoratePanel />

      <ControlBar settingsHref={settingsHref} />
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

/**
 * Invite over the floor, matching the chip opposite it: frosted, one line, and
 * the label trading places with "Link copied" when it has done its job.
 */
function InviteChip({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  const t = useTranslations("room");
  return (
    <DoneChip
      done={copied}
      icon={<UserPlus strokeWidth={2.25} />}
      label={t("invite")}
      doneLabel={t("linkCopied")}
      onClick={onClick}
      className="pointer-events-auto bg-card/90 shadow-float backdrop-blur-md hover:bg-card"
      labelClassName="hidden sm:inline"
    />
  );
}
