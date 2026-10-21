"use client";

import { createContext, useContext, useState, type ReactElement, type ReactNode } from "react";
import { Check } from "@/components/ui/icons";
import { MorphPopover, MorphPopoverContent, MorphPopoverTrigger } from "@/components/motion/popover-morph";
import { cn } from "@/lib/utils";

const CloseMenu = createContext<() => void>(() => {});

/** Closes the menu this is inside, for something in it that opens elsewhere; outside a menu it does nothing. */
export const useCloseMenu = () => useContext(CloseMenu);

/**
 * A menu that grows out of its trigger (beUI's morph popover). Items close it
 * when chosen; everything inside is ordinary buttons, so keyboards just work.
 */
export function Menu({
  trigger,
  children,
  side = "bottom",
  align = "end",
  className,
  width = 240,
  offset = 8,
  within,
  rootClassName,
  onOpenChange,
}: {
  trigger: ReactElement;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
  width?: number;
  /** Gap between the trigger and the menu. */
  offset?: number;
  /** Opens inside this element, in its corner nearest the trigger: a rail menu, in the corner of the shell's panel. */
  within?: HTMLElement | null;
  /** For the wrapper around the trigger, when the trigger should stretch. */
  rootClassName?: string;
  /** Told when it opens or closes, for a menu that resets what it shows. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  return (
    <MorphPopover open={open} onOpenChange={setOpen} className={rootClassName}>
      <MorphPopoverTrigger>{trigger}</MorphPopoverTrigger>
      <MorphPopoverContent side={side} align={align} sideOffset={offset} within={within} className={cn("bg-popover p-1.5", className)}>
        <div style={{ width }} className="flex flex-col">
          <CloseMenu.Provider value={() => setOpen(false)}>{children}</CloseMenu.Provider>
        </div>
      </MorphPopoverContent>
    </MorphPopover>
  );
}

export function MenuItem({
  onSelect,
  icon,
  children,
  hint,
  checked,
  danger,
  disabled,
}: {
  onSelect?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  /** Something quiet on the right: a shortcut, a count. */
  hint?: ReactNode;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const close = useContext(CloseMenu);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
        close();
      }}
      className={cn(
        "group flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 text-start text-[13px] outline-none transition-colors",
        "hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-40",
        danger ? "text-destructive" : "text-foreground",
      )}
    >
      {icon && (
        <span className={cn("flex size-4 shrink-0 items-center justify-center", danger ? "" : "text-muted-foreground")}>{icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="shrink-0 text-[12px] text-faint">{hint}</span>}
      {checked !== undefined && <Check className={cn("size-4 shrink-0 text-foreground", checked ? "opacity-100" : "opacity-0")} />}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-faint">{children}</p>;
}

export function MenuSeparator() {
  return <span aria-hidden className="mx-1 my-1 h-px bg-border" />;
}

/** Something that is not an action: who you are, at the top of your menu. */
export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-2 pt-1.5">{children}</div>;
}
