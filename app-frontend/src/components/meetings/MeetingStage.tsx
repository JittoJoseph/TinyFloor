"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  UserPlus,
  Users,
  Video,
  VideoOff,
} from "@/components/ui/icons";
import type { MeetingInfo, MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/lib/prefs";
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
/** Cards in the column beside the big one, at most: you, others, and "+ n more". */
const COLUMN = 4;
/** Cards in the strip under the big one on a phone. */
const STRIP = 3;

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

/**
 * Inside a meeting (docs/12-meetings.md), laid out like Meet's spotlight: one
 * big card, and a column of small ones beside it (a strip under it on a phone).
 * The big card is what matters now: what you pinned, a shared screen, or
 * whoever is talking. The column is you, the people who spoke last, and how
 * many more are here. So only a handful of videos are ever received, however
 * big the meeting (meetingStage chooses them), and yours never is.
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
  const { meetingPeers, stage, localStream, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  const nameOf = useMeetingName();
  const elapsed = useElapsed(meeting.startedAt);
  const [people, setPeople] = useState(false);
  const [areaRef, area] = useBox<HTMLDivElement>();
  const narrow = area.width > 0 && area.width < 640;
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // The stage wants its cards' video; leaving it, the floor's card wants one small.
  useEffect(() => {
    callManager.setStageMode("stage");
    return () => callManager.setStageMode("mini");
  }, []);

  const peers = new Map(meetingPeers.map((peer) => [peer.id, peer]));
  const member = new Map(meeting.members.map((one) => [one.id, one]));
  const me = user ? member.get(user.id) : undefined;
  const alone = !stage.focus;
  const title = nameOf(meeting, office);

  // Someone's card: their camera when it's on and received, else their circle.
  const person = (
    one: MeetingPerson,
    { compact = false, className, contain = false }: { compact?: boolean; className?: string; contain?: boolean } = {},
  ) => {
    const peer = peers.get(one.id);
    const isPinned = stage.pinned?.kind === "camera" && stage.pinned.id === one.id;
    const received = stage.videos.some((video) => video.userId === one.id && video.kind === "camera");
    return (
      <MeetingTile
        key={one.id}
        id={one.id}
        name={one.name}
        video={received && peer?.cameraOn ? peer.camera : null}
        speaking={one.speaking}
        micOff={!!peer && !peer.mic}
        compact={compact}
        contain={contain}
        className={className}
        pin={{
          pinned: isPinned,
          label: isPinned ? t("unpin") : t("pin"),
          onToggle: () => callManager.setPin(isPinned ? null : { id: one.id, kind: "camera" }),
        }}
      />
    );
  };

  // Your own card, from your own camera: nothing to receive, and nothing to pin.
  const mine = (className: string, compact: boolean, caption?: string) =>
    me && (
      <MeetingTile
        key="me"
        id={me.id}
        name={t("you")}
        video={cameraEnabled ? localStream : null}
        speaking={me.speaking}
        micOff={!micEnabled}
        mirror={mirrorVideo}
        compact={compact}
        caption={caption}
        className={className}
      />
    );

  const big = () => {
    const focus = stage.focus;
    if (!focus) return mine("size-full", false, t("aloneShort"));
    const one = member.get(focus.id);
    if (focus.kind === "screen") {
      const isPinned = stage.pinned?.kind === "screen" && stage.pinned.id === focus.id;
      return (
        <MeetingTile
          key={`${focus.id}-screen`}
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
    return one ? person(one, { className: "size-full", contain: true }) : null;
  };

  // The column's cards: you first, the people who spoke last, then "+ n more".
  const side = stage.side.flatMap((id) => {
    const one = member.get(id);
    return one ? [one] : [];
  });
  const slots = narrow ? STRIP : COLUMN;
  const cardWidth = narrow
    ? (area.width - (STRIP - 1) * GAP) / STRIP
    : Math.round(Math.min(272, Math.max(168, ((area.height - (COLUMN - 1) * GAP) / COLUMN) * ASPECT)));
  const shownSide = side.slice(0, slots - 1 - (stage.more ? 1 : 0));
  const hidden = stage.more + side.length - shownSide.length;
  const hiddenFaces = meeting.members.filter(
    (one) => one.id !== user?.id && one.id !== stage.focus?.id && !shownSide.some((s) => s.id === one.id),
  );

  const stageView = () => {
    if (alone) return <div className="size-full">{big()}</div>;
    const card = "aspect-video w-full shrink-0";
    return (
      <div className={cn("flex size-full", narrow ? "flex-col" : "flex-row")} style={{ gap: GAP }}>
        <div className="min-h-0 min-w-0 flex-1">{big()}</div>
        <div
          className={cn("flex shrink-0", narrow ? "flex-row" : "flex-col")}
          style={{ gap: GAP, ...(narrow ? { height: cardWidth / ASPECT } : { width: cardWidth }) }}
        >
          {mine(narrow ? "aspect-video h-full shrink-0" : card, true)}
          {shownSide.map((one) => person(one, { compact: true, className: narrow ? "aspect-video h-full shrink-0" : card }))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setPeople(true)}
              className={cn(
                "flex shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl bg-[color-mix(in_oklab,var(--ui-muted)_85%,var(--ui-background))] text-muted-foreground ring-1 ring-inset ring-foreground/[0.06] transition-colors hover:text-foreground [--face-ring:var(--ui-muted)]",
                narrow ? "aspect-video h-full" : card,
              )}
            >
              <FaceStack seeds={hiddenFaces.map((one) => one.id)} size={narrow ? 20 : 26} max={3} more={false} />
              <span className="text-[12.5px] font-medium">{t("others", { count: hidden })}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const control = "[&_svg]:size-5";
  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-background">
      {/* On a phone the bar has no room for which meeting and how long, so they sit above. */}
      <p className="flex items-center gap-2 px-4 pt-3 text-[13px] sm:hidden">
        <span className="font-medium tabular-nums text-foreground">{clock(elapsed)}</span>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <span className="truncate text-muted-foreground">{title}</span>
      </p>

      <div className="relative flex min-h-0 flex-1 gap-3 px-3 pt-3 sm:px-5 sm:pt-5">
        <div ref={areaRef} className="relative min-h-0 min-w-0 flex-1">
          {area.width > 0 && stageView()}
          <VideoPausedNote compact className="absolute inset-x-0 top-3 z-10 mx-auto w-fit max-w-[calc(100%-1.5rem)]" />
        </div>
        {people && (
          <MeetingPeople
            meeting={meeting}
            onClose={() => setPeople(false)}
            className={cn("max-md:absolute max-md:inset-3 max-md:z-20 md:w-80 md:shrink-0")}
          />
        )}
      </div>

      <footer className="relative flex items-center justify-center gap-3 px-3 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 sm:px-5">
        <p className="absolute start-5 hidden max-w-[calc(50%-13rem)] items-center gap-3 text-[14px] lg:flex">
          <span className="font-medium tabular-nums text-foreground">{clock(elapsed)}</span>
          <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
          <span className="truncate text-muted-foreground">{title}</span>
        </p>

        <div className={cn(bezel, onBezel, "flex items-center gap-1.5 rounded-full p-1.5")}>
          <IconButton
            label={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
            tone={micEnabled ? "soft" : "danger"}
            size="lg"
            aria-pressed={!micEnabled}
            onClick={() => callManager.setMic(!micEnabled)}
            icon={micEnabled ? <Mic /> : <MicOff />}
            className={control}
          />
          <IconButton
            label={cameraEnabled ? tControls("cameraOff") : tControls("cameraOn")}
            tone={cameraEnabled ? "soft" : "danger"}
            size="lg"
            aria-pressed={!cameraEnabled}
            onClick={() => callManager.setCamera(!cameraEnabled)}
            icon={cameraEnabled ? <Video /> : <VideoOff />}
            className={control}
          />
          {canShareScreen && (
            <IconButton
              label={screenStream ? tControls("stopSharing") : tControls("shareScreen")}
              tone={screenStream ? "solid" : "soft"}
              size="lg"
              aria-pressed={!!screenStream}
              onClick={() => callManager.setScreen(!screenStream)}
              icon={screenStream ? <MonitorX /> : <MonitorUp />}
              className={cn(control, "max-sm:hidden")}
            />
          )}
          <IconButton
            label={speakerEnabled ? tControls("muteSpeaker") : tControls("unmuteSpeaker")}
            tone={speakerEnabled ? "soft" : "danger"}
            size="lg"
            aria-pressed={!speakerEnabled}
            onClick={() => callManager.setSpeaker(!speakerEnabled)}
            icon={speakerEnabled ? <Headphones /> : <HeadphoneOff />}
            className={control}
          />
          {/* On a phone, the people sit in the bar; on a computer, at its end. */}
          <IconButton
            label={alone ? t("invite") : t("inMeeting")}
            tone={people ? "solid" : "soft"}
            size="lg"
            aria-pressed={people}
            onClick={() => setPeople((open) => !open)}
            icon={alone ? <UserPlus /> : <Users />}
            className={cn(control, "lg:hidden")}
          />
          <button
            type="button"
            onClick={() => callManager.leaveMeeting()}
            aria-label={t("leave")}
            title={t("leave")}
            className="ms-1 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-destructive px-5 text-white outline-none transition-[background-color,transform] hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/50 active:scale-[0.97] [&_svg]:size-5"
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
