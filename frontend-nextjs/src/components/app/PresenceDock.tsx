"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Map, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { officePath } from "@/lib/links";
import { CharacterSprite } from "@/components/CharacterSprite";
import { RoomIconButton } from "@/components/room/ui";
import { useOffice } from "./OfficeShell";

/**
 * You are still standing on the floor while you read a message, so the bottom
 * of every column keeps you there: who you are, where you are, and the two
 * controls worth having to hand.
 */
export function PresenceDock() {
  const t = useTranslations("office");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const { office } = useOffice();
  const pathname = usePathname();
  const { micEnabled, cameraEnabled } = useCall();

  const toggleMic = useCallback(() => callManager.setMic(!micEnabled), [micEnabled]);
  const toggleCamera = useCallback(() => callManager.setCamera(!cameraEnabled), [cameraEnabled]);

  if (!user) return null;
  const floor = officePath(office.id);
  const away = pathname !== floor && !pathname.endsWith(floor);

  return (
    <div className="shrink-0 border-t border-black/[0.06] p-2">
      <div className="rounded-2xl bg-[var(--color-braun-text)]/[0.04] p-2">
        <div className="flex items-center gap-2 px-1 pb-2">
          <span className="w-8 h-8 rounded-full overflow-hidden bg-[var(--color-braun-bg)] flex items-end justify-center shrink-0">
            <CharacterSprite character={user.character} scale={1.4} offsetY={-2} />
          </span>
          <span className="min-w-0">
            <span className="block font-body text-[13px] font-semibold text-[var(--color-braun-text)] truncate">
              {user.displayName}
            </span>
            <span className="block font-body text-[11px] text-[var(--color-braun-text)] opacity-55 truncate">
              {t("onTheFloor", { office: office.name })}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <RoomIconButton
            size="sm"
            onClick={toggleMic}
            tone={micEnabled ? "quiet" : "alert"}
            title={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
            icon={micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          />
          <RoomIconButton
            size="sm"
            onClick={toggleCamera}
            tone={cameraEnabled ? "quiet" : "alert"}
            title={cameraEnabled ? tControls("cameraOff") : tControls("cameraOn")}
            icon={cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          />
          {away && (
            <Link
              href={floor}
              className="cursor-pointer ms-auto h-8 px-3 rounded-full bg-white border border-black/[0.06] shadow-sm flex items-center gap-1.5 font-body text-[12px] font-semibold text-[var(--color-braun-text)] hover:bg-[#f5f5f2] transition-colors duration-150"
            >
              <Map className="w-3.5 h-3.5" />
              {t("backToFloor")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
