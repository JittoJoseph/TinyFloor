import { PixelAvatar } from "@/components/PixelAvatar";
import { statusColor } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * A character from the chest up, in a frame: how someone looks on the floor,
 * small enough for a list. The sprite hangs from its feet, so they go below
 * the frame and the head lands in the middle.
 */
export function Bust({
  character,
  size,
  status,
  className,
  rounded = "rounded-full",
}: {
  character: string;
  size: number;
  /** A presence dot in the corner, in the status colours the floor uses. */
  status?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <span className={cn("relative block shrink-0", className)} style={{ width: size, height: size }}>
      <span className={cn("absolute inset-0 overflow-hidden bg-muted", rounded)}>
        <PixelAvatar character={character} width={size * 0.95} style={{ left: "50%", top: size * 1.32 }} />
      </span>
      {status && (
        <span
          className="absolute -bottom-px -end-px size-2.5 rounded-full ring-2 ring-[var(--face-ring,var(--ui-card))]"
          style={{ backgroundColor: statusColor(status) }}
        />
      )}
    </span>
  );
}
