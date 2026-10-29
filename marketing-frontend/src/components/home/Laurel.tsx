import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * A laurel: two branches around a short line, the way an award is set. The
 * branch is our own: leaves set along a stem bent on a circle's arc,
 * alternating out and in and smaller towards the tip, and the right branch is
 * the left one mirrored. As it scrolls in, the stem grows up from its base and
 * the leaves open along it one after another, each from where it joins the
 * stem; then whatever in the middle wears `laurel-mark` arrives, and any split
 * words beside it after that (globals.css). What it scrolls in with is the
 * part around it that carries `data-reveal-laurel`.
 */

const STEM =
  "M15.63 50.36L14.7 49.85 13.8 49.3 12.93 48.71 12.09 48.08 11.27 47.41 10.49 46.7 9.75 45.96 9.03 45.19 8.36 44.38 7.72 43.55 7.12 42.68 6.57 41.79 6.05 40.88 5.58 39.94 5.15 38.98 4.77 38.01 4.43 37.02 4.14 36.01 3.89 34.99 3.69 33.97 3.55 32.93 3.44 31.89 3.39 30.85 3.38 29.8 3.43 28.76 3.52 27.72 3.66 26.69 3.84 25.66 4.08 24.64 4.36 23.64 4.68 22.65 5.05 21.68 5.47 20.72 5.93 19.79 6.43 18.88 6.97 17.99 7.55 17.13 8.18 16.3 8.83 15.5 9.53 14.73 10.26 13.99 11.02 13.29 11.81 12.62 12.64 12 13.49 11.41 14.36 10.86 15.27 10.35 16.19 9.88 16.52 10.57 15.64 11.04 14.78 11.54 13.95 12.09 13.14 12.67 12.36 13.29 11.61 13.95 10.89 14.64 10.2 15.36 9.55 16.11 8.94 16.89 8.36 17.69 7.82 18.53 7.31 19.38 6.85 20.26 6.43 21.16 6.05 22.08 5.72 23.01 5.43 23.95 5.18 24.91 4.98 25.88 4.82 26.86 4.71 27.84 4.64 28.83 4.62 29.81 4.64 30.8 4.71 31.78 4.83 32.76 4.98 33.74 5.19 34.7 5.44 35.65 5.73 36.59 6.07 37.52 6.44 38.43 6.86 39.32 7.32 40.19 7.82 41.03 8.36 41.85 8.93 42.65 9.54 43.42 10.18 44.16 10.86 44.87 11.57 45.54 12.31 46.18 13.08 46.79 13.87 47.36 14.69 47.9 15.53 48.39 16.4 48.84Z";

/** Each leaf, from the base of the branch to its tip: where it joins the stem, and its shape. */
const LEAVES: Array<[x: number, y: number, d: string]> = [
  [15, 49.05, "M15 49.05Q9.82 44.3 4.54 50.01Q10.62 53.08 15 49.05Z"],
  [13.49, 48.1, "M13.49 48.1Q14.03 43.92 9.85 41.47Q8.73 46.83 13.49 48.1Z"],
  [10.31, 45.42, "M10.31 45.42Q6.77 39.74 0.47 43.64Q5.27 48.01 10.31 45.42Z"],
  [9.11, 44.1, "M9.11 44.1Q10.66 40.4 7.46 37.09Q5.06 41.72 9.11 44.1Z"],
  [6.76, 40.67, "M6.76 40.67Q4.96 34.57-1.8 36.53Q1.49 41.75 6.76 40.67Z"],
  [5.96, 39.07, "M5.96 39.07Q8.32 36.08 6.22 32.24Q2.85 35.87 5.96 39.07Z"],
  [4.61, 35.14, "M4.61 35.14Q4.51 29.11-2.16 29.2Q-0.48 34.79 4.61 35.14Z"],
  [4.26, 33.38, "M4.26 33.38Q7.17 31.25 6.23 27.21Q2.24 29.68 4.26 33.38Z"],
  [4.01, 29.23, "M4.01 29.23Q5.44 23.72-0.64 22.12Q-0.53 27.64 4.01 29.23Z"],
  [4.15, 27.45, "M4.15 27.45Q7.34 26.25 7.5 22.33Q3.24 23.57 4.15 27.45Z"],
  [5.02, 23.38, "M5.02 23.38Q7.7 18.75 2.58 15.76Q1.3 20.79 5.02 23.38Z"],
  [5.62, 21.71, "M5.62 21.71Q8.82 21.41 9.95 17.9Q5.78 17.95 5.62 21.71Z"],
  [7.55, 18.02, "M7.55 18.02Q11.13 14.5 7.26 10.52Q4.84 14.75 7.55 18.02Z"],
  [8.58, 16.56, "M8.58 16.56Q11.54 17.1 13.44 14.21Q9.66 13.21 8.58 16.56Z"],
  [11.42, 13.52, "M11.42 13.52Q15.52 11.25 13.03 6.71Q9.8 9.9 11.42 13.52Z"],
  [12.81, 12.4, "M12.81 12.4Q15.33 13.62 17.77 11.5Q14.61 9.65 12.81 12.4Z"],
  [16.36, 10.23, "M16.36 10.23Q20.59 9.21 19.49 4.53Q15.8 6.59 16.36 10.23Z"],
  [16.36, 10.23, "M16.36 10.23Q20.43 13.16 23.69 8.67Q19.12 7 16.36 10.23Z"],
];

/** The viewBox's corner, which a leaf's turning point is measured from. */
const LEFT = -2.7;
const TOP = 4;

function Branch({ className }: { className?: string }) {
  return (
    <svg viewBox={`${LEFT} ${TOP} 26.9 49.5`} fill="currentColor" aria-hidden className={cn("h-14 w-auto shrink-0 overflow-visible sm:h-16", className)}>
      <path d={STEM} className="laurel-stem" />
      {LEAVES.map(([x, y, d], i) => (
        <path key={i} d={d} className="laurel-leaf" style={{ "--i": i, transformOrigin: `${x - LEFT}px ${y - TOP}px` } as CSSProperties} />
      ))}
    </svg>
  );
}

export function Laurel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4 text-[color-mix(in_oklab,var(--ui-foreground)_62%,var(--ui-background))]", className)}>
      <Branch />
      <div className="flex flex-col items-center gap-1.5 text-center">{children}</div>
      <Branch className="-scale-x-100" />
    </div>
  );
}
