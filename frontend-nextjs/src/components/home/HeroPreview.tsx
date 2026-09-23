"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PreviewView } from "./previews/Frame";

const VIEWS: PreviewView[] = ["floor", "chat", "people", "meeting"];
/** How long each view shows before the next, until someone picks one. */
const DWELL_MS = 6500;

/**
 * The hero's look inside the app. The four views, frames and all, are rendered
 * on the server and sent as markup; this only chooses which one shows. It moves
 * on by itself: a line under each tab fills while the view shows, and the next
 * one comes when it's full. Pressing a tab or the rail shows that view and
 * carries on from it. The fill is a
 * CSS animation, so it holds still with everything else while off screen, and
 * doesn't run at all with reduced motion.
 */
export function HeroPreview({
  labels,
  panels,
  label,
}: {
  labels: Record<PreviewView, string>;
  panels: Record<PreviewView, ReactNode>;
  label: string;
}) {
  const [view, setView] = useState<PreviewView>("floor");
  const [offscreen, setOffscreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // The nav's "Meetings" links here: arriving by it opens the meeting view.
  useEffect(() => {
    const open = () => {
      if (location.hash !== "#meetings") return;
      setView("meeting");
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  // Off screen, everything on the floor holds still: no walking, no idle frames, nothing to paint.
  useEffect(() => {
    if (!box.current) return;
    const watch = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);

  return (
    <div
      ref={box}
      data-paused={offscreen || undefined}
      style={{ ["--dwell" as string]: `${DWELL_MS}ms` }}
      className="relative rounded-[26px] border border-border bg-muted/60 p-1.5 sm:p-2 [&[data-paused]_*]:[animation-play-state:paused]"
    >
      <span id="meetings" aria-hidden className="absolute -top-24" />
      <div role="tablist" aria-label={label} className="grid grid-cols-4 gap-1 p-0.5">
        {VIEWS.map((one) => (
          <button
            key={one}
            type="button"
            role="tab"
            id={`hero-tab-${one}`}
            aria-selected={view === one}
            aria-controls={`hero-panel-${one}`}
            onClick={() => setView(one)}
            className={cn(
              "relative h-9 cursor-pointer overflow-hidden whitespace-nowrap rounded-full px-1 text-[12.5px] font-medium transition-colors sm:h-10 sm:text-[13.5px]",
              view === one
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--ui-border)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[one]}
            {/* Every tab's track; the showing one fills, and moves on when full. */}
            <span aria-hidden className="absolute inset-x-4 bottom-1 h-[2px] overflow-hidden rounded-full bg-foreground/10 motion-reduce:hidden sm:inset-x-6">
              {view === one && (
                <span
                  key={one}
                  className="block h-full origin-left animate-[hero-fill_var(--dwell)_linear_forwards] rounded-full bg-foreground/55 rtl:origin-right"
                  onAnimationEnd={() => setView(VIEWS[(VIEWS.indexOf(one) + 1) % VIEWS.length])}
                />
              )}
            </span>
          </button>
        ))}
      </div>
      <div
        className="mt-1.5 sm:mt-2"
        onClick={(event) => {
          // The rail inside each view is the app's own way between them.
          const rail = (event.target as HTMLElement).closest<HTMLElement>("[data-view]");
          const next = rail?.dataset.view as PreviewView | undefined;
          if (next && VIEWS.includes(next)) setView(next);
        }}
      >
        {VIEWS.map((one) => (
          <div
            key={one}
            role="tabpanel"
            id={`hero-panel-${one}`}
            aria-labelledby={`hero-tab-${one}`}
            hidden={view !== one}
            className="transition-[opacity,translate] duration-300 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            {panels[one]}
          </div>
        ))}
      </div>
    </div>
  );
}
