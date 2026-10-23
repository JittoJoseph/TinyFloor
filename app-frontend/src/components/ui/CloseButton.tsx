"use client";

import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Closing a dialog, sheet or panel: the same control everywhere. A filled
 * circle, so it reads as a button before it's pointed at, with a heavier
 * cross than the icons around it; darker under the pointer, pressing in when
 * pressed.
 */
export function CloseButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-close
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground/[0.07] text-muted-foreground transition-[background-color,color,transform] duration-150",
        "hover:bg-foreground/[0.12] hover:text-foreground active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <X className="size-[15px]" strokeWidth={2.4} />
    </button>
  );
}
