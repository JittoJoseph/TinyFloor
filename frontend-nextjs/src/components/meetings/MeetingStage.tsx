"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, UserPlus, Video, VideoOff } from "@/components/ui/icons";
import type { MeetingInfo, MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/lib/prefs";
import { IconButton } from "@/components/ui/IconButton";
import { FaceStack } from "@/components/ui/Face";
import { Button } from "@/components/motion/button/base";
import { cn } from "@/lib/utils";
import { MeetingTile } from "./MeetingTile";
import { InviteDialog } from "./MeetingDialogs";
import { clock, useElapsed, useMeetingName } from "./hooks";
import { VideoPausedNote } from "./MeetingHours";

const GAP = 12;
/** Tiles the stage shows before the rest fold into "+ n more". */
const MOST_TILES = { wide: 12, narrow: 6 };

/** Columns for this many tiles: a single speaker fills the stage, four make a square. */
function columnsFor(count: number, narrow: boolean): number {
  if (narrow) return count <= 2 ? 1 : 2;
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

/** The size of a box, as it changes. */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}

/**
 * Inside a meeting: the people in it, the speakers' video, a shared screen
 * when there is one, and the controls. Only the four most recent speakers'
 * cameras are received (meetingStage); everyone else is their face, which
 * costs nothing to show.
 */
export function MeetingStage({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const { mirrorVideo } = usePrefs();
  const { meetingPeers, stage, localStream, micEnabled, cameraEnabled, speakerEnabled, screenStream, alone } = useCall();
  const nameOf = useMeetingName();
  const elapsed = useElapsed(meeting.startedAt);
  const [inviting, setInviting] = useState(false);
  const [areaRef, area] = useBox<HTMLDivElement>();
  const narrow = area.width > 0 && area.width < 640;
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // The stage wants the speakers' video; leaving it, the floor's card wants one small.
  useEffect(() => {
    callManager.setStageMode("stage");
    return () => callManager.setStageMode("mini");
  }, []);

  const peers = new Map(meetingPeers.map((peer) => [peer.id, peer]));
  const me = meeting.members.find((member) => member.id === user?.id);
  const others = meeting.members.filter((member) => member.id !== user?.id);
  const onCamera = stage.cameras.flatMap((id) => others.filter((member) => member.id === id));
  // The rest by who spoke last, so the people talking stay near the front.
  const rest = others
    .filter((member) => !stage.cameras.includes(member.id))
    .sort((a, b) => Number(b.speaking) - Number(a.speaking) || a.since - b.since);
  const ordered = [...onCamera, ...rest];

  const sharer = stage.screen ? peers.get(stage.screen) : undefined;
  const sharerName = others.find((member) => member.id === stage.screen)?.name ?? "";
  const most = narrow ? MOST_TILES.narrow : MOST_TILES.wide;
  const shown = sharer ? ordered.slice(0, narrow ? 2 : 4) : ordered.slice(0, ordered.length > most ? most - 1 : most);
  const hidden = ordered.slice(shown.length);

  const tile = (member: MeetingPerson, compact = false, className?: string, width?: number) => {
    const peer = peers.get(member.id);
    const video = stage.cameras.includes(member.id) && peer?.cameraOn ? peer.camera : null;
    return (
      <MeetingTile
        key={member.id}
        id={member.id}
        name={member.name}
        video={video}
        speaking={member.speaking}
        micOff={!!peer && !peer.mic}
        compact={compact}
        className={className}
        style={width ? { width } : undefined}
      />
    );
  };

  const count = shown.length + (hidden.length ? 1 : 0);
  const cols = columnsFor(Math.max(count, 1), narrow);
  const rows = Math.ceil(Math.max(count, 1) / cols);
  const tileWidth = Math.max(
    120,
    Math.min((area.width - (cols - 1) * GAP) / cols, ((area.height - (rows - 1) * GAP) / rows) * (16 / 9)),
  );

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3 sm:px-6 sm:pt-4">
        <span className="relative flex size-2.5 shrink-0" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-ok/60 [animation-duration:2s] motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full bg-ok" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-[15px] font-semibold text-foreground">{nameOf(meeting, office)}</h1>
          <p className="text-[12px] tabular-nums text-muted-foreground">
            {clock(elapsed)} · {t("people", { count: meeting.members.length })}
          </p>
        </div>
        <span className="hidden sm:flex [--face-ring:var(--ui-background)]">
          <FaceStack seeds={meeting.members.map((member) => member.id)} size={24} max={5} />
        </span>
        <Button size="sm" variant="secondary" className="h-9 gap-1.5 px-3.5 text-[13px]" onClick={() => setInviting(true)}>
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">{t("invite")}</span>
        </Button>
      </header>
      <VideoPausedNote compact className="mx-auto mb-2 w-fit max-w-[calc(100%-1.5rem)]" />

      <div ref={areaRef} className="relative min-h-0 flex-1 mx-3 mb-2 sm:mx-6">
        {sharer ? (
          <div className={cn("flex size-full gap-3", narrow ? "flex-col" : "flex-row")}>
            <MeetingTile
              id={`${sharer.id}-screen`}
              name={t("screenOf", { name: sharerName })}
              video={sharer.screenStream}
              speaking={false}
              micOff={false}
              screen
              className="min-h-0 min-w-0 flex-1"
            />
            <div className={cn("flex shrink-0 gap-3", narrow ? "h-24 flex-row" : "w-56 flex-col")}>
              {shown.map((member) => tile(member, true, narrow ? "h-full aspect-video" : "w-full aspect-video"))}
            </div>
          </div>
        ) : alone ? (
          <Alone onInvite={() => setInviting(true)} />
        ) : (
          <div className="flex size-full flex-wrap content-center items-center justify-center" style={{ gap: GAP }}>
            {shown.map((member) => tile(member, false, "aspect-video shrink-0", tileWidth))}
            {hidden.length > 0 && (
              <div
                className="flex aspect-video shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground [--face-ring:var(--ui-muted)]"
                style={{ width: tileWidth }}
              >
                <FaceStack seeds={hidden.map((member) => member.id)} size={32} max={4} />
                <span className="text-[13px] font-medium">{t("more", { count: hidden.length })}</span>
              </div>
            )}
          </div>
        )}
        {/* You, in the corner: your camera is shown from your own device, which costs nothing. */}
        {me && (
          <div className="absolute bottom-3 end-3 z-10 w-32 overflow-hidden rounded-xl shadow-float ring-1 ring-black/10 sm:w-48">
            <MeetingTile
              id={me.id}
              name={t("you")}
              video={cameraEnabled ? localStream : null}
              speaking={me.speaking}
              micOff={!micEnabled}
              mirror={mirrorVideo}
              compact
              className="aspect-video w-full"
            />
          </div>
        )}
      </div>

      <footer className="flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:pb-4">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-float">
          <IconButton
            label={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
            tone={micEnabled ? "soft" : "off"}
            size="lg"
            aria-pressed={!micEnabled}
            onClick={() => callManager.setMic(!micEnabled)}
            icon={micEnabled ? <Mic /> : <MicOff />}
          />
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
            />
          )}
          <IconButton
            label={speakerEnabled ? tControls("muteSpeaker") : tControls("unmuteSpeaker")}
            tone={speakerEnabled ? "ghost" : "off"}
            size="lg"
            aria-pressed={!speakerEnabled}
            onClick={() => callManager.setSpeaker(!speakerEnabled)}
            icon={speakerEnabled ? <Headphones /> : <HeadphoneOff />}
          />
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => callManager.leaveMeeting()}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-destructive px-4 text-[14px] font-semibold text-white outline-none transition-[background-color,transform] hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/50 active:scale-[0.97]"
          >
            <PhoneOff className="size-4" />
            {t("leave")}
          </button>
        </div>
      </footer>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} meeting={meeting.id} />
    </div>
  );
}

/** Alone in a meeting: the way to bring people in. */
function Alone({ onInvite }: { onInvite: () => void }) {
  const t = useTranslations("meetings");
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-[15px] font-medium text-muted-foreground">{t("aloneTitle")}</p>
      <Button size="sm" variant="secondary" className="h-10 gap-2 px-4 text-[13px]" onClick={onInvite}>
        <UserPlus className="size-4" />
        {t("invite")}
      </Button>
    </div>
  );
}
