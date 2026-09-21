import { useTranslations } from "next-intl";
import { Mic, MonitorUp, PhoneOff, Settings2, Video } from "lucide-react";
import { COVER_WIDTH, OfficeScene, type Occupant } from "@/components/OfficeScene";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [maya, leo, priya, sam, aiko, noah] = CAST;

/** Where everyone stands, on the art itself (pinned), so a wide or narrow frame keeps them on their tiles. */
const PEOPLE: Occupant[] = [
  { character: maya.character, name: maya.name, left: "45.5%", top: "57%", direction: "right", status: "in_call", width: 30 },
  { character: leo.character, name: leo.name, left: "53.5%", top: "57%", direction: "left", status: "in_call", width: 30 },
  { character: priya.character, name: priya.name, left: "21%", top: "38%", direction: "up", status: "busy", width: 30 },
  { character: sam.character, name: sam.name, left: "80%", top: "58%", direction: "down", status: "available", width: 30 },
  { character: aiko.character, name: aiko.name, left: "63%", top: "31%", direction: "down", status: "available", width: 30 },
  { character: noah.character, name: noah.name, left: "31%", top: "72%", direction: "right", status: "away", width: 30 },
];

/**
 * The floor, as the app shows it: the office art with people on it, the
 * room's chip, a call that started because two people stood close, and the
 * dock. `zoom` crops in on the call for the proximity feature.
 */
export function FloorPreview({ zoom = false, className }: { zoom?: boolean; className?: string }) {
  const t = useTranslations("home.preview");
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={zoom ? { transform: "scale(1.9)", transformOrigin: "49% 56%" } : undefined}
      >
        <OfficeScene pinned occupants={PEOPLE} className="h-full w-full" />
      </div>

      {/* The call. On the full floor it sits on the art, just over the two
          nameplates, so any frame shape keeps it there; zoomed in, below them. */}
      {zoom ? (
        <div className="absolute bottom-[7%] start-1/2 -translate-x-1/2">
          <CallCard />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-[3/2] -translate-x-1/2 -translate-y-1/2"
          style={{ width: COVER_WIDTH }}
        >
          <div className="absolute" style={{ left: "49.5%", top: "57%", transform: "translate(-50%, calc(-100% - 64px))" }}>
            <CallCard />
          </div>
        </div>
      )}

      {!zoom && (
        <>
          <span className="absolute start-3 top-3 flex h-8 items-center gap-2 rounded-full border border-border bg-card/90 pe-1.5 ps-3 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
            <span className="size-1.5 rounded-full bg-ok" />
            <span className="text-[12px] font-medium text-foreground">{t("office")}</span>
            <span className="flex items-center gap-1 rounded-full bg-muted py-0.5 pe-1.5 ps-0.5 [--face-ring:var(--ui-muted)]">
              <FaceStack seeds={CAST.slice(0, 3).map((one) => one.id)} size={16} max={3} />
              <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">{CAST.length}</span>
            </span>
          </span>

          <span className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-float backdrop-blur-md">
            {[Mic, Video, MonitorUp].map((Icon, index) => (
              <span
                key={index}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  index === 1 ? "bg-destructive/12 text-destructive" : "text-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </span>
            ))}
            <span className="mx-0.5 h-4 w-px bg-border" />
            <span className="flex size-7 items-center justify-center rounded-full text-muted-foreground">
              <Settings2 className="size-3.5" />
            </span>
          </span>
        </>
      )}
    </div>
  );
}

/** The call two people fell into by standing close: their tiles, and hanging up. */
function CallCard() {
  const t = useTranslations("home.preview");
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-2xl border border-white/15 bg-black/60 p-1.5 pe-2.5 text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.6)] backdrop-blur-md">
      {[maya, leo].map((person) => (
        <span key={person.id} className="relative flex h-9 w-12 items-center justify-center overflow-hidden rounded-[9px] bg-white/10 sm:h-10 sm:w-14">
          <Face seed={person.id} size={24} />
          <span className="absolute bottom-0.5 start-1 text-[8px] font-medium text-white/85">{person.name}</span>
        </span>
      ))}
      <span className="ms-0.5 leading-tight">
        <span className="block text-[11px] font-semibold">{t("inCall")}</span>
        <span className="block text-[10px] text-white/65">
          {maya.name}, {leo.name}
        </span>
      </span>
      <span className="ms-1 flex size-6 items-center justify-center rounded-full bg-[#e5484d]">
        <PhoneOff className="size-3" />
      </span>
    </div>
  );
}
