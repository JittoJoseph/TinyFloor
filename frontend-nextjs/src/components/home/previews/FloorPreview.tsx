import { useTranslations } from "next-intl";
import { MessageSquare, Mic, MonitorUp, Settings2, Video } from "lucide-react";
import { COVER_WIDTH, OfficeScene, type Occupant } from "@/components/OfficeScene";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [emma, jack, olivia, sam, lily] = CAST;

/** Characters grow with the frame, like the app's camera does, but never past legible. */
const SIZE = "max(3.1cqw, 4.6cqh, 20px)";

/** A walk as a share of the art's width, so it stays inside its aisle at any frame size. */
const lane = (share: number) => `calc(${COVER_WIDTH} * ${share})`;

/**
 * Everyone strolling their own aisle. The spots are on the art (pinned), and
 * each walk keeps clear of the desks and plants at any frame shape.
 */
const strolling = (width: string): Occupant[] => [
  { character: sam.character, name: sam.name, status: "available", left: "67.5%", top: "30%", width, stroll: { distance: lane(0.3), duration: 9400, pattern: "a" } },
  { character: emma.character, name: emma.name, status: "available", left: "25.8%", top: "43%", width, stroll: { distance: lane(0.24), duration: 9100, delay: -2600, pattern: "c" } },
  { character: olivia.character, name: olivia.name, status: "busy", left: "72.5%", top: "59%", width, stroll: { distance: lane(0.25), duration: 10300, delay: -4100, pattern: "b" } },
  { character: jack.character, name: jack.name, status: "available", left: "19%", top: "75%", width, stroll: { distance: lane(0.17), duration: 7700, delay: -1500, pattern: "a" } },
  { character: lily.character, name: lily.name, status: "away", left: "57.5%", top: "88%", width, stroll: { distance: lane(0.22), duration: 8600, delay: -5200, pattern: "c" } },
];
const STROLLING = strolling(SIZE);
/** For a small window: smaller people, so the floor still reads as a floor. */
const STROLLING_SMALL = strolling("max(2.4cqw, 3.6cqh, 14px)");

/** How far the proximity close-up leans in on the aisle between the desks. */
const NEAR_ZOOM = 1.45;
const NEAR_SIZE = "max(2.6cqw, 3.9cqh, 18px)";

/** You, having just walked up to Jack in the aisle, and Olivia passing behind. */
const MEETING_UP: Occupant[] = [
  { character: emma.character, left: "46%", top: "58.5%", direction: "right", width: NEAR_SIZE },
  { character: jack.character, name: jack.name, status: "available", left: "52%", top: "58.5%", direction: "left", width: NEAR_SIZE },
  { character: olivia.character, name: olivia.name, status: "busy", left: "67.5%", top: "30%", width: NEAR_SIZE, stroll: { distance: lane(0.16), duration: 9100, delay: -2600, pattern: "c" } },
];

/**
 * The floor, as the app shows it: the office art with people walking around
 * it, the room's chip and the dock. `near` leans in on two people who have
 * walked up to each other, with the little bar the app puts beside someone
 * you're close to; `bare` is the floor alone, for a small window.
 */
export function FloorPreview({ near = false, bare = false, className }: { near?: boolean; bare?: boolean; className?: string }) {
  const t = useTranslations("home.preview");

  if (near) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <div className="absolute inset-0" style={{ transform: `scale(${NEAR_ZOOM})`, transformOrigin: "50% 52%" }}>
          <OfficeScene pinned focus="center center" occupants={MEETING_UP} className="h-full w-full">
            {/* The bar sits on the art just under the two of them, so it stays with them at any frame shape. */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 aspect-[3/2] -translate-x-1/2 -translate-y-1/2"
              style={{ width: COVER_WIDTH }}
            >
              <div
                className="absolute"
                style={{ left: "49%", top: "59.5%", transform: `translateX(-50%) scale(${1 / NEAR_ZOOM})`, transformOrigin: "50% 0" }}
              >
                <NearbyBar name={jack.name} seed={jack.id} labels={{ message: t("message") }} />
              </div>
            </div>
          </OfficeScene>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <OfficeScene pinned focus="center center" occupants={bare ? STROLLING_SMALL : STROLLING} className="absolute inset-0 h-full w-full" />

      {!bare && (
        <>
          <span className="absolute start-3 top-3 flex h-8 items-center gap-2 rounded-full border border-border bg-card/90 pe-1.5 ps-3 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
            <span className="size-1.5 rounded-full bg-ok" />
            <span className="text-[12px] font-medium text-foreground">{t("office")}</span>
            <span className="flex items-center gap-1 rounded-full bg-muted py-0.5 pe-1.5 ps-0.5 [--face-ring:var(--ui-muted)]">
              <FaceStack seeds={[sam, emma, olivia].map((one) => one.id)} size={16} max={3} />
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
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 p-1.5 pe-2 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
      <Face seed={seed} size={30} presence="available" />
      <span className="px-0.5 text-[12.5px] font-semibold text-foreground">{name}</span>
      <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
        <Video className="size-3.5" />
      </span>
      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <Mic className="size-3.5" />
      </span>
      <span title={labels.message} className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <MessageSquare className="size-3.5" />
      </span>
    </div>
  );
}
