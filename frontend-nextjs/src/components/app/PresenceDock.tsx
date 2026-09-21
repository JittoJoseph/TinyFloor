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

const STATUS_DOT: Record<string, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
};

/**
 * You, at the foot of every column — the way Discord keeps you in the corner.
 * While you are in a call, a band above says so and holds the call's own
 * controls; below it, always, your face and status with your microphone,
 * sound and settings to hand. Pressing your name takes you back to the floor.
 */
export function PresenceDock({ floorHref, place, settingsHref }: { floorHref: string; place: string; settingsHref: string }) {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const status = useMyStatus();
  const { peers, meeting, micEnabled, cameraEnabled, speakerEnabled, screenStream } = useCall();
  if (!user) return null;
  const inCall = peers.length > 0 || !!meeting;
  const canShareScreen = inCall && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="shrink-0 p-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05)] [--face-ring:var(--ui-card)]">
        {inCall && (
          <div className="border-b border-border px-3 pb-2.5 pt-2.5">
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

        <div className="flex items-center gap-1 p-1.5">
          <Tooltip content={t("backToFloor")} side="top" wrapperClassName="min-w-0 flex-1">
            <Link
              href={floorHref}
              className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl p-1 pe-2 transition-colors hover:bg-muted"
            >
              <Face seed={user.id} size={32} presence={status} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-foreground">{user.displayName}</span>
                <span className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                  <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status] ?? "bg-ok")} />
                  <span className="truncate group-hover:hidden">{tStatus(`${status === "offline" ? "away" : status}.label`)}</span>
                  <span className="hidden truncate group-hover:inline">{place}</span>
                </span>
              </span>
            </Link>
          </Tooltip>
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
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        "rounded-lg [&_svg]:size-[17px]",
        wide && "h-8 w-auto flex-1 bg-muted px-3",
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
