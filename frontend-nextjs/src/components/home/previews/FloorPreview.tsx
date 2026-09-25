import { useTranslations } from "next-intl";
import { Mic, MonitorUp, Settings2, Video } from "lucide-react";
import { FaceStack } from "@/components/ui/Face";
import { FloorScene } from "@/components/floor/FloorScene";
import { HALL, PEOPLE } from "@/components/floor/scenes";
import { cn } from "@/lib/utils";

const { sam, emma, olivia } = PEOPLE;

/** The room's chip, top left: its name, and who is in. */
function RoomChip({ count, className }: { count: number; className?: string }) {
  const t = useTranslations("home.preview");
  return (
    <span
      className={cn(
        "pointer-events-none flex h-8 items-center gap-2 rounded-full border border-border bg-card pe-1.5 ps-3 shadow-float  [--face-ring:var(--ui-card)]",
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
function Dock({ className }: { className?: string }) {
  return (
    <span className={cn("pointer-events-none flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-float ", className)}>
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

const PEOPLE_IN_HALL = (HALL.standing?.length ?? 0) + (HALL.sitting?.length ?? 0);

/**
 * The floor, as the app shows it: the real map with people at their desks,
 * chatting and about the hall, the room's chip and the dock. `bare` is the
 * floor alone, for a small window.
 */
export function FloorPreview({ bare = false, priority = false, className }: { bare?: boolean; priority?: boolean; className?: string }) {
  if (bare) return <FloorScene {...HALL} view={[16, 3, 22, 14]} className={cn("h-full w-full", className)} />;

  return (
    <FloorScene
      {...HALL}
      priority={priority}
      className={cn("absolute inset-0 h-full w-full", className)}
      over={
        <>
          <RoomChip count={PEOPLE_IN_HALL} className="absolute start-3 top-3" />
          <Dock className="absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2" />
        </>
      }
    />
  );
}
