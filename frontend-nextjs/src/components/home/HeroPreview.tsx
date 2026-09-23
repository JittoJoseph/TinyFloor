"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PreviewView } from "./previews/Frame";

const VIEWS: PreviewView[] = ["floor", "chat", "people", "meeting"];
/** How long each view shows before the next, until someone picks one. */
const DWELL_MS = 6500;

/**
 * The hero's look inside the app. The four views, frames and all, are rendered
 * on the server and sent as markup; this only chooses which one shows. It moves on by itself
 * (not with reduced motion, and not while off screen) until a tab is pressed.
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
  const [picked, setPicked] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Off screen, everything on the floor holds still: no walking, no idle frames, nothing to paint.
  useEffect(() => {
    if (!box.current) return;
    const watch = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);

  /** Fills the active tab's line over the dwell, with the Web Animations API rather than a stylesheet. */
  const fill = (line: HTMLSpanElement | null) => {
    line?.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: DWELL_MS, fill: "forwards" });
  };

  useEffect(() => {
    if (picked || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const watch = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    if (box.current) watch.observe(box.current);
    const timer = setInterval(() => {
      if (visible && document.visibilityState === "visible") {
        setView((current) => VIEWS[(VIEWS.indexOf(current) + 1) % VIEWS.length]);
      }
    }, DWELL_MS);
    return () => {
      clearInterval(timer);
      watch.disconnect();
    };
  }, [picked]);

  return (
    <div
      ref={box}
      data-paused={offscreen || undefined}
      className="rounded-[26px] border border-border bg-muted/60 p-1.5 sm:p-2 [&[data-paused]_*]:[animation-play-state:paused]"
    >
      <div role="tablist" aria-label={label} className="grid grid-cols-4 gap-1 p-0.5">
        {VIEWS.map((one) => (
          <button
            key={one}
            type="button"
            role="tab"
            id={`hero-tab-${one}`}
            aria-selected={view === one}
            aria-controls={`hero-panel-${one}`}
            onClick={() => {
              setPicked(true);
              setView(one);
            }}
            className={cn(
              "relative h-9 cursor-pointer overflow-hidden whitespace-nowrap rounded-full px-1 text-[12.5px] font-medium transition-colors sm:h-10 sm:text-[13.5px]",
              view === one
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--ui-border)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[one]}
            {/* How long until the next view, while it is still moving on by itself. */}
            {view === one && !picked && (
              <span
                aria-hidden
                key={one}
                ref={fill}
                className="absolute inset-x-5 bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-foreground/15 motion-reduce:hidden rtl:origin-right"
              />
            )}
          </button>
        ))}
      </div>
      {/* Walking the floor, or any touch on a panel, keeps it where it is. */}
      <div
        className="mt-1.5 sm:mt-2"
        onPointerDown={() => setPicked(true)}
        onKeyDown={() => setPicked(true)}
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
