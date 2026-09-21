import { useTranslations } from "next-intl";
import { MessageSquare, Mic, MonitorUp, Settings2, Video } from "lucide-react";
import { COVER_WIDTH, OfficeScene, type Occupant } from "@/components/OfficeScene";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [maya, leo, priya, sam, aiko] = CAST;

/** Characters grow with the frame, like the app's camera does, but never past legible. */
const SIZE = "max(4.2cqw, 6.3cqh, 24px)";

/** A walk as a share of the art's width, so it stays inside its aisle at any frame size. */
const lane = (share: number) => `calc(${COVER_WIDTH} * ${share})`;

/**
 * Everyone strolling their own aisle. The spots are on the art (pinned), and
 * each walk keeps clear of the desks and plants at any frame shape.
 */
const STROLLING: Occupant[] = [
  { character: sam.character, name: sam.name, status: "available", left: "67.5%", top: "30%", width: SIZE, stroll: { distance: lane(0.3), duration: 9400, pattern: "a" } },
  { character: maya.character, name: maya.name, status: "available", left: "25.8%", top: "43%", width: SIZE, stroll: { distance: lane(0.24), duration: 9100, delay: -2600, pattern: "c" } },
  { character: priya.character, name: priya.name, status: "busy", left: "72.5%", top: "59%", width: SIZE, stroll: { distance: lane(0.25), duration: 10300, delay: -4100, pattern: "b" } },
  { character: leo.character, name: leo.name, status: "available", left: "19%", top: "75%", width: SIZE, stroll: { distance: lane(0.17), duration: 7700, delay: -1500, pattern: "a" } },
  { character: aiko.character, name: aiko.name, status: "away", left: "57.5%", top: "88%", width: SIZE, stroll: { distance: lane(0.22), duration: 8600, delay: -5200, pattern: "c" } },
];

/** Two people who just met in the aisle, for the proximity close-up: you, and Leo. */
const MEETING_UP: Occupant[] = [
  { character: maya.character, left: "44.5%", top: "57%", direction: "right", width: 30 },
  { character: leo.character, name: leo.name, status: "available", left: "54.5%", top: "57%", direction: "left", width: 30 },
];

/**
 * The floor, as the app shows it: the office art with people walking around
 * it, the room's chip and the dock. `near` crops in on two people who have
 * walked up to each other, with the little bar the app puts beside someone
 * you're close to.
 */
export function FloorPreview({ near = false, className }: { near?: boolean; className?: string }) {
  const t = useTranslations("home.preview");
  const people = near ? MEETING_UP : STROLLING;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={near ? { transform: "scale(1.9)", transformOrigin: "49% 56%" } : undefined}
      >
        <OfficeScene pinned focus="center center" occupants={people} className="h-full w-full" />
      </div>

      {near ? (
        <div className="absolute bottom-[8%] start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
          <NearbyBar name={leo.name} seed={leo.id} labels={{ message: t("message") }} />
        </div>
      ) : (
        <>
          <span className="absolute start-3 top-3 flex h-8 items-center gap-2 rounded-full border border-border bg-card/90 pe-1.5 ps-3 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
            <span className="size-1.5 rounded-full bg-ok" />
            <span className="text-[12px] font-medium text-foreground">{t("office")}</span>
            <span className="flex items-center gap-1 rounded-full bg-muted py-0.5 pe-1.5 ps-0.5 [--face-ring:var(--ui-muted)]">
              <FaceStack seeds={[sam, maya, priya].map((one) => one.id)} size={16} max={3} />
              <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">{STROLLING.length}</span>
            </span>
          </span>

          <span className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-float backdrop-blur-md rtl:translate-x-1/2">
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

/** The app's bar beside someone you've walked up to: who, and the ways to talk. */
function NearbyBar({ name, seed, labels }: { name: string; seed: string; labels: { message: string } }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 p-1.5 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
      <Face seed={seed} size={32} presence="available" />
      <span className="px-1 text-[12.5px] font-semibold text-foreground">{name}</span>
      {[Video, Mic].map((Icon, index) => (
        <span
          key={index}
          className={cn(
            "flex size-8 items-center justify-center rounded-full border",
            index === 0 ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      ))}
      <span title={labels.message} className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <MessageSquare className="size-3.5" />
      </span>
    </div>
  );
}
