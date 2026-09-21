"use client";

import { useTranslations } from "next-intl";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Settings, Video, VideoOff } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useMyStatus } from "@/lib/floor";
import { Face, FaceStack } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/motion/tooltip";
import { cn } from "@/lib/utils";
import { useDockHoldsYou } from "./AppShell";
import { YouMenu } from "./YouMenu";

/**
 * You, at the foot of every column — the way Discord keeps you in the corner.
 * While you are in a call, a band above says so and holds the call's own
 * controls; below it, always, your face and status with your microphone,
 * sound and settings to hand. Pressing yourself opens your menu, the same one
 * the rail has — which steps aside while this is on screen (useDockHoldsYou).
 */
export function PresenceDock({ place, settingsHref }: { place: string; settingsHref: string }) {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const status = useMyStatus();
  useDockHoldsYou();
  const { peers, meeting, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  if (!user) return null;
  const inCall = peers.length > 0 || !!meeting;
  const canShareScreen = inCall && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="shrink-0 px-2 pb-2">
      <div className="overflow-hidden rounded-xl bg-rail [--face-ring:var(--ui-rail)]">
        {inCall && (
          <div className="border-b border-border px-2.5 pb-2 pt-2">
            <div className="flex items-center gap-2">
              <Signal />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-ok">{meeting ? t("inMeeting") : t("inCall")}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {peers.length ? peers.map((peer) => peer.name).join(", ") : place}
                </p>
              </div>
              <IconButton
                size="sm"
                tone="ghost"
                label={meeting ? tControls("leaveMeeting") : tControls("leaveCall")}
                onClick={() => (meeting ? window.dispatchEvent(new Event("leaveMeeting")) : callManager.hangUp())}
                icon={<PhoneOff />}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4"
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <PanelToggle
                on={cameraEnabled}
                onLabel={tControls("cameraOff")}
                offLabel={tControls("cameraOn")}
                onIcon={<Video />}
                offIcon={<VideoOff />}
                onClick={() => callManager.setCamera(!cameraEnabled)}
                wide
              />
              {canShareScreen && (
                <PanelToggle
                  on={!!screenStream}
                  onLabel={tControls("stopSharing")}
                  offLabel={tControls("shareScreen")}
                  onIcon={<MonitorX />}
                  offIcon={<MonitorUp />}
                  onClick={() => callManager.setScreen(!screenStream)}
                  wide
                  highlight
                />
              )}
              {peers.length > 0 && (
                <span className="ms-auto">
                  <FaceStack seeds={peers.map((peer) => peer.id)} size={20} max={3} />
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 p-1 pe-1.5">
          <YouMenu
            onFloor
            settingsHref={settingsHref}
            panel={
              <button
                type="button"
                aria-label={t("you")}
                className="flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg p-1 pe-2 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Face seed={user.id} size={28} presence={status} />
                <span className="min-w-0 leading-[1.2]">
                  <span className="block truncate text-[12.5px] font-semibold text-foreground">{user.displayName}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {tStatus(`${status === "offline" ? "away" : status}.label`)}
                  </span>
                </span>
              </button>
            }
          />
          <PanelToggle
            on={micEnabled}
            onLabel={tControls("muteMic")}
            offLabel={tControls("unmuteMic")}
            onIcon={<Mic />}
            offIcon={<MicOff />}
            onClick={() => callManager.setMic(!micEnabled)}
          />
          <PanelToggle
            on={speakerEnabled}
            onLabel={tControls("muteSpeaker")}
            offLabel={tControls("unmuteSpeaker")}
            onIcon={<Headphones />}
            offIcon={<HeadphoneOff />}
            onClick={() => callManager.setSpeaker(!speakerEnabled)}
          />
          <Tooltip content={t("settings")} side="top">
            <Link
              href={settingsHref}
              aria-label={t("settings")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <Settings className="size-[17px]" />
            </Link>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/** A control that is on or off, red when off, like Discord's microphone and headset. */
function PanelToggle({
  on,
  onLabel,
  offLabel,
  onIcon,
  offIcon,
  onClick,
  wide,
  highlight,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  onClick: () => void;
  wide?: boolean;
  /** On means something is happening (a shared screen), so on is the loud state. */
  highlight?: boolean;
}) {
  return (
    <IconButton
      size="sm"
      bare={false}
      label={on ? onLabel : offLabel}
      aria-pressed={!on}
      onClick={onClick}
      icon={on ? onIcon : offIcon}
      tone="ghost"
      className={cn(
        "size-8 rounded-lg hover:bg-foreground/[0.06] [&_svg]:size-[17px]",
        wide && "h-8 w-auto flex-1 bg-foreground/[0.06] px-3",
        highlight
          ? on && "bg-ok/15 text-ok hover:bg-ok/20 hover:text-ok"
          : !on && "text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    />
  );
}

/** Three bars, for "your call is connected". */
function Signal() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[5, 9, 14].map((height) => (
        <span key={height} className="w-[3px] rounded-full bg-ok" style={{ height }} />
      ))}
    </span>
  );
}
