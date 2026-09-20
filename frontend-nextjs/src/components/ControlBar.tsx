"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  MessageSquare,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { StatusSelector } from "./StatusSelector";
import { Badge, Divider, RoomIconButton, surface } from "./room/ui";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import type { PlayerStatus } from "@/lib/types";

interface ControlBarProps {
  onSettingsClick?: () => void;
  onChatClick?: () => void;
  onStatusChange?: (status: PlayerStatus) => void;
  currentStatus?: PlayerStatus;
  unreadChatCount?: number;
}

/** A dot in the corner of a button that is off, so it reads at a glance. */
const OffMark = () => (
  <span className="absolute -top-0.5 -end-0.5 w-2 h-2 rounded-full bg-[var(--color-braun-orange)] border border-white" />
);

/**
 * The bar along the bottom: who you are to the room, then your microphone and
 * camera, then the ways to talk. Phones get the same buttons minus the ones
 * that only matter on a desktop, so the row never runs out of room.
 */
export default function ControlBar({
  onSettingsClick,
  onChatClick,
  onStatusChange,
  currentStatus = "available",
  unreadChatCount = 0,
}: ControlBarProps) {
  const t = useTranslations("controls");
  const { peers, meeting, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  const isInCall = peers.length > 0 || !!meeting;
  // Phones and some browsers cannot share a screen, so the button only exists where it works.
  const canShareScreen =
    isInCall && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
  const [status, setStatus] = useState<PlayerStatus>(currentStatus);

  // Follow the status from outside, and switch to "in call" and back as calls
  // start and end, adjusting during render rather than in an effect.
  const [seenStatus, setSeenStatus] = useState(currentStatus);
  if (currentStatus !== seenStatus) {
    setSeenStatus(currentStatus);
    setStatus(currentStatus);
  }
  const [seenInCall, setSeenInCall] = useState(isInCall);
  if (isInCall !== seenInCall) {
    setSeenInCall(isInCall);
    setStatus(isInCall ? "in_call" : "available");
  }

  // Tell the room when a call starts or ends.
  const wasInCall = useRef(isInCall);
  useEffect(() => {
    if (wasInCall.current === isInCall) return;
    wasInCall.current = isInCall;
    onStatusChange?.(isInCall ? "in_call" : "available");
  }, [isInCall, onStatusChange]);

  const toggleMic = useCallback(() => callManager.setMic(!micEnabled), [micEnabled]);
  const toggleVideo = useCallback(() => callManager.setCamera(!cameraEnabled), [cameraEnabled]);
  const toggleSpeaker = useCallback(() => callManager.setSpeaker(!speakerEnabled), [speakerEnabled]);

  const handleStatusChange = useCallback(
    (newStatus: PlayerStatus) => {
      // During a call the status stays "in call".
      if (isInCall) return;
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [isInCall, onStatusChange],
  );

  return (
    <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100%-1.5rem)]">
      <div className={`${surface} rounded-full px-2 py-2 flex items-center gap-1.5 sm:gap-2`}>
        <StatusSelector currentStatus={status} onStatusChange={handleStatusChange} />

        <Divider />

        <RoomIconButton
          onClick={toggleMic}
          tone={micEnabled ? "quiet" : "alert"}
          title={micEnabled ? t("muteMic") : t("unmuteMic")}
          aria-pressed={!micEnabled}
          icon={micEnabled ? <Mic className="w-[18px] h-[18px]" /> : <MicOff className="w-[18px] h-[18px]" />}
          mark={micEnabled ? undefined : <OffMark />}
        />

        <RoomIconButton
          onClick={toggleVideo}
          tone={cameraEnabled ? "quiet" : "alert"}
          title={cameraEnabled ? t("cameraOff") : t("cameraOn")}
          aria-pressed={!cameraEnabled}
          icon={
            cameraEnabled ? <Video className="w-[18px] h-[18px]" /> : <VideoOff className="w-[18px] h-[18px]" />
          }
          mark={cameraEnabled ? undefined : <OffMark />}
        />

        {canShareScreen && (
          <RoomIconButton
            onClick={() => callManager.setScreen(!screenStream)}
            tone={screenStream ? "on" : "quiet"}
            title={screenStream ? t("stopSharing") : t("shareScreen")}
            aria-pressed={!!screenStream}
            icon={
              screenStream ? (
                <MonitorX className="w-[18px] h-[18px]" />
              ) : (
                <MonitorUp className="w-[18px] h-[18px]" />
              )
            }
          />
        )}

        {/* The speaker only gets in the way on a phone when nobody is talking. */}
        <span className={isInCall ? "contents" : "hidden sm:contents"}>
          <RoomIconButton
            onClick={toggleSpeaker}
            title={speakerEnabled ? t("muteSpeaker") : t("unmuteSpeaker")}
            aria-pressed={!speakerEnabled}
            icon={
              speakerEnabled ? (
                <Volume2 className="w-[18px] h-[18px]" />
              ) : (
                <VolumeX className="w-[18px] h-[18px]" />
              )
            }
          />
        </span>

        <Divider />

        <RoomIconButton
          onClick={onChatClick}
          title={t("openChat")}
          icon={<MessageSquare className="w-[18px] h-[18px]" />}
          mark={unreadChatCount > 0 ? <Badge count={unreadChatCount} /> : undefined}
        />

        {/* Choosing a microphone or camera is a desktop job. */}
        <span className="hidden sm:contents">
          <RoomIconButton
            onClick={onSettingsClick}
            title={t("settings")}
            icon={<Settings className="w-[18px] h-[18px]" />}
          />
        </span>

        {isInCall && (
          <>
            <Divider />
            <RoomIconButton
              onClick={() =>
                meeting ? window.dispatchEvent(new Event("leaveMeeting")) : callManager.hangUp()
              }
              tone="danger"
              title={meeting ? t("leaveMeeting") : t("leaveCall")}
              icon={<PhoneOff className="w-[18px] h-[18px]" />}
            />
          </>
        )}
      </div>
    </div>
  );
}
