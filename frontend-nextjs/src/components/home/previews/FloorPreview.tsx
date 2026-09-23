import { useTranslations } from "next-intl";
import { Mic, MonitorUp, MousePointerClick, Settings2, Video } from "lucide-react";
import { FaceStack } from "@/components/ui/Face";
import { FloorScene } from "@/components/floor/FloorScene";
import { NearbyBar, PlayableYou } from "@/components/floor/PlayableYou";
import { HALL, NEAR, PEOPLE } from "@/components/floor/scenes";
import { cn } from "@/lib/utils";

const { sam, emma, olivia, jack, lily } = PEOPLE;

/** The room's chip, top left: its name, and who is in. */
export function RoomChip({ count, className }: { count: number; className?: string }) {
  const t = useTranslations("home.preview");
  return (
    <span
      className={cn(
        "pointer-events-none flex h-8 items-center gap-2 rounded-full border border-border bg-card/90 pe-1.5 ps-3 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-ok" />
      <span className="text-[12px] font-medium text-foreground">{t("office")}</span>
      <span className="flex items-center gap-1 rounded-full bg-muted py-0.5 pe-1.5 ps-0.5 [--face-ring:var(--ui-muted)]">
        <FaceStack seeds={[sam, emma, olivia].map((one) => one.id)} size={16} max={3} />
        <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">{count}</span>
      </span>
    </span>
  );
}

/** The dock along the bottom: mic, camera (off), screen, settings. */
export function Dock({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-float backdrop-blur-md", className)}>
      {[Mic, Video, MonitorUp].map((Icon, index) => (
        <span
          key={index}
          className={cn("flex size-7 items-center justify-center rounded-full", index === 1 ? "bg-destructive/12 text-destructive" : "text-foreground")}
        >
          <Icon className="size-3.5" />
        </span>
      ))}
      <span className="mx-0.5 h-4 w-px bg-border" />
      <span className="flex size-7 items-center justify-center rounded-full text-muted-foreground">
        <Settings2 className="size-3.5" />
      </span>
    </span>
  );
}

const PEOPLE_IN_HALL = (HALL.standing?.length ?? 0) + (HALL.sitting?.length ?? 0) + (HALL.walking?.length ?? 0);

/**
 * The floor, as the app shows it: the real map with people at their desks,
 * chatting and walking around, the room's chip and the dock. `playable` puts
 * you on it too, to walk wherever you click. `near` leans in on two people
 * who have walked up to each other, with the bar the app puts beside someone
 * you're close to; `bare` is the floor alone, for a small window.
 */
export function FloorPreview({
  near = false,
  bare = false,
  playable = false,
  priority = false,
  className,
}: {
  near?: boolean;
  bare?: boolean;
  playable?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations("home.preview");
  const labels = { video: t("video"), audio: t("audio"), message: t("message") };

  if (near) {
    return (
      <FloorScene
        {...NEAR}
        className={cn("h-full w-full", className)}
        over={
          <div className="absolute inset-x-0 bottom-5 flex justify-center">
            <NearbyBar name={jack.name} seed={jack.id} labels={labels} />
          </div>
        }
      />
    );
  }

  if (bare) return <FloorScene {...HALL} view={[16, 3, 22, 14]} className={cn("h-full w-full", className)} />;

  return (
    <FloorScene
      {...HALL}
      priority={priority}
      playable={playable ? t("playable") : undefined}
      className={cn("absolute inset-0 h-full w-full", className)}
      over={
        <>
          <RoomChip count={PEOPLE_IN_HALL + (playable ? 1 : 0)} className="absolute start-3 top-3" />
          <Dock className="absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2" />
        </>
      }
    >
      {playable && (
        <PlayableYou
          start={[26, 14]}
          character="Alex"
          name={t("you")}
          labels={labels}
          neighbours={[
            { name: jack.name, seed: jack.id, at: [36, 10] },
            { name: olivia.name, seed: olivia.id, at: [38, 10] },
            { name: sam.name, seed: sam.id, at: [20, 10] },
            { name: lily.name, seed: lily.id, at: [34, 15] },
          ]}
          hint={
            <span className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium text-background shadow-float">
              <MousePointerClick className="size-3.5" />
              {t("clickToWalk")}
            </span>
          }
        />
      )}
    </FloorScene>
  );
}
