"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePopoverPortalPosition } from "@/components/motion/popover-position";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "right";
type Align = "start" | "end";

type MorphContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  /** The element the panel measures against — see `registerTrigger`. */
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  registerTrigger: (node: HTMLElement | null) => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
};

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error(`${component} must be used within <MorphPopover>`);
  return ctx;
}

export interface MorphPopoverProps {
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * A popover whose panel opens from the trigger corner with a quick fade and
 * scale. Closes on outside pointer / Escape. Controlled or uncontrolled.
 */
export function MorphPopover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: MorphPopoverProps) {
  const baseId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);

  // A trigger normally registers itself through MorphPopoverTrigger. It can't
  // when something else already clones the element — a Tooltip wrapping the
  // button, say — and an unregistered trigger leaves the panel with nothing to
  // measure against, so it renders permanently invisible. The root boxes the
  // trigger exactly (the content portals out of it), so it stands in until a
  // real trigger registers, and stands in again if that one unmounts. Both are
  // state, so a trigger arriving while the panel is open re-anchors it.
  const anchorRef = useMemo<React.MutableRefObject<HTMLElement | null>>(
    () => ({ current: trigger ?? root }),
    [root, trigger],
  );

  // The panel is a `role="dialog"` and goes inert the moment it closes, so
  // focus cannot be left sitting inside it: a dismissal hands it back to the
  // trigger, the way the ARIA dialog pattern asks. A pointer dismissal takes
  // the focus onward itself when it lands on something focusable — this only
  // catches the case where it would otherwise be stranded. When no trigger has
  // registered, the root anchor stands in only if it can actually hold focus;
  // there is nowhere better than where the keyboard already is, so leave it.
  const close = useCallback(() => {
    setOpen(false);
    const focused = document.activeElement;
    const inPanel =
      focused instanceof HTMLElement && contentRef.current?.contains(focused);
    if (!inPanel) return;
    const restore = trigger ?? (root && root.tabIndex >= 0 ? root : null);
    restore?.focus();
  }, [root, setOpen, trigger]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        root &&
        !root.contains(target) &&
        !contentRef.current?.contains(target)
      )
        close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, root, close]);

  const ctx = useMemo<MorphContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      triggerId: `${baseId}-trigger`,
      contentId: `${baseId}-content`,
      triggerRef: anchorRef,
      registerTrigger: setTrigger,
      contentRef,
    }),
    [open, setOpen, toggle, baseId, anchorRef],
  );

  return (
    <MorphContext.Provider value={ctx}>
      <div ref={setRoot} className={cn("relative inline-flex", className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphPopoverTriggerProps {
  children: ReactElement;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object")
        (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

/** Wraps a single element, toggling the popover on click. */
export function MorphPopoverTrigger({ children }: MorphPopoverTriggerProps) {
  const ctx = useMorphContext("MorphPopoverTrigger");
  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const childOnClick = child.props.onClick as
    | ((e: unknown) => void)
    | undefined;
  const childRef = (child.props as { ref?: Ref<HTMLElement> }).ref;

  return cloneElement(child, {
    id: ctx.triggerId,
    ref: mergeRefs(childRef, ctx.registerTrigger),
    onClick: (e: unknown) => {
      childOnClick?.(e);
      ctx.toggle();
    },
    "aria-haspopup": "dialog",
    "aria-expanded": ctx.open,
    "aria-controls": ctx.open ? ctx.contentId : undefined,
  });
}

const originFor = (side: Side, align: Align) =>
  side === "right"
    ? `left ${align === "end" ? "bottom" : "top"}`
    : `${side === "bottom" ? "top" : "bottom"} ${align === "end" ? "right" : "left"}`;

// Opens from the trigger's corner with a quick fade and scale: only opacity
// and transform move, which the compositor does alone. (A clip-path reveal
// under a drop-shadow filter repainted the whole panel every frame, and
// stuttered over the floor.)
const OPEN = { duration: 0.16, ease: EASE_OUT } as const;
const CLOSE = { duration: 0.11, ease: EASE_OUT } as const;

export interface MorphPopoverContentProps {
  children: ReactNode;
  side?: Side;
  align?: Align;
  /** Gap between trigger and panel, in px. Default 8. */
  sideOffset?: number;
  /** Panel corner radius, in px. Default 16. */
  radius?: number;
  className?: string;
}

export function MorphPopoverContent({
  children,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  radius = 16,
  className,
}: MorphPopoverContentProps) {
  const ctx = useMorphContext("MorphPopoverContent");
  const reduce = useReducedMotion() ?? false;
  const [portalReady, setPortalReady] = useState(false);
  const layout = usePopoverPortalPosition(
    ctx.triggerRef,
    ctx.contentRef,
    portalReady && ctx.open,
  );

  useEffect(() => setPortalReady(true), []);
  const rawLeft = layout
    ? side === "right"
      ? layout.trigger.left + layout.trigger.width + sideOffset
      : align === "end"
        ? layout.trigger.left + layout.trigger.width - layout.content.width
        : layout.trigger.left
    : 0;
  const rawTop = layout
    ? side === "right"
      ? align === "end"
        ? layout.trigger.top + layout.trigger.height - layout.content.height
        : layout.trigger.top
      : side === "bottom"
        ? layout.trigger.top + layout.trigger.height + sideOffset
        : layout.trigger.top - layout.content.height - sideOffset
    : 0;
  // Keep the whole panel on screen, which matters on a phone.
  const clamp = (value: number, size: number, room: number) => Math.max(8, Math.min(value, room - size - 8));
  const left = layout && typeof window !== "undefined" ? clamp(rawLeft, layout.content.width, window.innerWidth) : rawLeft;
  const top = layout && typeof window !== "undefined" ? clamp(rawTop, layout.content.height, window.innerHeight) : rawTop;

  const shift = side === "right" ? { x: -4 } : { y: side === "bottom" ? -4 : 4 };
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, ...shift };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0, y: 0 };

  // Keep the server and first client render identical, then mount the portal.
  if (!portalReady) return null;

  return createPortal(
    <AnimatePresence>
      {ctx.open ? (
        <motion.div
          data-morph-popover-portal=""
          ref={ctx.contentRef}
          id={ctx.contentId}
          role="dialog"
          aria-labelledby={ctx.triggerId}
          initial={hidden}
          animate={{ ...shown, transition: reduce ? { duration: 0.12 } : OPEN }}
          exit={{ ...hidden, transition: reduce ? { duration: 0.1 } : CLOSE }}
          style={{
            left,
            top,
            borderRadius: radius,
            visibility: layout ? "visible" : "hidden",
            transformOrigin: originFor(side, align),
          }}
          className={cn(
            "fixed z-[9999] overflow-hidden border border-border bg-background shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]",
            className,
          )}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
