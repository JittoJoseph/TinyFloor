"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { LogOut, MessageSquare, Video, X } from "web-shared/components/ui/icons";
import { RING_TIMEOUT_MS, INVITE_TIMEOUT_MS, callManager, type CallOutcome, type MeetingInvite, type MeetingNotice } from "@/lib/CallManager";
import { useRouter } from "@/lib/i18n/navigation";
import { usePlace } from "@/components/app/place";
import { useCall } from "@/lib/useCall";
import { SPRING_PANEL } from "@/lib/ease";
import { Face } from "web-shared/components/ui/Face";
import { CharacterBust } from "@/components/character/CharacterBust";
import { useFloor } from "@/lib/floor";
import { surface } from "./room/ui";
import { OPEN_CONVERSATION_EVENT } from "./ProximityActions";
import { cn } from "web-shared/lib/utils";

/**
 * Someone asking to talk, on both ends, on the floor's own surface (light or
 * dark): whoever wants to talk to you, their character as their picture, and
 * your answer; you asking, as a pill where the talk's
 * strip will be once they say yes; and, for a moment, how an ask ended
 * without a talk. Talking, not calling: a person leaning over to ask for a
 * word, so no phone, no ringing colours, nothing pulsing. Laid over every
 * view, so it finds you in chat or settings too, and never covers what you
 * were doing.
 */
export function CallRing() {
  const { incoming, outgoing, outcome, invite, notice } = useCall();
  // Only in the browser: the portal needs the page's body.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Escape turns a ring down, as it closes anything else laid over the app.
  useEffect(() => {
    if (!incoming && !invite) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (incoming) callManager.decline();
      else callManager.dismissInvite();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [incoming, invite]);

  if (!mounted) return null;
  return createPortal(
    <>
      {/* At the top, where nothing of the app sits; on a phone, under the floor's own chips along the top. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-[6.25rem] sm:pt-4">
        <AnimatePresence mode="popLayout">
          {outgoing ? (
            <Calling key={`out-${outgoing.id}`} id={outgoing.id} name={outgoing.name} />
          ) : outcome && !incoming ? (
            <Outcome key={`${outcome.kind}-${outcome.id}`} outcome={outcome} />
          ) : notice && !invite ? (
            <Notice key={`notice-${notice.kind}-${notice.meeting}`} notice={notice} />
          ) : null}
        </AnimatePresence>
      </div>
      {/* The same place: a phone's foot is its tabs and the dock, which an ask mustn't cover. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[91] flex justify-center px-3 pt-[6.25rem] sm:pt-4">
        <AnimatePresence>
          {incoming ? (
            <Incoming key={`in-${incoming.id}`} id={incoming.id} name={incoming.name} />
          ) : invite ? (
            <Invited key={`invite-${invite.from}-${invite.meeting}`} invite={invite} />
          ) : null}
        </AnimatePresence>
      </div>
    </>,
    document.body,
  );
}

function useRise() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 },
    transition: SPRING_PANEL,
  };
}

/** The cards and pills: what floats over the floor (the proximity card, the dock), so they sit among them as one of them. */
const card = cn(surface, "pointer-events-auto text-foreground");
/** Soft corners: a squircle where the browser draws one (corner-shape), a round corner where it doesn't. */
const squircle = "[corner-shape:squircle]";
/** Their buttons: squircles like the card and the pictures, a size up from the proximity card's, Talk with the talk mark. */
const pill =
  "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[20px] [corner-shape:squircle] px-4 text-[13.5px] font-semibold outline-none transition-[background-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98]";
const primary = cn(pill, "bg-foreground text-background hover:bg-foreground/85");
/** Saying yes to talking (or to a meeting): the floor's colour for talking, as the meeting button on the proximity card wears it. */
const go = cn(pill, "bg-ok text-white hover:bg-ok/90 focus-visible:ring-ok/50 dark:text-[rgb(4_32_16)]");
const secondary = cn(pill, "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]");
/** The strips' buttons: the same, a step smaller, sized to what they say. */
const small = "h-9 flex-none rounded-[16px] px-3.5 text-[13px]";
const close = cn(
  squircle,
  "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[16px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
);

/** Someone's character, if they're on the floor. */
const useCharacterOf = (id: string) => useFloor().find((one) => one.id === id)?.character;

/**
 * Someone's picture: their character's head and shoulders, framed as the dock
 * frames yours, with room above for a tall hat (the card's larger picture at
 * the art's own size, so its pixels stay whole), or their face when they
 * aren't on the floor.
 */
function Who({ id, size, center, zoom, soft = false, alive = false }: { id: string; size: number; center?: number; zoom?: number; soft?: boolean; alive?: boolean }) {
  const character = useCharacterOf(id);
  return character ? (
    <CharacterBust character={character} size={size} zoom={zoom} center={center} corner={soft ? 0.44 : undefined} alive={alive} className={soft ? squircle : undefined} />
  ) : (
    <Face seed={id} size={size} />
  );
}

/**
 * The talk mark, its bars rising and falling out of step like a voice: on the
 * Talk of someone asking, it says they're there, waiting to be heard. Slow and
 * shallow, each bar in its own time; still when motion is turned down.
 */
const VOICE: Array<[x: number, top: number, bottom: number, seconds: number]> = [
  [2, 10, 13, 1.3],
  [6, 6, 17, 1.7],
  [10, 3, 21, 1.15],
  [14, 8, 15, 1.55],
  [18, 5, 18, 1.9],
  [22, 10, 13, 1.4],
];
function Voice({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" aria-hidden className={cn("voice", className)}>
      {VOICE.map(([x, top, bottom, seconds], n) => (
        <line key={x} x1={x} x2={x} y1={top} y2={bottom} style={{ animationDuration: `${seconds}s`, animationDelay: `${-n * 0.37}s` }} />
      ))}
    </svg>
  );
}

/** The card's parts coming in after it, one beat apart: the picture, the words, the answer. */
const STAGGER: Variants = { shown: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const PART: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } },
};
const PART_STILL: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 0.15 } } };

/**
 * Someone asking you for something (to talk, into a meeting): their picture,
 * who and what in two lines, and the answer, yes in the colour of talking.
 * Along its foot a hairline runs down over the time the ask waits, so you can
 * see it won't wait forever, without anything blinking at you.
 */
function Ask({
  id,
  name,
  what,
  waits,
  no,
  yes,
  onNo,
  onYes,
}: {
  id: string;
  name: string;
  what: string;
  waits: number;
  no: string;
  yes: ReactNode;
  onNo: () => void;
  onYes: () => void;
}) {
  const rise = useRise();
  const reduce = useReducedMotion();
  const part = reduce ? PART_STILL : PART;
  return (
    <motion.div
      {...rise}
      role="alertdialog"
      aria-labelledby={`ask-${id}-who`}
      aria-describedby={`ask-${id}-what`}
      className={cn(card, squircle, "relative w-full max-w-[22rem] overflow-hidden rounded-[30px] p-2.5")}
    >
      <motion.div variants={STAGGER} initial="hidden" animate="shown">
        <div className="flex items-center gap-3 px-1 pb-3 pt-1">
          <motion.span variants={part} className="flex">
            <Who id={id} size={48} zoom={1} soft alive />
          </motion.span>
          <motion.p variants={part} className="min-w-0 flex-1 leading-snug">
            <span id={`ask-${id}-who`} className="block truncate text-[15px] font-semibold">
              {name}
            </span>
            <span id={`ask-${id}-what`} className="block truncate text-[13px] text-muted-foreground">
              {what}
            </span>
          </motion.p>
        </div>
        <motion.div variants={part} className="flex gap-1.5">
          <button type="button" onClick={onNo} className={secondary}>
            {no}
          </button>
          <button type="button" autoFocus onClick={onYes} className={go}>
            {yes}
          </button>
        </motion.div>
      </motion.div>
      <motion.span
        aria-hidden
        className="absolute inset-x-8 bottom-0 h-[2px] origin-left rounded-full bg-ok/45 rtl:origin-right"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: waits / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}

/** Someone who wants to talk to you. */
function Incoming({ id, name }: { id: string; name: string }) {
  const t = useTranslations("call");
  return (
    <Ask
      id={id}
      name={name}
      what={t("incoming")}
      waits={RING_TIMEOUT_MS}
      no={t("decline")}
      onNo={() => callManager.decline()}
      yes={
        <>
          <Voice className="size-4" />
          {t("accept")}
        </>
      }
      onYes={() => void callManager.accept()}
    />
  );
}

/**
 * A strip about one person, a step down from an ask: their picture, who and
 * what in two lines, and what you can do about it. Squircles throughout, as
 * the ask; its parts come in after it, the same beat apart. A hairline at its
 * foot runs down the time it waits, when it waits for something.
 */
function Strip({
  id,
  name,
  what,
  alive = false,
  waits,
  children,
}: {
  id: string;
  name: string;
  what: ReactNode;
  alive?: boolean;
  waits?: number;
  children: ReactNode;
}) {
  const rise = useRise();
  const reduce = useReducedMotion();
  const part = reduce ? PART_STILL : PART;
  return (
    <motion.div
      {...rise}
      role="status"
      className={cn(card, squircle, "relative w-full max-w-[20rem] overflow-hidden rounded-[24px] p-2")}
    >
      <motion.div variants={STAGGER} initial="hidden" animate="shown" className="flex items-center gap-3">
        <motion.span variants={part} className="flex">
          <Who id={id} size={40} soft alive={alive} />
        </motion.span>
        <motion.p variants={part} className="min-w-0 flex-1 leading-snug">
          <span className="block truncate text-[14px] font-semibold">{name}</span>
          <span className="block truncate text-[12.5px] text-muted-foreground">{what}</span>
        </motion.p>
        <motion.div variants={part} className="flex shrink-0 items-center gap-1">
          {children}
        </motion.div>
      </motion.div>
      {waits && (
        <motion.span
          aria-hidden
          className="absolute inset-x-7 bottom-0 h-[2px] origin-left rounded-full bg-ok/45 rtl:origin-right"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: waits / 1000, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

/** You asking to talk, where the talk's strip will be once they say yes: them, waiting on their answer, and taking it back. */
function Calling({ id, name }: { id: string; name: string }) {
  const t = useTranslations("call");
  return (
    <Strip id={id} name={name} what={t("calling")} alive waits={RING_TIMEOUT_MS}>
      <button type="button" onClick={() => callManager.cancel()} className={cn(secondary, small)}>
        {t("cancel")}
      </button>
    </Strip>
  );
}

/** How an ask ended without a talk; a missed one offers a message instead. */
function Outcome({ outcome }: { outcome: CallOutcome }) {
  const t = useTranslations("call");
  const tShell = useTranslations("shell");
  const missed = outcome.kind === "missed";
  return (
    <Strip id={outcome.id} name={outcome.name} what={t(`outcome.${outcome.kind}`)}>
      {missed && (
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { id: outcome.id, name: outcome.name } }));
            callManager.dismissOutcome();
          }}
          className={cn(primary, small)}
        >
          <MessageSquare className="size-3.5" />
          {tShell("message")}
        </button>
      )}
      <button type="button" onClick={() => callManager.dismissOutcome()} title={t("dismiss")} aria-label={t("dismiss")} className={close}>
        <X className="size-4" />
      </button>
    </Strip>
  );
}

/** Joining a meeting from a prompt: the stage opens on the Meetings page, and your character walks to the room. */
function useJoinMeeting() {
  const router = useRouter();
  const place = usePlace();
  return (join: () => void) => {
    if (place.paths.meetings) router.push(place.paths.meetings);
    join();
  };
}

/** Someone asking you into their meeting. */
function Invited({ invite }: { invite: MeetingInvite }) {
  const t = useTranslations("meetings");
  const join = useJoinMeeting();
  return (
    <Ask
      id={invite.from}
      name={invite.fromName}
      what={invite.name ? t("invitedTo", { name: invite.name }) : t("invited")}
      waits={INVITE_TIMEOUT_MS}
      no={t("notNow")}
      onNo={() => callManager.dismissInvite()}
      yes={
        <>
          <Video className="size-4" strokeWidth={2.25} />
          {t("join")}
        </>
      }
      onYes={() => join(() => callManager.acceptInvite())}
    />
  );
}

/** You walked out of the meeting room, which left the meeting; or the meeting had ended. */
function Notice({ notice }: { notice: MeetingNotice }) {
  const t = useTranslations("meetings");
  const tCall = useTranslations("call");
  const rise = useRise();
  const join = useJoinMeeting();
  const walked = notice.kind === "walked_out";
  return (
    <motion.div {...rise} role="status" className={cn(card, squircle, "flex items-center gap-2.5 rounded-[24px] p-2 ps-4")}>
      <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 pe-1 text-[13.5px] font-semibold">{walked ? t("walkedOut") : t("ended")}</p>
      {walked && (
        <button
          type="button"
          onClick={() => join(() => callManager.joinMeeting(notice.meeting))}
          className={cn(primary, small)}
        >
          {t("rejoin")}
        </button>
      )}
      <button type="button" onClick={() => callManager.dismissNotice()} title={tCall("dismiss")} aria-label={tCall("dismiss")} className={close}>
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
