"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  MessageSquare,
  Users,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { StatusSelector } from "./StatusSelector";
import type { PlayerStatus } from "@/lib/types";

interface ControlBarProps {
  onMicToggle?: (enabled: boolean) => void;
  onVideoToggle?: (enabled: boolean) => void;
  onSettingsClick?: () => void;
  onChatClick?: () => void;
  onParticipantsClick?: () => void;
  onLeaveCall?: () => void;
  onStatusChange?: (status: PlayerStatus) => void;
  isInCall?: boolean;
  participantCount?: number;
  currentStatus?: PlayerStatus;
  unreadChatCount?: number;
}

export default function ControlBar({
  onMicToggle,
  onVideoToggle,
  onSettingsClick,
  onChatClick,
  onParticipantsClick,
  onLeaveCall,
  onStatusChange,
  isInCall = false,
  participantCount = 0,
  currentStatus = "available",
  unreadChatCount = 0,
}: ControlBarProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [status, setStatus] = useState<PlayerStatus>(currentStatus);

  // Sync status with prop changes
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  // Auto-set status to in_call when in a call
  useEffect(() => {
    if (isInCall && status !== "in_call") {
      setStatus("in_call");
      onStatusChange?.("in_call");
    } else if (!isInCall && status === "in_call") {
      setStatus("available");
      onStatusChange?.("available");
    }
  }, [isInCall, status, onStatusChange]);

  const toggleMic = useCallback(() => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    onMicToggle?.(newState);
  }, [micEnabled, onMicToggle]);

  const toggleVideo = useCallback(() => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    onVideoToggle?.(newState);
  }, [videoEnabled, onVideoToggle]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerEnabled(!speakerEnabled);
    // TODO: Implement speaker mute for remote audio
  }, [speakerEnabled]);

  const handleStatusChange = useCallback(
    (newStatus: PlayerStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[95%] md:max-w-max overflow-visible">
      <div className="bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-[2rem] shadow-sm px-2 md:px-4 py-2 flex items-center justify-start md:justify-center gap-1 md:gap-2 mx-auto overflow-visible">
        {/* Status Selector */}
        <div className="shrink-0">
          <StatusSelector
            currentStatus={status}
            onStatusChange={handleStatusChange}
            compact
          />
        </div>

        <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />

        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={toggleMic}
            className={`cursor-pointer relative p-2 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              micEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={micEnabled ? "Mute microphone" : "Unmute microphone"}
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
            className={`cursor-pointer relative p-2 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              videoEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? (
              <Video className="w-[18px] h-[18px]" />
            ) : (
              <VideoOff className="w-[18px] h-[18px]" />
            )}
            {!videoEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ff4e00] rounded-full animate-pulse border border-white" />
            )}
          </button>

          <button
            onClick={toggleSpeaker}
            className={`cursor-pointer p-2 md:p-2.5 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1 ${
              speakerEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-gray-100 border-[rgba(0,0,0,0.06)] text-gray-400 hover:bg-gray-200"
            }`}
            title={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
          >
            {speakerEnabled ? (
              <Volume2 className="w-[18px] h-[18px]" />
            ) : (
              <VolumeX className="w-[18px] h-[18px]" />
            )}
          </button>

          <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />

          <button
            onClick={onChatClick}
            className="cursor-pointer relative p-2 md:p-2.5 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1"
            title="Open chat"
          >
            <MessageSquare className="w-[18px] h-[18px]" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] bg-[#ff4e00] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow border-[1.5px] border-white">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={onParticipantsClick}
            className="cursor-pointer relative p-2 md:p-2.5 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1"
            title="View participants"
          >
            <Users className="w-[18px] h-[18px]" />
            {participantCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] bg-[var(--color-braun-text)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow border-[1.5px] border-white">
                {participantCount}
              </span>
            )}
          </button>

          <button
            onClick={onSettingsClick}
            className="cursor-pointer p-2 md:p-2.5 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 my-1"
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          {isInCall && (
            <>
              <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />
              <button
                onClick={onLeaveCall}
                className="cursor-pointer p-2 md:p-2.5 rounded-full border bg-[#ff4e00] border-[#ff4e00] text-white hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm shrink-0 my-1"
                title="Leave call"
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
