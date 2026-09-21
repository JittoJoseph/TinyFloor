import { useTranslations } from "next-intl";
import { Mic, MicOff, MonitorUp, PhoneOff, Video } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [maya, leo, priya, sam, aiko] = CAST;

/**
 * A meeting table's call: the shared screen large, everyone else as light
 * thumbnails (the app's two-quality rule), and the meeting's own controls.
 */
export function MeetingPreview() {
  const t = useTranslations("home.preview");
  const tiles = [
    { person: leo, speaking: true },
    { person: priya, muted: true },
    { person: sam },
    { person: aiko },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5 bg-[#101012] p-3 text-start text-white">
      <div className="flex items-center gap-2 px-1">
        <span className="size-1.5 rounded-full bg-ok" />
        <span className="text-[12px] font-semibold">{t("meeting")}</span>
        <span className="text-[11px] text-white/50">· 5</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr] gap-2.5 sm:grid-cols-[1fr_150px]">
        {/* The shared screen: a whiteboard someone is walking through. */}
        <div className="relative overflow-hidden rounded-xl bg-[#f7f7f4]">
          <svg viewBox="0 0 400 240" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <g fill="none" stroke="#1a1a18" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="40" y="46" width="92" height="56" rx="10" />
              <rect x="170" y="46" width="92" height="56" rx="10" />
              <rect x="300" y="46" width="70" height="56" rx="10" stroke="#ff5a1f" />
              <path d="M132 74h38M262 74h38" />
              <path d="M86 102v48c0 10 8 18 18 18h60" strokeDasharray="4 6" />
            </g>
            <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="#1a1a18">
              <text x="58" y="79">{t("board.signUp")}</text>
              <text x="185" y="79">{t("board.name")}</text>
              <text x="314" y="79" fill="#ff5a1f">{t("board.walkIn")}</text>
              <text x="170" y="172" fill="#6b6b65">{t("board.note")}</text>
            </g>
            <path d="M320 130c14-8 30-6 38 4" stroke="#ff5a1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>
          <span className="absolute bottom-2 start-2 flex items-center gap-1.5 rounded-full bg-black/60 py-0.5 pe-2 ps-0.5 text-[10.5px] backdrop-blur">
            <Face seed={maya.id} size={16} />
            {maya.name} · {t("sharing")}
          </span>
        </div>

        <div className="hidden grid-rows-4 gap-2 sm:grid">
          {tiles.map(({ person, speaking, muted }) => (
            <span
              key={person.id}
              className={cn(
                "relative flex items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]",
                speaking && "ring-2 ring-ok",
              )}
            >
              <Face seed={person.id} size={34} />
              <span className="absolute bottom-1 start-1.5 flex items-center gap-1 text-[9.5px] text-white/85">
                {muted && <MicOff className="size-2.5 text-[#ff6369]" />}
                {person.name}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {[Mic, Video, MonitorUp].map((Icon, index) => (
          <span key={index} className="flex size-8 items-center justify-center rounded-full bg-white/10">
            <Icon className="size-3.5" />
          </span>
        ))}
        <span className="flex h-8 items-center gap-1 rounded-full bg-[#e5484d] px-3 text-[11px] font-medium">
          <PhoneOff className="size-3.5" />
        </span>
      </div>
    </div>
  );
}
