import { useId } from "react";
import { cn } from "web-shared/lib/utils";

/** An eased fade, as [where from the edge (%), how much of the frame (%)]: smoothstep, so it starts and ends without a line. */
export const FADE_STOPS: readonly (readonly [number, number])[] = [
  [0, 100],
  [25, 84],
  [50, 50],
  [75, 16],
  [100, 0],
];

/**
 * The curve where a tab of the frame meets the floor's edge, so the tab looks
 * grown out of the frame (the dock, at the floor's foot). `edge` is the floor's
 * edge the curve runs along, `tab` the side of the curve the tab is on; where
 * it sits is the caller's (its classes). With `fade`, its last that many
 * pixels ease into the frame's colour, as the tab's own foot does (the dock).
 */
export function Fillet({
  edge,
  tab,
  className,
  fade,
}: {
  edge: "top" | "bottom" | "left" | "right";
  tab: "top" | "bottom" | "left" | "right";
  className?: string;
  fade?: number;
}) {
  const id = useId();
  // One curve along a top or bottom edge (the tab beside it), one along a left or right edge (the tab above or below), each turned to fit.
  const across = edge === "top" || edge === "bottom";
  const flipX = across ? tab === "left" : edge === "left";
  const flipY = across ? edge === "top" : tab === "top";
  return (
    <svg
      aria-hidden
      width={across ? 13 : 12}
      height={across ? 12 : 13}
      viewBox={across ? "0 0 13 12" : "0 0 12 13"}
      className={cn("pointer-events-none absolute", className)}
      style={{ transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})` }}
    >
      {fade && (
        <defs>
          {/* Drawn as for a bottom edge, the edge at the foot; turned with the rest for the others. */}
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={across ? 12 : 13} x2="0" y2={(across ? 12 : 13) - fade}>
            {FADE_STOPS.map(([at, frame]) => (
              <stop key={at} offset={`${at}%`} style={{ stopColor: `color-mix(in oklab, var(--ui-frame) ${frame}%, var(--ui-rail))` }} />
            ))}
          </linearGradient>
        </defs>
      )}
      <path
        d={across ? "M12 0 A12 12 0 0 1 0 12 L13 12 L13 0 Z" : "M12 0 A12 12 0 0 1 0 12 L0 13 L12 13 Z"}
        className={fade ? undefined : "fill-rail"}
        fill={fade ? `url(#${id})` : undefined}
      />
      <path d="M12 0 A12 12 0 0 1 0 12" fill="none" className="stroke-edge" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
