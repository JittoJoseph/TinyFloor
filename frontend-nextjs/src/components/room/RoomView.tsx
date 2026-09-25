"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { AlertCircle, Check, UserPlus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ControlBar from "@/components/ControlBar";
import { Joystick } from "./Joystick";
import ProximityOverlay from "@/components/ProximityOverlay";
import CallOverlay from "@/components/CallOverlay";
import WhiteboardOverlay from "@/components/WhiteboardOverlay";
import JukeboxPanel from "@/components/JukeboxPanel";
import RoomTutorial from "@/components/RoomTutorial";
import { EntryHeader, EntryShell } from "@/components/entry/EntryShell";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { Button } from "@/components/motion/button/base";
import { Loader } from "@/components/motion/loader";
import { Face, FaceStack } from "@/components/ui/Face";
import { PersonPill } from "@/components/ui/Person";
import type { RoomTicket } from "@/lib/api";
import { shareUrl } from "@/lib/links";
import { shareLink } from "@/lib/share";
import { useFloor } from "@/lib/floor";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ROOM_CONNECTION_EVENT, ROOM_ENDED_EVENT, type RoomEnd } from "@/lib/RoomSocket";
import { TUTORIAL_FINISHED_EVENT, tutorialDone } from "@/lib/tutorial";

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

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <Connecting />,
});

export interface RoomViewProps {
  title: string;
  user: { id: string; displayName: string; character: string };
  ticketFor: () => Promise<RoomTicket>;
  /** A path worth sharing from inside the room, if there is one. */
  sharePath?: string;
  /**
   * In an office, where inviting happens (its People): the floor then keeps no
   * invite button of its own, and "invite" in the people list goes there.
   */
  inviteHref?: string;
  /** Where "back" goes when the room lets go of you. */
  leaveHref: string;
  /** Where this place's settings are, for the dock's gear. */
  settingsHref?: string;
}

/**
 * The floor: the map, and only what has to float over it — where you are and
 * who is here (top left), Invite (top right), and your microphone and camera
 * (bottom). Everything else lives in the rail.
 */
export function RoomView({ title, user, ticketFor, sharePath, inviteHref, leaveHref, settingsHref }: RoomViewProps) {
  const t = useTranslations("room");
  const [copied, setCopied] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(() => !tutorialDone());
  const [reconnecting, setReconnecting] = useState(false);
  const [ended, setEnded] = useState<RoomEnd | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const everyone = useFloor();
  const router = useRouter();
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
  const here = [
    ...everyone.filter((one) => one.id === user.id),
    ...everyone.filter((one) => one.id !== user.id),
  ];
  const count = Math.max(here.length, 1);

  // The share sheet on phones, the clipboard on a desktop; the button only says
  // something when the link landed on the clipboard, where nothing else would.
  const invite = useCallback(async () => {
    if (inviteHref) {
      setPeopleOpen(false);
      router.push(inviteHref);
      return;
    }
    if (!sharePath) return;
    const result = await shareLink(shareUrl(sharePath), title, t("inviteText", { room: title }));
    if (result !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteHref, router, sharePath, title, t]);

  useEffect(() => {
    const onTutorialFinished = () => setTutorialActive(false);
    const onConnection = (event: Event) =>
      setReconnecting((event as CustomEvent<{ state: string }>).detail.state === "reconnecting");
    const onEnded = (event: Event) => setEnded((event as CustomEvent<{ reason: RoomEnd }>).detail.reason);

    window.addEventListener(TUTORIAL_FINISHED_EVENT, onTutorialFinished);
    window.addEventListener(ROOM_CONNECTION_EVENT, onConnection);
    window.addEventListener(ROOM_ENDED_EVENT, onEnded);
    return () => {
      window.removeEventListener(TUTORIAL_FINISHED_EVENT, onTutorialFinished);
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
      <PhaserGame
        key={attempt}
        name={user.displayName}
        character={user.character}
        userId={user.id}
        ticketFor={ticketFor}
      />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-4",
          tutorialActive && "hidden md:flex",
        )}
      >
        {/* Where you are and who is with you. Pressing it lists them. */}
        <div ref={peopleBox} className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setPeopleOpen((open) => !open)}
            aria-expanded={peopleOpen}
            className="flex h-10 max-w-[min(22rem,60vw)] cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card/90 ps-3.5 pe-2 shadow-float backdrop-blur-md transition-colors hover:bg-card [--face-ring:var(--ui-card)]"
          >
            <span
              className={cn("size-2 shrink-0 rounded-full", reconnecting ? "animate-pulse bg-warn" : "bg-ok")}
              aria-hidden
            />
            <span className="truncate text-[13px] font-medium text-foreground">
              {reconnecting ? t("reconnecting") : title}
            </span>
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
                    <p className="px-2 pb-2 pt-1 text-[12px] font-medium text-muted-foreground">
                      {t("peopleHere", { count })}
                    </p>
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
                    {(sharePath || inviteHref) && (
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
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{t("aloneBody")}</p>
                    {(sharePath || inviteHref) && (
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

        {sharePath && !inviteHref && <InviteChip copied={copied} onClick={invite} />}
      </div>

      <Joystick />
      <ProximityOverlay />
      <CallOverlay />
      <WhiteboardOverlay />
      <JukeboxPanel />

      <RoomTutorial name={user.displayName} character={user.character} sharePath={sharePath} />

      <div className={tutorialActive ? "hidden md:block" : undefined}>
        <ControlBar settingsHref={settingsHref} />
      </div>
    </div>
  );
}

function RoomEnded({
  reason,
  leaveHref,
  onRetry,
}: {
  reason: RoomEnd;
  leaveHref: string;
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
    <EntryShell backHref={leaveHref} backLabel={t("back")}>
      <div className="entry-rise">
        <EntryHeader
          mark={
            <span className="flex size-12 items-center justify-center rounded-[30%] bg-warn/15 text-warn">
              <AlertCircle className="size-5" />
            </span>
          }
          title={copy[reason].title}
          subtitle={copy[reason].body}
        />
        {reason === "signedOut" ? (
          <ActionLink href="/auth">{t("signIn")}</ActionLink>
        ) : canRetry ? (
          <ActionButton onClick={onRetry}>{reason === "replaced" ? t("useHere") : t("tryAgain")}</ActionButton>
        ) : (
          <ActionLink href={leaveHref}>{t("back")}</ActionLink>
        )}
      </div>
    </EntryShell>
  );
}

/**
 * The lobby's invite, matching the chip opposite it: frosted, one line, and
 * the label trading places with "Link copied" when it has done its job.
 */
function InviteChip({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  const t = useTranslations("room");
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout={!reduce}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      className="pointer-events-auto flex h-10 shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-border bg-card/90 ps-1.5 pe-3.5 text-[13px] font-medium text-foreground shadow-float backdrop-blur-md transition-colors hover:bg-card"
    >
      <motion.span
        layout={!reduce ? "position" : false}
        className={cn(
          "flex size-7 items-center justify-center rounded-full transition-colors duration-200",
          copied ? "bg-ok text-white" : "bg-foreground text-background",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "done" : "invite"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="flex"
          >
            {copied ? <Check className="size-3.5" strokeWidth={2.75} /> : <UserPlus className="size-3.5" strokeWidth={2.25} />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "done" : "invite"}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="hidden whitespace-nowrap sm:inline"
        >
          {copied ? t("linkCopied") : t("invite")}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
