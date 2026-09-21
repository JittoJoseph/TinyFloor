"use client";

import { useTranslations } from "next-intl";
import { Map as MapIcon, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { CharacterSprite } from "@/components/CharacterSprite";
import { IconButton } from "@/components/ui/IconButton";

/**
 * You are still standing on the floor while you read a message, so the bottom
 * of every column keeps you there: your character, where it is standing, the
 * two controls worth having to hand, and the way back.
 */
export function PresenceDock({ floorHref, place }: { floorHref: string; place: string }) {
  const t = useTranslations("shell");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const { micEnabled, cameraEnabled } = useCall();
  if (!user) return null;

  return (
    <div className="shrink-0 p-2">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 ps-2 [--face-ring:var(--ui-card)]">
        <Link
          href={floorHref}
          title={t("backToFloor")}
          className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl p-0.5 transition-colors hover:bg-muted"
        >
          <span className="relative flex size-9 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-muted">
            <CharacterSprite character={user.character} scale={1.5} offsetY={-3} />
            <span className="absolute bottom-0.5 end-0.5 size-2 rounded-full bg-ok ring-2 ring-muted" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-foreground">{t("onTheFloor")}</span>
            <span className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground group-hover:text-foreground">
              <MapIcon className="size-3 shrink-0" />
              <span className="truncate">{place}</span>
            </span>
          </span>
        </Link>
        <IconButton
          size="sm"
          label={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
          tone={micEnabled ? "ghost" : "off"}
          onClick={() => callManager.setMic(!micEnabled)}
          icon={micEnabled ? <Mic /> : <MicOff />}
          className="[&_svg]:size-4"
        />
        <IconButton
          size="sm"
          label={cameraEnabled ? tControls("cameraOff") : tControls("cameraOn")}
          tone={cameraEnabled ? "ghost" : "off"}
          onClick={() => callManager.setCamera(!cameraEnabled)}
          icon={cameraEnabled ? <Video /> : <VideoOff />}
          className="[&_svg]:size-4"
        />
      </div>
    </div>
  );
}
