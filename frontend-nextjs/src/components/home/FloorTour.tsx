"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FloorScene, type Sitter, type Stander, type Walker } from "@/components/floor/FloorScene";
import { cn } from "@/lib/utils";

export interface TourStop {
  key: string;
  /** What it's called, with its icon: the tab. */
  label: string;
  icon: ReactNode;
  title: string;
  body: string;
  /** Where the camera looks for this one, in tiles. Every stop's view is the same size, so moving between them is a pan. */
  view: [number, number, number, number];
  /** A closer view for a phone's narrow floor, so people stay the size they are in the app. */
  narrow?: [number, number, number, number];
  /** The app's own chip or bar for this moment, over the floor. */
  overlay?: ReactNode;
  /** A link to the page with this #hash lands on this stop, as the nav's do. */
  hash?: string;
  /** Which side the card floats on: away from where the moment happens. */
  side?: "start" | "end";
}

/** How long each stop shows before the next, until someone picks one. */
const DWELL_MS = 7000;

/**
 * One floor, and the camera taking you round it: a row of pills names the
 * moments, and picking one pans the real map to where it happens, the app's
 * chip for it appearing over the floor and a card saying what it is, floating
 * the way the app's panels do. It moves on by itself (not with reduced motion,
 * not while off screen) until someone picks a stop.
 */
export function FloorTour({
  stops,
  scene,
  label,
}: {
  stops: TourStop[];
  scene: { standing?: Stander[]; sitting?: Sitter[]; walking?: Walker[] };
  label: string;
}) {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(false);
  const [offscreen, setOffscreen] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const watch = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.35 });
    watch.observe(box.current);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    const media = matchMedia("(max-width: 639px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Arriving from a link to one of the stops (the nav's "Meetings", say) opens that stop.
  useEffect(() => {
    const open = () => {
      const index = stops.findIndex((one) => one.hash && `#${one.hash}` === location.hash);
      if (index < 0) return;
      setActive(index);
      setPicked(true);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [stops]);

  useEffect(() => {
    if (picked || offscreen || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setActive((current) => (current + 1) % stops.length), DWELL_MS);
    return () => clearTimeout(timer);
  }, [active, picked, offscreen, stops.length]);

  const stop = stops[active];
  return (
    <div
      ref={box}
      data-paused={offscreen || undefined}
      className="relative rounded-[30px] border border-border bg-muted/50 p-1.5 sm:p-2 [&[data-paused]_*]:[animation-play-state:paused]"
    >
      {stops.map((one) => one.hash && <span key={one.hash} id={one.hash} aria-hidden className="absolute -top-28" />)}
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto p-0.5 [scrollbar-width:none]">
        {stops.map((one, index) => (
          <button
            key={one.key}
            type="button"
            role="tab"
            id={`tour-tab-${one.key}`}
            aria-selected={index === active}
            aria-controls="tour-panel"
            onClick={() => {
              setPicked(true);
              setActive(index);
            }}
            className={cn(
              "relative flex h-10 shrink-0 cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-4 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex-1 sm:justify-center [&_svg]:size-4",
              index === active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--ui-border)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("transition-colors", index === active ? "text-brand" : "text-current")}>{one.icon}</span>
            {one.label}
            {/* How long until it moves on, while it still does by itself. */}
            {index === active && !picked && !offscreen && (
              <span
                aria-hidden
                key={`${one.key}-${active}`}
                className="absolute inset-x-6 bottom-1 h-[2px] origin-left rounded-full bg-foreground/15 motion-reduce:hidden rtl:origin-right"
                style={{ animation: `tour-fill ${DWELL_MS}ms linear forwards` }}
              />
            )}
          </button>
        ))}
      </div>
      <style>{"@keyframes tour-fill{from{scale:0 1}to{scale:1 1}}"}</style>

      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${stop.key}`} className="relative mt-1.5 sm:mt-2">
        <FloorScene glide {...scene} view={(narrow && stop.narrow) || stop.view} className="aspect-[4/3] w-full rounded-[24px] sm:aspect-[16/8.5]" />
        {/* Every moment's chip stays mounted, so its animation keeps time with the floor's people; only the active one shows. */}
        {stops.map((one, index) => (
          <div
            key={one.key}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-3 flex justify-center transition-opacity duration-500 motion-reduce:transition-none sm:top-4",
              index === active ? "opacity-100 delay-500" : "opacity-0",
            )}
          >
            {one.overlay}
          </div>
        ))}
        {/* What this is, floating over the floor the way the app's panels do. All four are in the page; one shows. */}
        {stops.map((one, index) => (
          <div
            key={one.key}
            hidden={index !== active}
            className={cn(
              "mt-1.5 rounded-[20px] border border-border bg-card p-5 transition-[opacity,translate] duration-500 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:absolute sm:bottom-5 sm:mt-0 sm:w-[23rem] sm:p-6 sm:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_48px_-24px_rgb(0_0_0/0.4)]",
              one.side === "end" ? "sm:end-5" : "sm:start-5",
            )}
          >
            <h3 className="text-balance text-[19px] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[21px]">{one.title}</h3>
            <p className="mt-2 text-pretty text-[14.5px] leading-relaxed text-muted-foreground sm:text-[15px]">{one.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
