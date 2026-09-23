import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChatsCircleIcon, GearSixIcon, MapTrifoldIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

export type PreviewView = "floor" | "chat" | "people" | "meeting";

/** Stand-in people for the previews. Faces come from these ids, like the app's do. */
export const CAST = [
  { id: "maya-12", name: "Emma", character: "Amelia" },
  { id: "leo-21", name: "Jack", character: "Adam" },
  { id: "priya-25", name: "Olivia", character: "Lucy" },
  { id: "sam-20", name: "Sam", character: "Bob" },
  { id: "aiko-6", name: "Lily", character: "Molly" },
  { id: "noah-20", name: "Noah", character: "Dan" },
] as const;

/** The stand-in office's mark. */
const OFFICE_SEED = "northwind-7";

const RAIL: Array<{ view: PreviewView; icon: typeof MapTrifoldIcon }> = [
  { view: "floor", icon: MapTrifoldIcon },
  { view: "chat", icon: ChatsCircleIcon },
  { view: "people", icon: UsersThreeIcon },
];

/**
 * The app's shell in miniature, drawn with the app's own tokens: the rail on
 * the left with the office's mark, and a panel for whichever view is showing.
 * Static markup only; nothing here runs in the browser.
 */
export function Frame({
  active,
  children,
  className,
  rail = true,
}: {
  active: PreviewView;
  children: ReactNode;
  className?: string;
  rail?: boolean;
}) {
  const t = useTranslations("home.hero");
  return (
    <div
      className={cn(
        "font-(family-name:--font-app) [font-feature-settings:'cv11','ss01'] flex overflow-hidden rounded-[18px] border border-border bg-rail text-start [--face-ring:var(--ui-rail)]",
        "shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_64px_-28px_rgb(0_0_0/0.28)]",
        className,
      )}
    >
      {rail && (
        <div className="hidden w-14 shrink-0 flex-col items-center gap-2 py-3 sm:flex">
          <Face seed={OFFICE_SEED} size={32} square />
          <span className="my-1 h-px w-6 bg-border" />
          {RAIL.map(({ view, icon: Icon }) => {
            const on = view === active || (active === "meeting" && view === "floor");
            // Buttons, as in the app: where the preview can change views (the hero's), a press here does.
            return (
              <button
                key={view}
                type="button"
                data-view={view}
                aria-label={t(`tabs.${view}`)}
                aria-pressed={on}
                className={cn(
                  "relative flex size-9 cursor-pointer items-center justify-center rounded-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                  on ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)] dark:bg-muted" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
                )}
              >
                {on && <span className="absolute -start-2.5 h-5 w-[3px] rounded-e-full bg-foreground" />}
                <Icon size={19} weight={on ? "fill" : "regular"} />
              </button>
            );
          })}
          <span className="mt-auto flex size-9 items-center justify-center text-muted-foreground">
            <GearSixIcon size={18} />
          </span>
          <Face seed={CAST[0].id} size={28} presence="available" />
        </div>
      )}
      <div className="relative m-1.5 min-w-0 flex-1 overflow-hidden rounded-[13px] border border-border bg-card [--face-ring:var(--ui-card)] sm:ms-0">
        {children}
      </div>
    </div>
  );
}
