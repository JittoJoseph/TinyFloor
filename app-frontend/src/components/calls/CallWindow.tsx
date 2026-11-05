"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Mic, MicOff, PhoneOff, PictureInPicture, Video, VideoOff } from "web-shared/components/ui/icons";
import { FaceStack } from "web-shared/components/ui/Face";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useSpeaking } from "@/lib/useSpeaking";
import { usePrefs } from "@/lib/prefs";
import { pip } from "@/lib/pip";
import { useAuth } from "@/contexts/AuthContext";
import { usePlace } from "@/components/app/place";
import { useRouter } from "@/lib/i18n/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { bezel, onBezel } from "@/components/ui/bezel";
import { MeetingTile } from "@/components/meetings/MeetingTile";
import { clock, useElapsed, useMeetingName, useMyMeeting } from "@/components/meetings/hooks";
import { cn } from "web-shared/lib/utils";

/** Who the window shows big: their camera or shared screen when it comes, otherwise their circle. */
interface Seat {
  id: string;
  name: string;
  video: MediaStream | null;
  screen: boolean;
  speaking: boolean;
  micOff: boolean;
  connecting?: string;
}

/** What the window is about: one person, or a meeting with whoever is talking in front. */
interface Showing {
  title: string;
  since: number | null;
  seat: Seat | null;
  /** The meeting's other people, beside the one in front. */
  others: string[];
  leaveLabel: string;
  leave: () => void;
}

/**
 * Your call in a small card: whoever is talking (or sharing), the call's
 * name and how long it has gone on, and your camera in the corner while it's
 * on. It fills the small window that stays on top of other apps (`window`,
 * lib/pip), with the few things you might do there: mic, camera, hang up. On
 * the floor (`floor`) it's the meeting's card, pressed to go back to the
 * meeting; the bar below it has the controls already, so it only pops out.
 */
export function CallWindow({ variant }: { variant: "floor" | "window" }) {
  const t = useTranslations("controls");
  const showing = useShowing();
  const { localStream, cameraEnabled, micEnabled } = useCall();
  const { mirrorVideo } = usePrefs();
  const place = usePlace();
  const router = useRouter();
  const elapsed = useElapsed(showing?.since ?? null);
  const floor = variant === "floor";
  if (!showing) return null;

  // Back to the meeting itself; from the window, back to the tab is the browser's own button in its corner.
  const openStage = () => {
    if (floor && place.paths.meetings) router.push(place.paths.meetings);
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        // On the floor it's set in the dark, like the bar beside it; the window wears the app's own theme.
        floor ? cn(bezel, onBezel, "w-[13.5rem] rounded-[1.4rem] p-1 sm:w-[15.5rem]") : "size-full bg-background p-2",
      )}
    >
      <div
        role={floor ? "button" : undefined}
        tabIndex={floor ? 0 : undefined}
        onClick={openStage}
        onKeyDown={(event) => floor && (event.key === "Enter" || event.key === " ") && openStage()}
        aria-label={floor ? showing.title : undefined}
        className={cn(
          "relative overflow-hidden",
          floor ? "aspect-[16/10] cursor-pointer rounded-[1.1rem]" : "min-h-0 flex-1 rounded-[1.1rem]",
        )}
      >
        {showing.seat ? (
          <MeetingTile
            id={showing.seat.id}
            name={showing.seat.name}
            video={showing.seat.video}
            screen={showing.seat.screen}
            contain={showing.seat.screen}
            speaking={showing.seat.speaking}
            micOff={showing.seat.micOff}
            connecting={showing.seat.connecting}
            compact={floor}
            quiet
            className="size-full rounded-[inherit]"
          />
        ) : (
          <Alone />
        )}
        {cameraEnabled && localStream && <Mirror stream={localStream} mirror={mirrorVideo} small={floor} />}
      </div>

      <div className={cn("flex items-center gap-2", floor ? "py-1 pe-0.5 ps-2.5" : "px-1 pt-2")}>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1.5">
            {showing.others.length > 0 && <FaceStack seeds={showing.others} size={16} max={3} />}
            <span className="truncate text-[12.5px] font-medium text-foreground">{showing.title}</span>
          </p>
          {showing.since !== null && <p className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">{clock(elapsed)}</p>}
        </div>
        {floor ? (
          // On the floor the bar below has the mic, camera and the way out: the card only shows, and pops out.
          pip.supported && (
            <IconButton size="sm" label={t("popOut")} tone="ghost" onClick={() => void pip.open()} icon={<PictureInPicture />} className="[&_svg]:size-4" />
          )
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              bare
              size="sm"
              label={micEnabled ? t("muteMic") : t("unmuteMic")}
              tone={micEnabled ? "soft" : "off"}
              aria-pressed={!micEnabled}
              onClick={() => callManager.setMic(!micEnabled)}
              icon={micEnabled ? <Mic /> : <MicOff />}
              className="[&_svg]:size-4"
            />
            <IconButton
              bare
              size="sm"
              label={cameraEnabled ? t("cameraOff") : t("cameraOn")}
              tone={cameraEnabled ? "solid" : "soft"}
              aria-pressed={cameraEnabled}
              onClick={() => callManager.setCamera(!cameraEnabled)}
              icon={cameraEnabled ? <Video /> : <VideoOff />}
              className="[&_svg]:size-4"
            />
            <IconButton bare size="sm" label={showing.leaveLabel} tone="danger" onClick={showing.leave} icon={<PhoneOff />} className="w-11 [&_svg]:size-4" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Nobody else in the meeting yet. */
function Alone() {
  const t = useTranslations("meetings");
  const { user } = useAuth();
  if (!user) return null;
  return (
    <MeetingTile id={user.id} name={t("you")} video={null} speaking={false} micOff={false} caption={t("aloneShort")} compact className="size-full rounded-[inherit]" />
  );
}

/** Your own camera, small in the corner, as a mirror shows you. */
function Mirror({ stream, mirror, small }: { stream: MediaStream; mirror: boolean; small: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn(
        "pointer-events-none absolute bottom-2 end-2 aspect-video rounded-[0.6rem] object-cover shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)] ring-1 ring-foreground/15",
        small ? "w-[4.5rem]" : "w-[28%] min-w-20 max-w-36",
        mirror && "-scale-x-100",
      )}
    />
  );
}

/** The call you're on, or your meeting, as the window shows it; null when you're on neither. */
function useShowing(): Showing | null {
  const tc = useTranslations("controls");
  const tCall = useTranslations("call");
  const { user } = useAuth();
  const place = usePlace();
  const nameOf = useMeetingName();
  const meeting = useMyMeeting();
  const { peers, meetingPeers, stage } = useCall();
  const peer = peers[0];
  const speaking = useSpeaking(peer?.stream ?? null, !!peer?.mic && !!peer?.connected);

  if (meeting) {
    const focus = stage.focus;
    const member = focus ? meeting.members.find((one) => one.id === focus.id) : undefined;
    const them = focus ? meetingPeers.find((one) => one.id === focus.id) : undefined;
    const screen = focus?.kind === "screen";
    const received = focus ? stage.videos.some((video) => video.userId === focus.id && video.kind === focus.kind) : false;
    return {
      title: nameOf(meeting, place.name),
      since: meeting.startedAt,
      seat:
        focus && member
          ? {
              id: screen ? `${focus.id}-screen` : focus.id,
              name: member.name,
              video: screen ? (them?.screenStream ?? null) : received && them?.cameraOn ? them.camera : null,
              screen,
              speaking: !screen && member.speaking,
              micOff: !screen && !!them && !them.mic,
              connecting: !screen && them?.mic && !them.audio ? tCall("connecting") : undefined,
            }
          : null,
      others: meeting.members.filter((one) => one.id !== user?.id && one.id !== focus?.id).map((one) => one.id),
      leaveLabel: tc("leaveMeeting"),
      leave: () => callManager.leaveMeeting(),
    };
  }

  if (peer) {
    const screen = peer.screen && !!peer.screenStream;
    return {
      // Their name is on their picture already.
      title: tCall("onCall"),
      since: peer.since ?? null,
      seat: {
        id: screen ? `${peer.id}-screen` : peer.id,
        name: peer.name,
        video: screen ? peer.screenStream : peer.camera ? peer.stream : null,
        screen,
        speaking: !screen && speaking,
        micOff: !screen && !peer.mic,
        connecting: peer.connected ? undefined : tCall("connecting"),
      },
      others: [],
      leaveLabel: tc("leaveCall"),
      leave: () => callManager.hangUp(),
    };
  }
  return null;
}
