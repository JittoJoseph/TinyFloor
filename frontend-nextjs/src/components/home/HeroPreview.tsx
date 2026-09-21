"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PreviewView } from "./previews/Frame";

const VIEWS: PreviewView[] = ["floor", "chat", "people", "meeting"];
/** How long each view shows before the next, until someone picks one. */
const DWELL_MS = 7000;

/**
 * The hero's look inside the app. The four views, frames and all, are rendered
 * on the server and sent as markup; this only chooses which one shows. It moves on by itself
 * (not with reduced motion, and not while off screen) until a tab is pressed.
 */
export function HeroPreview({
  labels,
  icons,
  panels,
  label,
}: {
  labels: Record<PreviewView, string>;
  icons: Record<PreviewView, ReactNode>;
  panels: Record<PreviewView, ReactNode>;
  label: string;
}) {
  const [view, setView] = useState<PreviewView>("floor");
  const [picked, setPicked] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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
    <div ref={box}>
      <div className="flex justify-center">
        <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-0.5 rounded-full bg-foreground/[0.055] p-1 sm:gap-1">
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
                "relative flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-2.5 text-[13.5px] transition-colors sm:px-5 sm:text-[15px]",
                view === one
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--ui-border)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="hidden sm:inline-flex [&_svg]:size-[17px]">{icons[one]}</span>
              {labels[one]}
              {/* How long until the next view, while it is still moving on by itself. */}
              {view === one && !picked && (
                <span
                  aria-hidden
                  key={one}
                  className="home-dwell absolute inset-x-4 bottom-1 h-[2px] origin-left rounded-full bg-foreground/15 motion-reduce:hidden rtl:origin-right"
                  style={{ animationDuration: `${DWELL_MS}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="home-sky mt-5 rounded-[28px] p-2.5 sm:mt-6 sm:p-8 lg:px-14 lg:pb-14 lg:pt-12">
        {VIEWS.map((one) => (
          <div
            key={one}
            role="tabpanel"
            id={`hero-panel-${one}`}
            aria-labelledby={`hero-tab-${one}`}
            hidden={view !== one}
            className="home-fade"
          >
            {panels[one]}
          </div>
        ))}
      </div>
    </div>
  );
}
