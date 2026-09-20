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

export default function ControlBar({
  onSettingsClick,
  onChatClick,
  onStatusChange,
  currentStatus = "available",
  unreadChatCount = 0,
}: ControlBarProps) {
  const t = useTranslations("controls");
  const {
    peers,
    meeting,
    micEnabled,
    cameraEnabled,
    speakerEnabled,
    screenStream,
  } = useCall();
  const isInCall = peers.length > 0 || !!meeting;
  // Phones and some browsers cannot share a screen, so the button only exists where it works.
  const canShareScreen =
    isInCall &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getDisplayMedia;
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

  const toggleMic = useCallback(
    () => callManager.setMic(!micEnabled),
    [micEnabled],
  );

  const toggleVideo = useCallback(
    () => callManager.setCamera(!cameraEnabled),
    [cameraEnabled],
  );

  const toggleSpeaker = useCallback(
    () => callManager.setSpeaker(!speakerEnabled),
    [speakerEnabled],
  );

  const handleStatusChange = useCallback(
    (newStatus: PlayerStatus) => {
      // During a call the status stays "in call".
      if (isInCall) return;
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [isInCall, onStatusChange],
  );

  const micLabel = micEnabled ? t("muteMic") : t("unmuteMic");
  const cameraLabel = cameraEnabled ? t("cameraOff") : t("cameraOn");
  const speakerLabel = speakerEnabled ? t("muteSpeaker") : t("unmuteSpeaker");
  const leaveLabel = meeting ? t("leaveMeeting") : t("leaveCall");
  const screenLabel = screenStream ? t("stopSharing") : t("shareScreen");

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-auto md:max-w-max overflow-visible">
      <div className="bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-[2rem] shadow-sm px-3 sm:px-4 md:px-4 py-2 flex items-center justify-between md:justify-center gap-2 sm:gap-3 md:gap-2 mx-auto overflow-visible w-full">
        <div className="shrink-0">
          <StatusSelector
            currentStatus={status}
            onStatusChange={handleStatusChange}
          />
        </div>

        <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 sm:mx-1 md:mx-1" />

        <div className="flex flex-1 items-center justify-evenly md:justify-center gap-2 sm:gap-3 md:gap-2">
          <button
            onClick={toggleMic}
            className={`cursor-pointer relative p-2.5 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              micEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={micLabel}
            aria-label={micLabel}
          >
            {micEnabled ? (
              <Mic className="w-[18px] h-[18px]" />
            ) : (
              <MicOff className="w-[18px] h-[18px]" />
            )}
            {!micEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ff4e00] rounded-full animate-pulse border border-white" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`cursor-pointer relative p-2.5 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              cameraEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={cameraLabel}
            aria-label={cameraLabel}
          >
            {cameraEnabled ? (
              <Video className="w-[18px] h-[18px]" />
            ) : (
              <VideoOff className="w-[18px] h-[18px]" />
            )}
            {!cameraEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ff4e00] rounded-full animate-pulse border border-white" />
            )}
          </button>

          {canShareScreen && (
            <button
              onClick={() => callManager.setScreen(!screenStream)}
              className={`cursor-pointer relative p-2.5 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
                screenStream
                  ? "bg-[var(--color-braun-green)] border-[var(--color-braun-green)] text-white shadow-sm hover:opacity-90"
                  : "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
              }`}
              title={screenLabel}
              aria-label={screenLabel}
              aria-pressed={!!screenStream}
            >
              {screenStream ? (
                <MonitorX className="w-[18px] h-[18px]" />
              ) : (
                <MonitorUp className="w-[18px] h-[18px]" />
              )}
            </button>
          )}

          <button
            onClick={toggleSpeaker}
            className={`cursor-pointer p-2.5 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              speakerEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-gray-100 border-[rgba(0,0,0,0.06)] text-gray-400 hover:bg-gray-200"
            }`}
            title={speakerLabel}
            aria-label={speakerLabel}
          >
            {speakerEnabled ? (
              <Volume2 className="w-[18px] h-[18px]" />
            ) : (
              <VolumeX className="w-[18px] h-[18px]" />
            )}
          </button>

          <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 sm:mx-1 md:mx-1 hidden md:block" />

          <button
            onClick={onChatClick}
            className="cursor-pointer relative p-2.5 md:p-2.5 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1"
            title={t("openChat")}
            aria-label={t("openChat")}
          >
            <MessageSquare className="w-[18px] h-[18px]" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] bg-[#ff4e00] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow border-[1.5px] border-white">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={onSettingsClick}
            className="cursor-pointer p-2.5 md:p-2.5 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 hidden md:block"
            title={t("settings")}
            aria-label={t("settings")}
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          {isInCall && (
            <>
              <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 sm:mx-1 md:mx-1" />
              <button
                onClick={() =>
                  meeting
                    ? window.dispatchEvent(new Event("leaveMeeting"))
                    : callManager.hangUp()
                }
                className="cursor-pointer p-2.5 md:p-2.5 rounded-full border bg-[#ff4e00] border-[#ff4e00] text-white hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm shrink-0 my-1"
                title={leaveLabel}
                aria-label={leaveLabel}
              >
                <PhoneOff className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
