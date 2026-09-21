import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Face, type Presence } from "./Face";

/**
 * A person as a pill: face, name, maybe a second line and something to press.
 * Compact on purpose — a name is a few words, not a row across the screen.
 */
export function PersonPill({
  id,
  name,
  detail,
  presence,
  trailing,
  size = "md",
  onClick,
  className,
}: {
  id: string;
  name: string;
  detail?: ReactNode;
  presence?: Presence;
  trailing?: ReactNode;
  size?: "sm" | "md";
  onClick?: () => void;
  className?: string;
}) {
  const face = size === "sm" ? 28 : 36;
  const body = (
    <>
      <Face seed={id} size={face} presence={presence} />
      <span className="min-w-0 flex-1 text-start">
        <span className={cn("block truncate text-foreground", size === "sm" ? "text-[13px]" : "text-[14px] font-medium")}>
          {name}
        </span>
        {detail && <span className="block truncate text-[12px] text-muted-foreground">{detail}</span>}
      </span>
      {trailing}
    </>
  );
  const classes = cn(
    "flex min-w-0 items-center gap-2.5 rounded-full border border-border bg-card p-1 pe-3 [--face-ring:var(--ui-card)]",
    size === "sm" && "gap-2 pe-2.5",
    onClick && "cursor-pointer transition-colors hover:bg-muted [&:hover]:[--face-ring:var(--ui-muted)]",
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
}
