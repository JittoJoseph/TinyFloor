import { cn } from "@/lib/utils";

/**
 * The curve where a tab of the frame meets the floor's edge, so the tab looks
 * grown out of the frame (the dock, at the floor's foot). `edge` is the floor's
 * edge the curve runs along, `tab` the side of the curve the tab is on; where
 * it sits is the caller's (its classes).
 */
export function Fillet({ edge, tab, className }: { edge: "top" | "bottom" | "left" | "right"; tab: "top" | "bottom" | "left" | "right"; className?: string }) {
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
      <path d={across ? "M12 0 A12 12 0 0 1 0 12 L13 12 L13 0 Z" : "M12 0 A12 12 0 0 1 0 12 L0 13 L12 13 Z"} className="fill-rail" />
      <path d="M12 0 A12 12 0 0 1 0 12" fill="none" className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
