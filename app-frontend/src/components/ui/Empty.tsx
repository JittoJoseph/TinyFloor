import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Where there is nothing yet, say what would fill it and offer the way to do
 * that — invite someone, make the first link — rather than just "none".
 */
export function Empty({
  icon,
  art,
  title,
  body,
  actions,
  compact = false,
  className,
}: {
  icon?: ReactNode;
  /** Something richer than an icon: faces, a sketch of what will be here. */
  art?: ReactNode;
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border-strong text-center",
        compact ? "gap-2 px-4 py-5" : "gap-3 px-6 py-10",
        className,
      )}
    >
      {art ??
        (icon && (
          <span
            className={cn(
              "flex items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)]",
              compact ? "size-9 [&_svg]:size-4" : "size-12 [&_svg]:size-5",
            )}
          >
            {icon}
          </span>
        ))}
      <div className="max-w-sm">
        <p className={cn("font-semibold text-foreground", compact ? "text-[13.5px]" : "text-[15px]")}>{title}</p>
        {body && (
          <p className={cn("mt-1 leading-relaxed text-muted-foreground", compact ? "text-[12.5px]" : "text-[13.5px]")}>{body}</p>
        )}
      </div>
      {actions && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}

/** A small rounded button for the actions inside an empty state or an intro. */
export function Chip({
  children,
  onClick,
  icon,
  solid,
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-[background-color,transform] active:scale-[0.97] [&_svg]:size-3.5",
        solid
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "border border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
