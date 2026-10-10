"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, UserPlus, Users, Video, VideoOff } from "@/components/ui/icons";
import type { MeetingInfo, MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/lib/prefs";
import { SPRING_LAYOUT } from "@/lib/ease";
import { IconButton } from "@/components/ui/IconButton";
import { FaceStack } from "@/components/ui/Face";
import { bezel, onBezel } from "@/components/ui/bezel";
import { cn } from "@/lib/utils";
import { MeetingTile } from "./MeetingTile";
import { MeetingPeople } from "./MeetingPeople";
import { clock, useElapsed, useMeetingName } from "./hooks";
import { VideoPausedNote } from "./MeetingHours";

const GAP = 12;
/** Cards are video-shaped, whether there's video in them or a face. */
const ASPECT = 16 / 9;
/** Cards in the column beside the big one: you, others, and "n others". */
const COLUMN = 4;
/** Cards in the strip under the big one on a phone. */
const STRIP = 3;
/** The people panel's width, with the gap before it. */
const PANEL = 320 + GAP;

/** The size of a box, as it changes. */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}

interface Size {
  width: number;
  height: number;
}

/**
 * Where the cards go. With people on the stage they sit inset, a composed
 * group in the middle with room around it: the big card and, beside it, a
 * column exactly as tall. With a screen on the stage (and, later, the
 * whiteboard) the content needs the room, so the big card takes all of it
 * and the column runs down the side. On a phone the column is a strip under.
 */
function arrange(area: Size, { narrow, content, alone }: { narrow: boolean; content: boolean; alone: boolean }): { big: Size; card: Size } {
  const { width, height } = area;
  if (narrow) {
    const cardWidth = (width - (STRIP - 1) * GAP) / STRIP;
    const card = { width: cardWidth, height: cardWidth / ASPECT };
    const room = height - (alone ? 0 : card.height + GAP);
    const big = content ? { width, height: room } : { width, height: Math.min(room, width / ASPECT, height * 0.62) };
    return { big, card };
  }
  if (content) {
    const side = Math.round(Math.min(272, Math.max(168, ((height - (COLUMN - 1) * GAP) / COLUMN) * ASPECT)));
    return { big: { width: width - GAP - side, height }, card: { width: side, height: side / ASPECT } };
  }
  if (alone) {
    const h = Math.min(height * 0.78, (width * 0.68) / ASPECT, 560);
    return { big: { width: h * ASPECT, height: h }, card: { width: 0, height: 0 } };
  }
  // The big card's height h, with a column of COLUMN cards exactly as tall beside it:
  // h·A + GAP + ((h − 3·GAP) / 4)·A must fit 86% of the width.
  const fromWidth = (width * 0.86 - GAP + ((COLUMN - 1) * GAP * ASPECT) / COLUMN) / (ASPECT * (1 + 1 / COLUMN));
  const h = Math.max(160, Math.min(fromWidth, height * 0.8, 600));
  const cardHeight = (h - (COLUMN - 1) * GAP) / COLUMN;
  return { big: { width: h * ASPECT, height: h }, card: { width: cardHeight * ASPECT, height: cardHeight } };
}

/**
 * Inside a meeting (docs/12-meetings.md), laid out like Meet's spotlight: one
 * big card, and a column of small ones beside it (a strip under it on a phone).
 * The big card is what matters now: what you pinned, a shared screen, or
 * whoever is talking. The column is you, the people who spoke last, and how
 * many more are here. So only a handful of videos are ever received, however
 * big the meeting (meetingStage chooses them), and yours never is. Cards glide
 * to their new places as the stage changes, and the people panel slides in
 * beside it, the stage making room.
 *
 * Under the stage, one bar: the time and the meeting on the left, the
 * controls in the middle, the people in it on the right, which is also the
 * one way to ask more in.
 */
export function MeetingStage({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const { mirrorVideo } = usePrefs();
  const reduce = useReducedMotion();
  const { meetingPeers, stage, localStream, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  const nameOf = useMeetingName();
  const elapsed = useElapsed(meeting.startedAt);
  const [people, setPeople] = useState(false);
  const [areaRef, area] = useBox<HTMLDivElement>();
  const narrow = area.width > 0 && area.width < 640;
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
  const glide = reduce ? { duration: 0 } : SPRING_LAYOUT;

  // The stage wants its cards' video; leaving it, the floor's card wants one small.
  useEffect(() => {
    callManager.setStageMode("stage");
    return () => callManager.setStageMode("mini");
  }, []);

  const peers = new Map(meetingPeers.map((peer) => [peer.id, peer]));
  const member = new Map(meeting.members.map((one) => [one.id, one]));
  const me = user ? member.get(user.id) : undefined;
  const alone = !stage.focus;
  const content = stage.focus?.kind === "screen";
  const title = nameOf(meeting, office);
  const { big: bigSize, card: cardSize } = arrange(area, { narrow, content, alone });

  // Someone's card: their camera when it's on and received, else their circle.
  const person = (one: MeetingPerson, { compact = false, contain = false }: { compact?: boolean; contain?: boolean } = {}) => {
    const peer = peers.get(one.id);
    const isPinned = stage.pinned?.kind === "camera" && stage.pinned.id === one.id;
    const received = stage.videos.some((video) => video.userId === one.id && video.kind === "camera");
    return (
      <MeetingTile
        id={one.id}
        name={one.name}
        video={received && peer?.cameraOn ? peer.camera : null}
        speaking={one.speaking}
        micOff={!!peer && !peer.mic}
        compact={compact}
        contain={contain}
        className="size-full"
        pin={{
          pinned: isPinned,
          label: isPinned ? t("unpin") : t("pin"),
          onToggle: () => callManager.setPin(isPinned ? null : { id: one.id, kind: "camera" }),
        }}
      />
    );
  };

  // Your own card, from your own camera: nothing to receive, and nothing to pin.
  const mine = (compact: boolean, caption?: string) =>
    me ? (
      <MeetingTile
        id={me.id}
        name={t("you")}
        video={cameraEnabled ? localStream : null}
        speaking={me.speaking}
        micOff={!micEnabled}
        mirror={mirrorVideo}
        compact={compact}
        caption={caption}
        className="size-full"
      />
    ) : null;

  const focus = stage.focus;
  const focusKey = focus ? `${focus.kind}:${focus.id}` : "me";
  const big = (): ReactNode => {
    if (!focus) return mine(false, t("aloneShort"));
    const one = member.get(focus.id);
    if (focus.kind === "screen") {
      const isPinned = stage.pinned?.kind === "screen" && stage.pinned.id === focus.id;
      return (
        <MeetingTile
          id={`${focus.id}-screen`}
          name={t("screenOf", { name: one?.name ?? "" })}
          video={peers.get(focus.id)?.screenStream ?? null}
          speaking={false}
          micOff={false}
          screen
          className="size-full"
          pin={{
            pinned: isPinned,
            label: isPinned ? t("unpin") : t("pin"),
            onToggle: () => callManager.setPin(isPinned ? null : { id: focus.id, kind: "screen" }),
          }}
        />
      );
    }
    return one ? person(one, { contain: true }) : null;
  };

  // The column: you first, the people who spoke last, then "n others".
  const side = stage.side.flatMap((id) => {
    const one = member.get(id);
    return one ? [one] : [];
  });
  const slots = narrow ? STRIP : COLUMN;
  const shownSide = side.slice(0, slots - 1 - (stage.more ? 1 : 0));
  const hidden = stage.more + side.length - shownSide.length;
  const hiddenFaces = meeting.members.filter(
    (one) => one.id !== user?.id && one.id !== focus?.id && !shownSide.some((shown) => shown.id === one.id),
  );
  const cards: Array<{ key: string; node: ReactNode }> = alone
    ? []
    : [
        { key: "me", node: mine(true) },
        ...shownSide.map((one) => ({ key: one.id, node: person(one, { compact: true }) })),
        ...(hidden > 0
          ? [
              {
                key: "others",
                node: (
                  <button
                    type="button"
                    onClick={() => setPeople(true)}
                    className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-[color-mix(in_oklab,var(--ui-muted)_85%,var(--ui-background))] text-muted-foreground ring-1 ring-inset ring-foreground/[0.06] transition-colors hover:text-foreground [--face-ring:var(--ui-muted)]"
                  >
                    <FaceStack seeds={hiddenFaces.map((one) => one.id)} size={narrow ? 20 : 24} max={3} more={false} />
                    <span className="text-[12.5px] font-medium">{t("others", { count: hidden })}</span>
                  </button>
                ),
              },
            ]
          : []),
      ];

  const stageView = (
    <div className="flex size-full items-center justify-center">
      <div className={cn("flex", narrow ? "flex-col items-center" : "flex-row items-start")} style={{ gap: GAP }}>
        <motion.div initial={false} animate={{ width: bigSize.width, height: bigSize.height }} transition={glide} className="relative shrink-0">
          {/* Who the big card shows changes with a quick crossfade, not a cut. */}
          <AnimatePresence initial={false}>
            <motion.div
              key={focusKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.22 }}
              className="absolute inset-0"
            >
              {big()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {cards.length > 0 && (
          <div className={cn("flex shrink-0", narrow ? "flex-row" : "flex-col")} style={{ gap: GAP }}>
            <AnimatePresence initial={false} mode="popLayout">
              {cards.map((card) => (
                <motion.div
                  key={card.key}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1, width: cardSize.width, height: cardSize.height }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={glide}
                  className="shrink-0"
                >
                  {card.node}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-background">
      {/* On a phone the bar has no room for which meeting and how long, so they sit above. */}
      <p className="flex items-center gap-2 px-4 pt-3 text-[13px] sm:hidden">
        <span className="font-medium tabular-nums text-foreground">{clock(elapsed)}</span>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <span className="truncate text-muted-foreground">{title}</span>
      </p>

      <div className="relative flex min-h-0 flex-1 px-3 pt-3 sm:px-5 sm:pt-5">
        <div ref={areaRef} className="relative min-h-0 min-w-0 flex-1">
          {area.width > 0 && stageView}
          <VideoPausedNote compact className="absolute inset-x-0 top-0 z-10 mx-auto w-fit max-w-[calc(100%-1.5rem)]" />
        </div>
        {/* The people, beside the stage: it slides open and the stage makes room. */}
        <AnimatePresence initial={false}>
          {people && (
            <motion.div
              key="people"
              initial={narrow ? { opacity: 0, y: 16 } : { width: 0, opacity: 0 }}
              animate={narrow ? { opacity: 1, y: 0 } : { width: PANEL, opacity: 1 }}
              exit={narrow ? { opacity: 0, y: 16 } : { width: 0, opacity: 0 }}
              transition={glide}
              className={cn(narrow ? "absolute inset-3 z-20" : "shrink-0 overflow-hidden")}
            >
              <MeetingPeople meeting={meeting} onClose={() => setPeople(false)} className={cn("h-full", !narrow && "ms-3 w-80")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative flex items-center justify-center gap-3 px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 sm:px-5">
        <p className="absolute start-5 hidden max-w-[calc(50%-14rem)] items-center gap-3 text-[14px] lg:flex">
          <span className="font-medium tabular-nums text-foreground">{clock(elapsed)}</span>
          <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
          <span className="truncate text-muted-foreground">{title}</span>
        </p>

        <div className={cn(bezel, onBezel, "flex items-center gap-1.5 rounded-full p-1.5 [&_button_svg]:size-5")}>
          <IconButton
            label={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
            tone={micEnabled ? "soft" : "danger"}
            size="lg"
            aria-pressed={!micEnabled}
            onClick={() => callManager.setMic(!micEnabled)}
            icon={micEnabled ? <Mic /> : <MicOff />}
          />
          {/* The camera off is the ordinary state, drawn like the rest; on, it lights up. */}
          <IconButton
            label={cameraEnabled ? tControls("cameraOff") : tControls("cameraOn")}
            tone={cameraEnabled ? "solid" : "soft"}
            size="lg"
            aria-pressed={cameraEnabled}
            onClick={() => callManager.setCamera(!cameraEnabled)}
            icon={cameraEnabled ? <Video /> : <VideoOff />}
          />
          {canShareScreen && (
            <IconButton
              label={screenStream ? tControls("stopSharing") : tControls("shareScreen")}
              tone={screenStream ? "solid" : "soft"}
              size="lg"
              aria-pressed={!!screenStream}
              onClick={() => callManager.setScreen(!screenStream)}
              icon={screenStream ? <MonitorX /> : <MonitorUp />}
              className="max-sm:hidden"
            />
          )}
          <IconButton
            label={speakerEnabled ? tControls("muteSpeaker") : tControls("unmuteSpeaker")}
            tone={speakerEnabled ? "soft" : "off"}
            size="lg"
            aria-pressed={!speakerEnabled}
            onClick={() => callManager.setSpeaker(!speakerEnabled)}
            icon={speakerEnabled ? <Headphones /> : <HeadphoneOff />}
          />
          {/* On a phone, the people sit in the bar; on a computer, at its end. */}
          <IconButton
            label={alone ? t("invite") : t("inMeeting")}
            tone={people ? "solid" : "soft"}
            size="lg"
            aria-pressed={people}
            onClick={() => setPeople((open) => !open)}
            icon={alone ? <UserPlus /> : <Users />}
            className="lg:hidden"
          />
          <button
            type="button"
            onClick={() => callManager.leaveMeeting()}
            aria-label={t("leave")}
            title={t("leave")}
            className="ms-1 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-destructive px-5 text-white outline-none transition-[background-color,transform] hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/50 active:scale-[0.97]"
          >
            <PhoneOff />
          </button>
        </div>

        {/* Who's here, and the one way to ask more in: alone, it says so. */}
        <button
          type="button"
          onClick={() => setPeople((open) => !open)}
          aria-pressed={people}
          className={cn(
            "absolute end-5 hidden h-11 cursor-pointer items-center gap-2.5 rounded-full border px-3 text-[13.5px] font-medium transition-colors lg:flex [--face-ring:var(--ui-background)]",
            people ? "border-foreground/20 bg-muted text-foreground" : "border-border text-foreground hover:bg-muted",
          )}
        >
          {alone ? (
            <>
              <UserPlus className="size-[18px]" />
              {t("invite")}
            </>
          ) : (
            <>
              <FaceStack seeds={meeting.members.map((one) => one.id)} size={24} max={3} more={false} />
              <span className="tabular-nums">{meeting.members.length}</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
