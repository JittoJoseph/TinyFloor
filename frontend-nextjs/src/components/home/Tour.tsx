"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE } from "@/components/floor/scenes";
import { cn } from "@/lib/utils";

export interface Stop {
  key: string;
  /** The part of the floor the camera moves to, in tiles. */
  view: [number, number, number, number];
  title: string;
  body: string;
  /** The app's own chip or bar for this stop, laid over the floor. */
  overlay?: ReactNode;
}

/**
 * A walk through the floor: the words scroll past while the floor holds
 * still beside them (above them on a phone), and each stop the reader
 * reaches glides the camera to that room. The floor is the real map with
 * the whole office on it; the only script here is which stop is in view.
 */
export function Tour({ stops, you, className }: { stops: Stop[]; you: string; className?: string }) {
  const [active, setActive] = useState(0);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      // The line a little under the middle of the screen, below a phone's pinned floor.
      { rootMargin: "-58% 0px -40% 0px" },
    );
    items.current.forEach((one) => one && watch.observe(one));
    return () => watch.disconnect();
  }, []);

  return (
    <div className={cn("grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16", className)}>
      <div className="sticky top-16 z-10 -mx-5 bg-background px-5 pb-4 pt-3 sm:-mx-8 sm:px-8 lg:order-2 lg:top-28 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0">
        <div className="relative overflow-hidden rounded-[22px] border border-border shadow-[0_30px_80px_-40px_rgb(0_0_0/0.4)] lg:rounded-[28px]">
          <FloorScene
            glide
            {...EVERYONE}
            // You, having walked up to Olivia in the aisle.
            standing={[...(EVERYONE.standing ?? []), { character: "Ash", name: you, at: [40, 10], face: "left", status: "available" }]}
            view={stops[active].view}
            className="aspect-[16/10] w-full lg:aspect-[4/3]"
          />
          {stops.map((stop, index) => (
            <div
              key={stop.key}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 transition-[opacity,translate] duration-500 motion-reduce:transition-none",
                active === index ? "translate-y-0 opacity-100 delay-700" : "translate-y-1 opacity-0",
              )}
            >
              {stop.overlay}
            </div>
          ))}
        </div>
        {/* Where you are on the walk. */}
        <div className="mt-4 flex justify-center gap-1.5 lg:hidden" aria-hidden>
          {stops.map((stop, index) => (
            <span key={stop.key} className={cn("h-1.5 rounded-full transition-all duration-300", active === index ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20")} />
          ))}
        </div>
      </div>
      <ol className="lg:order-1">
        {stops.map((stop, index) => (
          <li
            key={stop.key}
            id={stop.key}
            ref={(el) => {
              items.current[index] = el;
            }}
            data-index={index}
            className={cn(
              "flex min-h-[52vh] scroll-mt-24 flex-col justify-center transition-opacity duration-500 lg:min-h-[72vh]",
              active === index ? "opacity-100" : "opacity-30",
            )}
          >
            <span className="font-(family-name:--font-app) text-[13px] font-semibold tabular-nums text-brand">{String(index + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-balance text-[27px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[34px]">{stop.title}</h3>
            <p className="mt-4 max-w-[30rem] text-pretty text-[16.5px] leading-relaxed text-muted-foreground sm:text-[17px]">{stop.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
