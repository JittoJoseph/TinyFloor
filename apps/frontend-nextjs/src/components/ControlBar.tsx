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

interface ControlBarProps {
  onMicToggle?: (enabled: boolean) => void;
  onVideoToggle?: (enabled: boolean) => void;
  onSettingsClick?: () => void;
  onChatClick?: () => void;
  onParticipantsClick?: () => void;
  onLeaveCall?: () => void;
  isInCall?: boolean;
  participantCount?: number;
}

export default function ControlBar({
  onMicToggle,
  onVideoToggle,
  onSettingsClick,
  onChatClick,
  onParticipantsClick,
  onLeaveCall,
  isInCall = false,
  participantCount = 0,
}: ControlBarProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-sm border-2 border-gray-800 rounded-2xl shadow-retro px-4 py-3 flex items-center gap-2">
        {/* Microphone Toggle */}
        <button
          onClick={toggleMic}
          className={`relative p-3 rounded-xl border-2 transition-all hover:-translate-y-1 active:translate-y-0 ${
            micEnabled
              ? "bg-indigo-100 border-indigo-300 text-indigo-600 hover:bg-indigo-200"
              : "bg-red-100 border-red-300 text-red-600 hover:bg-red-200"
          }`}
          title={micEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {micEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
          {!micEnabled && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`relative p-3 rounded-xl border-2 transition-all hover:-translate-y-1 active:translate-y-0 ${
            videoEnabled
              ? "bg-indigo-100 border-indigo-300 text-indigo-600 hover:bg-indigo-200"
              : "bg-red-100 border-red-300 text-red-600 hover:bg-red-200"
          }`}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
          {!videoEnabled && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Speaker Toggle */}
        <button
          onClick={toggleSpeaker}
          className={`p-3 rounded-xl border-2 transition-all hover:-translate-y-1 active:translate-y-0 ${
            speakerEnabled
              ? "bg-emerald-100 border-emerald-300 text-emerald-600 hover:bg-emerald-200"
              : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
          title={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
        >
          {speakerEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300 mx-1" />

        {/* Chat Button */}
        <button
          onClick={onChatClick}
          className="p-3 rounded-xl border-2 bg-amber-100 border-amber-300 text-amber-600 hover:bg-amber-200 transition-all hover:-translate-y-1 active:translate-y-0"
          title="Open chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Participants Button */}
        <button
          onClick={onParticipantsClick}
          className="relative p-3 rounded-xl border-2 bg-purple-100 border-purple-300 text-purple-600 hover:bg-purple-200 transition-all hover:-translate-y-1 active:translate-y-0"
          title="View participants"
        >
          <Users className="w-5 h-5" />
          {participantCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-purple-500 text-white text-xs font-pixel rounded-full flex items-center justify-center px-1">
              {participantCount}
            </span>
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="p-3 rounded-xl border-2 bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 transition-all hover:-translate-y-1 active:translate-y-0"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Leave Call Button - Only show when in a call */}
        {isInCall && (
          <>
            <div className="w-px h-8 bg-gray-300 mx-1" />
            <button
              onClick={onLeaveCall}
              className="p-3 rounded-xl border-2 bg-red-500 border-red-600 text-white hover:bg-red-600 transition-all hover:-translate-y-1 active:translate-y-0 shadow-md"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
