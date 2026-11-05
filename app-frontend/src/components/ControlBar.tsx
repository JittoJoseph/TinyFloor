"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Desk, Mic, MicOff, MonitorUp, MonitorX, Office, PhoneOff, PictureInPicture, UserPlus, Video, Volume2, VolumeX } from "web-shared/components/ui/icons";
import { pip } from "@/lib/pip";
import { IconButton } from "@/components/ui/IconButton";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { setInCall } from "@/lib/floor";
import { useAuth } from "@/contexts/AuthContext";
import { deskOf, goToMyDesk, useDesks } from "@/lib/desks";
import { CameraRested } from "@/components/meetings/CameraRested";
import { MicMutedHint } from "@/components/meetings/MicMutedHint";
import { cn } from "web-shared/lib/utils";
import { FADE_STOPS, Fillet } from "@/components/ui/Fillet";
import { YouKey, YouPanel } from "@/components/room/DockYou";
import { DemoPanel, HereKey, HerePanel } from "@/components/room/DockHere";
import { useDecorate } from "@/lib/decorate";

/** The dock's buttons: compact rounded squares. */
const KEY = "size-9 rounded-[10px]";
/** How wide the dock opens, at the least: its panel's width. */
const OPEN_WIDTH = 304;
/** The dock's own border, either side, on top of what it holds. */
const BORDER = 2;
/** The dock's shape: a quick ease-out for each of its two moves, which barely overlap. */
const EASE = [0.32, 0.72, 0, 1] as const;
const WIDEN: Transition = { duration: 0.2, ease: EASE };
const RISE: Transition = { duration: 0.26, ease: EASE };
const FALL: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };
/** How far into one move the next starts. */
const STEP = 0.14;
const KEY_IN: Transition = { type: "spring", stiffness: 600, damping: 36 };

type Panel = "you" | "here";
const PANELS: Panel[] = ["you", "here"];

/**
 * The dock's foot: over its last few pixels it eases from its own (light)
 * colour into the frame's, so it grows out of the frame rather than standing
 * on it. Its curves (Fillet) fade the same way, over the same height.
 */
const FADE = 5;
const FOOT = `linear-gradient(to top, ${FADE_STOPS.map(([at, frame]) => `color-mix(in oklab, var(--ui-frame) ${frame}%, var(--ui-rail)) ${(at * FADE) / 100}px`).join(", ")})`;

/**
 * An element's size as laid out, kept up to date: what the dock's shape is
 * sprung to. Measured again before paint whenever `content` changes, so a
 * panel just put in is sized in the same frame it opens in, not one after.
 */
function useSize(ref: RefObject<HTMLElement | null>, content?: unknown): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize((now) => (now.width === element.offsetWidth && now.height === element.offsetHeight ? now : { width: element.offsetWidth, height: element.offsetHeight }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, content]);
  return size;
}

/**
 * The dock at the foot of the floor: a tab of the frame itself, in the
 * rail's colour, rising from the floor's bottom edge with its corners curving
 * into it, and everything over the floor lives in it. It holds only what
 * the moment needs:
 * - on the floor: you, your microphone, the way back to your desk, how many
 *   are here (and Invite while it's worth asking: an office nobody else has
 *   joined); in the demo office, no desk key, and Your office, which leads
 *   to making one;
 * - in a call: the call's own keys (microphone, camera and screen to switch
 *   on when there's something to see, speaker) and hanging up; you, your
 *   desk and the count step out until it ends;
 * - decorating your desk: your microphone (the desk's panel has the rest).
 * Keys come and go with a quick scale and fade while the others slide over.
 *
 * Pressing you or the count opens the dock itself, in two moves, never both
 * at once: out to the panel's width, then up to its height (DockYou's,
 * DockHere's, measured); closing, straight down first, then in to the keys'
 * width. Where the keys are as wide as the panel, it only rises and falls.
 * The panel is laid out at its own width from the start and uncovered as the
 * dock grows, so nothing in it reflows; what's in it fades in as it rises
 * and out first as it falls. Going from one panel to the other only changes
 * the height. It folds back when you're done, press elsewhere or press
 * Escape, and when a call starts. Only two sizes move (the dock's width,
 * the panel's height), on short tweens.
 */
export default function ControlBar({
  userId,
  onInvite,
  inviteLabel,
  inviteShown = false,
  copied = false,
  demo = false,
}: {
  userId: string;
  /** Inviting people, when this place can. */
  onInvite?: () => void;
  inviteLabel?: string;
  /** Invite as a key of its own, at rest. */
  inviteShown?: boolean;
  /** The invite link just landed on the clipboard. */
  copied?: boolean;
  /** The demo office: in place of the count, Your office, which leads to making one. */
  demo?: boolean;
}) {
  const t = useTranslations("controls");
  const tShell = useTranslations("shell");
  const { peers, meeting, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  const inCall = peers.length > 0 || !!meeting;
  // Phones and some browsers cannot share a screen, so the button only exists where it works.
  const canShareScreen = inCall && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
  const reduce = useReducedMotion() ?? false;
  const { desk: decorating } = useDecorate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const shown = inCall || decorating ? null : panel;
  // What the panel holds: kept while the dock folds down, let go once it has.
  const [held, setHeld] = useState<Panel | null>(null);
  const [fresh, setFresh] = useState(0);
  if (shown && held !== shown) setHeld(shown);
  const box = useRef<HTMLDivElement>(null);
  const keysRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const keys = useSize(keysRef);
  const content = useSize(contentRef, held);
  const openWidth = Math.max(OPEN_WIDTH, keys.width);
  const toggle = (which: Panel) => setPanel((now) => (now === which ? null : which));
  const done = useCallback(() => setPanel(null), []);
  // Opening from a closed dock, it rises once it has widened; going from one panel to the other, or a
  // panel changing its height (a note's choices opening), it moves at once.
  const [wasShown, setWasShown] = useState<Panel | null>(null);
  const [rising, setRising] = useState(false);
  if (wasShown !== shown) {
    setWasShown(shown);
    setRising(!!shown && !wasShown);
  }
  const widens = keys.width < openWidth;
  const riseDelay = rising && widens ? STEP : 0;
  const widthMove: Transition = reduce ? { duration: 0 } : shown ? WIDEN : { ...WIDEN, delay: widens ? STEP + 0.04 : 0 };
  const heightMove: Transition = reduce ? { duration: 0 } : shown ? { ...RISE, delay: riseDelay } : FALL;

  // Everyone sees "in a call" while you are in one, and your own status again after.
  const wasInCall = useRef(inCall);
  useEffect(() => {
    if (wasInCall.current === inCall) return;
    wasInCall.current = inCall;
    setInCall(inCall);
  }, [inCall]);

  // Open, it folds back when you press anywhere else (the floor too) or Escape.
  useEffect(() => {
    if (!shown) return;
    const away = (event: PointerEvent) => !box.current?.contains(event.target as Node) && setPanel(null);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setPanel(null);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [shown]);

  // The keys for this moment, in order, each with a key of its own so they come and go one by one.
  const items: Array<[string, ReactNode]> = [];
  const mic = (
    <IconButton
      label={micEnabled ? t("muteMic") : t("unmuteMic")}
      tone={micEnabled ? "soft" : "off"}
      className={KEY}
      aria-pressed={!micEnabled}
      onClick={() => callManager.setMic(!micEnabled)}
      icon={micEnabled ? <Mic /> : <MicOff />}
    />
  );
  if (inCall) {
    items.push(["mic", mic]);
    items.push([
      "camera",
      <IconButton
        key="camera"
        label={cameraEnabled ? t("cameraOff") : t("cameraOn")}
        tone={cameraEnabled ? "solid" : "ghost"}
        className={KEY}
        aria-pressed={cameraEnabled}
        onClick={() => callManager.setCamera(!cameraEnabled)}
        icon={<Video />}
      />,
    ]);
    if (canShareScreen)
      items.push([
        "screen",
        <IconButton
          key="screen"
          label={screenStream ? t("stopSharing") : t("shareScreen")}
          tone={screenStream ? "solid" : "ghost"}
          className={KEY}
          aria-pressed={!!screenStream}
          onClick={() => callManager.setScreen(!screenStream)}
          icon={screenStream ? <MonitorX /> : <MonitorUp />}
        />,
      ]);
    items.push([
      "speaker",
      <IconButton
        key="speaker"
        label={speakerEnabled ? t("muteSpeaker") : t("unmuteSpeaker")}
        tone={speakerEnabled ? "ghost" : "off"}
        className={KEY}
        aria-pressed={!speakerEnabled}
        onClick={() => callManager.setSpeaker(!speakerEnabled)}
        icon={speakerEnabled ? <Volume2 /> : <VolumeX />}
      />,
    ]);
    // The call in a small window that stays on top of other apps (lib/pip), where the browser has one.
    if (pip.supported)
      items.push([
        "popout",
        <IconButton key="popout" label={t("popOut")} tone="ghost" className={KEY} onClick={() => void pip.open()} icon={<PictureInPicture />} />,
      ]);
    items.push(["divider-call", <Divider key="divider-call" />]);
    items.push([
      "hangup",
      <IconButton
        key="hangup"
        label={meeting ? t("leaveMeeting") : t("leaveCall")}
        tone="danger"
        className="h-9 w-12 rounded-[10px]"
        onClick={() => (meeting ? callManager.leaveMeeting() : callManager.hangUp())}
        icon={<PhoneOff />}
      />,
    ]);
  } else if (decorating) {
    items.push(["mic", mic]);
  } else {
    items.push(["you", <YouKey key="you" open={shown === "you"} onToggle={() => toggle("you")} />]);
    items.push(["divider-you", <Divider key="divider-you" />]);
    items.push(["mic", mic]);
    items.push(["divider-floor", <Divider key="divider-floor" />]);
    // Nobody has a desk in the demo office, so there's no way back to one.
    if (!demo) items.push(["desk", <BackToDesk key="desk" />]);
    items.push(["here", <HereKey key="here" userId={userId} open={shown === "here"} onToggle={() => toggle("here")} label={demo ? tShell("yourOffice") : undefined} icon={demo ? <Office className="size-[18px]" /> : undefined} />]);
    if (inviteShown && onInvite)
      items.push([
        "invite",
        <button
          key="invite"
          type="button"
          onClick={onInvite}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {copied ? <Check className="size-4" /> : <UserPlus className="size-4" />}
          {inviteLabel}
        </button>,
      ]);
  }

  return (
    <div ref={box} className="absolute bottom-0 left-1/2 z-50 max-w-[calc(100%-2.5rem)] -translate-x-1/2 on-floor">
      <AnimatePresence>
        {!shown && (
          <motion.div key="rested" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
            <div className="absolute bottom-full left-1/2 mb-2.5 flex -translate-x-1/2 flex-col items-center gap-2">
              <MicMutedHint />
              <CameraRested />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={false}
        // Before the keys are measured, as wide as they are; after, sprung between their width and the panel's.
        animate={keys.width ? { width: (shown ? openWidth : keys.width) + BORDER, borderTopLeftRadius: shown ? 18 : 14, borderTopRightRadius: shown ? 18 : 14 } : undefined}
        transition={widthMove}
        style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundImage: FOOT }}
        className="relative max-w-full border border-b-0 border-edge bg-rail text-foreground [--face-ring:var(--ui-rail)]"
      >
        <Fillet edge="bottom" tab="right" className="-left-[13px] bottom-0" fade={FADE} />
        <Fillet edge="bottom" tab="left" className="-right-[13px] bottom-0" fade={FADE} />
        <div className="overflow-hidden rounded-[inherit]">
          {/* The panel's room, sprung to its height; the panel inside at its own width, centred, uncovered as the dock grows. */}
          <motion.div
            initial={false}
            animate={{ height: shown ? content.height : 0 }}
            transition={heightMove}
            onAnimationComplete={() => {
              if (shown) return rising && setRising(false);
              // Folded away: let it go, and start it afresh (nothing unfolded) for next time, while nothing moves.
              setHeld(null);
              setFresh((now) => now + 1);
            }}
            className="relative"
          >
            <div ref={contentRef} className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: openWidth }}>
              {/* Both panels are always there, hidden but for the one showing, so opening only uncovers one. */}
              {PANELS.map((which) => {
                const showing = held === which;
                return (
                  <motion.div
                    key={`${which}-${fresh}`}
                    hidden={!showing}
                    initial={false}
                    animate={
                      showing && shown
                        ? { opacity: 1, y: 0, transition: { duration: 0.18, delay: reduce ? 0 : riseDelay + 0.08, ease: EASE } }
                        : { opacity: 0, y: reduce ? 0 : 6, transition: { duration: showing ? 0.08 : 0 } }
                    }
                  >
                    {which === "you" ? (
                      <YouPanel onDone={done} />
                    ) : demo ? (
                      <DemoPanel onDone={done} />
                    ) : (
                      <HerePanel userId={userId} onInvite={onInvite} copied={copied} onDone={done} />
                    )}
                    <div aria-hidden className="mx-2 border-t border-border" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
          <div ref={keysRef} className="mx-auto flex w-max items-center gap-1 p-1.5 pb-2">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map(([id, node]) => (
                <motion.div
                  key={id}
                  layout="position"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={reduce ? { duration: 0 } : KEY_IN}
                  className="flex shrink-0 items-center"
                >
                  {node}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Back to your desk: walks you there and sits you down, from anywhere on the
 * floor. Without a desk it rests, and says how to get one; at it, it says so.
 */
function BackToDesk() {
  const tDesk = useTranslations("desk");
  const tYou = useTranslations("you");
  const { user } = useAuth();
  const { desks, seat } = useDesks();
  const mine = user ? deskOf(desks, user.id) : undefined;
  const there = !!mine && seat === mine.seat;
  const label = !mine ? `${tYou("noDeskTitle")}. ${tYou("noDesk")}` : there ? tYou("atDesk") : tDesk("goTo");
  return (
    <IconButton
      label={label}
      className={cn(KEY, (!mine || there) && "cursor-default opacity-40 hover:bg-transparent hover:text-muted-foreground")}
      aria-disabled={!mine || there}
      onClick={() => mine && !there && goToMyDesk()}
      icon={<Desk />}
    />
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}
