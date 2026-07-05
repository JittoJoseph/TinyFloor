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
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[95%] md:max-w-max">
      <div className="bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-[2rem] shadow-sm px-2 md:px-4 py-1.5 md:py-2 flex items-center justify-start md:justify-center gap-1 md:gap-2 mx-auto">
        {/* Status Selector */}
        <div className="shrink-0">
          <StatusSelector
            currentStatus={status}
            onStatusChange={handleStatusChange}
            compact
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />

        {/* Scrollable Actions Container */}
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide no-scrollbar">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMic}
            className={`cursor-pointer relative p-2.5 md:p-3 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              micEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={micEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {micEnabled ? (
              <Mic className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            ) : (
              <MicOff className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            )}
            {!micEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2 md:h-2 bg-[#ff4e00] rounded-full animate-pulse border-2 border-white" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`cursor-pointer relative p-2.5 md:p-3 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              videoEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
            }`}
            title={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? (
              <Video className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            ) : (
              <VideoOff className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            )}
            {!videoEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2 md:h-2 bg-[#ff4e00] rounded-full animate-pulse border-2 border-white" />
            )}
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={toggleSpeaker}
            className={`cursor-pointer p-2.5 md:p-3 rounded-full border transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 ${
              speakerEnabled
                ? "bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm"
                : "bg-gray-100 border-[rgba(0,0,0,0.06)] text-gray-400 hover:bg-gray-200"
            }`}
            title={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
          >
            {speakerEnabled ? (
              <Volume2 className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            ) : (
              <VolumeX className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />

          {/* Chat Button */}
          <button
            onClick={onChatClick}
            className="cursor-pointer relative p-2.5 md:p-3 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            title="Open chat"
          >
            <MessageSquare className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[var(--color-braun-orange)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Participants Button */}
          <button
            onClick={onParticipantsClick}
            className="cursor-pointer relative p-2.5 md:p-3 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            title="View participants"
          >
            <Users className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            {participantCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[var(--color-braun-text)] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                {participantCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onSettingsClick}
            className="cursor-pointer p-2.5 md:p-3 rounded-full border bg-white border-[rgba(0,0,0,0.06)] text-[var(--color-braun-text)] hover:bg-gray-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4 md:w-[18px] md:h-[18px]" />
          </button>

          {/* Leave Call Button - Only show when in a call */}
          {isInCall && (
            <>
              <div className="w-px h-6 md:h-7 bg-gray-200 shrink-0 mx-0.5 md:mx-1" />
              <button
                onClick={onLeaveCall}
                className="cursor-pointer p-2.5 md:p-3 rounded-full border bg-[#ff4e00] border-[#ff4e00] text-white hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm shrink-0"
                title="Leave call"
              >
                <PhoneOff className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
