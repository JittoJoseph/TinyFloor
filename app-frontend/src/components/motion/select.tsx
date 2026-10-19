"use client";

import { Check, ChevronDown } from "@/components/ui/icons";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePopoverPortalPosition } from "@/components/motion/popover-position";
import { cn } from "@/lib/utils";

type Placement = "bottom" | "top";

/** Gap between the field and its list. */
const GAP = 6;

interface SelectContextValue {
  value: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labelFor: (value: string | undefined) => string | undefined;
  triggerId: string;
  listId: string;
  disabled: boolean;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  listRef: React.MutableRefObject<HTMLDivElement | null>;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error(`${component} must be used within <Select>`);
  return ctx;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Controlled open state of the list. */
  open?: boolean;
  /** Uncontrolled initial open state. Default false. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A field that opens a short list. The list is drawn over the page rather
 * than inside the field's container, so a select in a dialog or a card never
 * stretches it or makes it scroll, and it opens with a quick fade that only
 * moves and fades (no height, blur or radius animation to repaint).
 */
export function Select({
  value,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  children,
}: SelectProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internal, setInternal] = useState(defaultValue);
  const [labels, setLabels] = useState<Map<string, string>>(new Map());

  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const openControlled = openProp !== undefined;
  const open = openControlled ? openProp : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!openControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openControlled],
  );

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [controlled, onValueChange, setOpen],
  );

  const register = useCallback((v: string, label: string) => {
    setLabels((m) => (m.get(v) === label ? m : new Map(m).set(v, label)));
  }, []);
  const unregister = useCallback((v: string) => {
    setLabels((m) => {
      if (!m.has(v)) return m;
      const next = new Map(m);
      next.delete(v);
      return next;
    });
  }, []);

  // Close on a press outside the field and its list, or Escape. Escape is
  // caught on the way down so a dialog around the select stays open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, setOpen]);

  const ctx = useMemo<SelectContextValue>(
    () => ({
      value: current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labelFor: (v) => (v === undefined ? undefined : labels.get(v)),
      triggerId: `${baseId}-trigger`,
      listId: `${baseId}-list`,
      disabled,
      triggerRef,
      listRef,
    }),
    [current, open, setOpen, select, register, unregister, labels, baseId, disabled],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={rootRef} className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps {
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

export function SelectTrigger({ className, children, "aria-label": label }: SelectTriggerProps) {
  const ctx = useSelectContext("SelectTrigger");
  return (
    <button
      ref={ctx.triggerRef}
      type="button"
      id={ctx.triggerId}
      disabled={ctx.disabled}
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      aria-controls={ctx.listId}
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={(e) => {
        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !ctx.open) {
          e.preventDefault();
          ctx.setOpen(true);
          // From the keyboard, straight onto the chosen option.
          requestAnimationFrame(() =>
            ctx.listRef.current?.querySelector<HTMLElement>('[aria-selected="true"], [role="option"]:not(:disabled)')?.focus(),
          );
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
        "hover:border-(--color-border-strong) focus-visible:ring-2 focus-visible:ring-foreground/20",
        ctx.open && "border-(--color-border-strong)",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <ChevronDown
        aria-hidden
        className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", ctx.open && "rotate-180")}
      />
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  const ctx = useSelectContext("SelectValue");
  const label = ctx.labelFor(ctx.value);
  return <span className={cn(label ? "text-foreground" : "text-muted-foreground", className)}>{label ?? placeholder ?? "Select"}</span>;
}

export interface SelectContentProps {
  className?: string;
  children: ReactNode;
}

export function SelectContent({ className, children }: SelectContentProps) {
  const ctx = useSelectContext("SelectContent");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const layout = usePopoverPortalPosition(ctx.triggerRef, ctx.listRef, ready && ctx.open);

  // Below the field, unless there isn't room there and there's more above.
  const room = typeof window === "undefined" ? 0 : window.innerHeight;
  const below = layout ? room - (layout.trigger.top + layout.trigger.height) : 0;
  const above = layout?.trigger.top ?? 0;
  const placement: Placement = layout && below < layout.content.height + GAP + 8 && above > below ? "top" : "bottom";
  const top = layout
    ? placement === "bottom"
      ? layout.trigger.top + layout.trigger.height + GAP
      : layout.trigger.top - layout.content.height - GAP
    : 0;

  // The chosen option is in view when the list opens, even in a long one.
  useLayoutEffect(() => {
    if (!ctx.open) return;
    ctx.listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [ctx.open, ctx.listRef]);

  // Items stay mounted while it's closed so their labels stay registered for
  // the field to show; the list is only hidden.
  if (!ready) return null;
  return createPortal(
    <div
      ref={ctx.listRef}
      id={ctx.listId}
      role="listbox"
      aria-labelledby={ctx.triggerId}
      aria-hidden={!ctx.open}
      inert={!ctx.open}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const options = Array.from(ctx.listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not(:disabled)') ?? []);
        const at = options.indexOf(document.activeElement as HTMLElement);
        options[(at + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
      }}
      style={{
        top,
        left: layout?.trigger.left ?? 0,
        width: layout?.trigger.width,
        transformOrigin: placement === "bottom" ? "top" : "bottom",
      }}
      className={cn(
        "fixed z-[10000] max-h-[min(20rem,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]",
        "transition-[opacity,transform,visibility] duration-150 ease-out motion-reduce:transition-none",
        ctx.open && layout ? "visible translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none scale-[0.98] opacity-0",
        !(ctx.open && layout) && (placement === "bottom" ? "-translate-y-1" : "translate-y-1"),
        className,
      )}
    >
      <ul>{children}</ul>
    </div>,
    document.body,
  );
}

export interface SelectItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function SelectItem({ value, disabled = false, className, children }: SelectItemProps) {
  const ctx = useSelectContext("SelectItem");
  const selected = ctx.value === value;
  const label = typeof children === "string" ? children : value;
  const { register, unregister } = ctx;

  useLayoutEffect(() => {
    register(value, label);
    return () => unregister(value);
  }, [register, unregister, value, label]);

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => ctx.select(value)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors",
          selected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        <span className="min-w-0 truncate">{children}</span>
        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
      </button>
    </li>
  );
}
