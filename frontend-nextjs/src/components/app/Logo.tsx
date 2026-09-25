import { cn } from "@/lib/utils";

/** The mark for the lobby and anywhere the product speaks for itself: a floor tile, from above. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-[30%] bg-foreground text-background", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" width={size * 0.5} height={size * 0.5} shapeRendering="crispEdges">
        <rect x="1" y="1" width="6" height="6" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.45" />
        <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.45" />
        <rect x="9" y="9" width="6" height="6" fill="var(--ui-brand)" />
      </svg>
    </span>
  );
}
