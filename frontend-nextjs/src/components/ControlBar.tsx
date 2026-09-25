"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Settings2, Video, Volume2, VolumeX } from "lucide-react";
import { Dock, DockSeparator } from "@/components/motion/dock";
import { IconButton } from "@/components/ui/IconButton";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { setMyStatus } from "@/lib/floor";
import { useRouter } from "@/lib/i18n/navigation";

/**
 * The dock along the bottom of the floor: your microphone, always. In a call,
 * the camera and your screen are there to switch on when there is something
 * to see, then the speaker and hanging up. A call is a conversation first, so
 * neither starts on, and off is how they rest, not a warning. Status and chat
 * live in the rail, so the dock stays short on a phone.
 */
export default function ControlBar({ settingsHref }: { settingsHref?: string }) {
  const router = useRouter();
  const t = useTranslations("controls");
  const { peers, meeting, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  const inCall = peers.length > 0 || !!meeting;
  // Phones and some browsers cannot share a screen, so the button only exists where it works.
  const canShareScreen = inCall && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // Everyone sees "in a call" while you are in one, and "available" after.
  const wasInCall = useRef(inCall);
  useEffect(() => {
    if (wasInCall.current === inCall) return;
    wasInCall.current = inCall;
    setMyStatus(inCall ? "in_call" : "available");
  }, [inCall]);

  return (
    <div className="absolute bottom-3 left-1/2 z-50 max-w-[calc(100%-1.5rem)] -translate-x-1/2 sm:bottom-4">
      <Dock size={44} className="items-center gap-1 rounded-full border-border bg-card/90 p-1.5 shadow-float [--face-ring:var(--ui-card)]">
        <IconButton
          label={micEnabled ? t("muteMic") : t("unmuteMic")}
          tone={micEnabled ? "soft" : "off"}
          size="lg"
          aria-pressed={!micEnabled}
          onClick={() => callManager.setMic(!micEnabled)}
          icon={micEnabled ? <Mic /> : <MicOff />}
        />

        {inCall && (
          <>
            <IconButton
              label={cameraEnabled ? t("cameraOff") : t("cameraOn")}
              tone={cameraEnabled ? "solid" : "ghost"}
              size="lg"
              aria-pressed={cameraEnabled}
              onClick={() => callManager.setCamera(!cameraEnabled)}
              icon={<Video />}
            />
            {canShareScreen && (
              <IconButton
                label={screenStream ? t("stopSharing") : t("shareScreen")}
                tone={screenStream ? "solid" : "ghost"}
                size="lg"
                aria-pressed={!!screenStream}
                onClick={() => callManager.setScreen(!screenStream)}
                icon={screenStream ? <MonitorX /> : <MonitorUp />}
              />
            )}
            <IconButton
              label={speakerEnabled ? t("muteSpeaker") : t("unmuteSpeaker")}
              tone={speakerEnabled ? "ghost" : "off"}
              size="lg"
              aria-pressed={!speakerEnabled}
              onClick={() => callManager.setSpeaker(!speakerEnabled)}
              icon={speakerEnabled ? <Volume2 /> : <VolumeX />}
            />
          </>
        )}

        {settingsHref && (
          // Choosing a microphone or camera is a desktop job.
          <span className="hidden items-center sm:flex">
            <DockSeparator className="mx-1" />
            <IconButton label={t("settings")} size="lg" onClick={() => router.push(settingsHref)} icon={<Settings2 />} />
          </span>
        )}

        {inCall && (
          <>
            <DockSeparator className="mx-1" />
            <IconButton
              label={meeting ? t("leaveMeeting") : t("leaveCall")}
              tone="danger"
              size="lg"
              className="w-14"
              onClick={() => (meeting ? window.dispatchEvent(new Event("leaveMeeting")) : callManager.hangUp())}
              icon={<PhoneOff />}
            />
          </>
        )}
      </Dock>
    </div>
  );
}
