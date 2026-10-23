"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/ui/CloseButton";
import { EASE_OUT } from "@/lib/ease";
import { PresenceGate } from "@/lib/presence-gate";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PHONE = "(max-width: 639px)";

const subscribePhone = (change: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

/** Short and eased, moving only opacity and transform, so it stays smooth over a busy floor. */
const PANEL_IN = { duration: 0.2, ease: EASE_OUT } as const;
const PANEL_OUT = { duration: 0.14, ease: EASE_OUT } as const;
const SHEET = { duration: 0.28, ease: EASE_OUT } as const;
/** A sheet pulled down this far, or flicked down this fast, closes. */
const DISMISS_DISTANCE = 96;
const DISMISS_SPEED = 500;

/**
 * The app's modal: on a wide screen a card that settles into the middle (a
 * short fade and rise, nothing that unfolds or bounces), on a phone a sheet
 * from the bottom that its handle pulls down to close. The backdrop is a plain dim, not a blur: blurring the live
 * floor behind it would mean re-blurring the canvas every frame. Escape and the backdrop close it, focus stays inside while
 * it's open and goes back where it was after, and the page behind doesn't
 * scroll.
 */
export function Modal({
  open,
  onClose,
  label,
  closeLabel,
  dismissible = true,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** What a screen reader announces for it. */
  label: string;
  closeLabel: string;
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const phone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const drag = useDragControls();
  // Only the handle starts a pull, so the sheet's own content still scrolls.
  const swipe = phone && dismissible && !reduce;
  const released = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_SPEED) onClose();
  };

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // The panel itself first, not its close button: nothing looks selected as it opens.
    // A field that asked for focus (autoFocus) keeps it.
    const frame = requestAnimationFrame(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const all = focusables();
      if (!all.length) return event.preventDefault();
      const first = all[0];
      const last = all[all.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, dismissible]);

  if (!mounted) return null;

  const hidden = reduce ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, y: 8, scale: 0.98 };
  const shown = reduce
    ? { opacity: 1, transition: { duration: 0.15 } }
    : phone
      ? { y: 0, transition: SHEET }
      : { opacity: 1, y: 0, scale: 1, transition: PANEL_IN };
  const leaving = reduce
    ? { opacity: 0, transition: { duration: 0.12 } }
    : phone
      ? { y: "100%", transition: { ...SHEET, duration: 0.22 } }
      : { opacity: 0, y: 4, scale: 0.99, transition: PANEL_OUT };

  return createPortal(
    <AnimatePresence>
      {open && (
        <PresenceGate>
          {({ isPresent, gate }) => (
            <>
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                {...gate}
                onClick={() => dismissible && onClose()}
                className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60"
              />
              <div
                inert={!isPresent}
                className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
              >
                <motion.div
                  ref={panel}
                  role="dialog"
                  aria-modal="true"
                  aria-label={label}
                  tabIndex={-1}
                  initial={hidden}
                  animate={shown}
                  exit={leaving}
                  {...gate}
                  {...(swipe
                    ? {
                        drag: "y" as const,
                        dragControls: drag,
                        dragListener: false,
                        dragConstraints: { top: 0, bottom: 0 },
                        dragElastic: { top: 0, bottom: 0.9 },
                        onDragEnd: released,
                      }
                    : {})}
                  className={cn(
                    "pointer-events-auto relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain border border-border bg-card shadow-[0_24px_64px_-24px_rgb(0_0_0/0.45)] outline-none",
                    "rounded-t-[26px] pb-[env(safe-area-inset-bottom)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[28rem] sm:rounded-[26px] sm:pb-0",
                    className,
                  )}
                >
                  {phone && (
                    // The handle: pulled down, the sheet follows and closes past a point.
                    <div
                      aria-hidden
                      onPointerDown={(event) => swipe && drag.start(event)}
                      className="flex h-6 cursor-grab touch-none items-start justify-center pt-2.5 active:cursor-grabbing"
                    >
                      <span className="block h-1 w-9 rounded-full bg-foreground/15" />
                    </div>
                  )}
                  {children}
                  {dismissible && <CloseButton label={closeLabel} onClick={onClose} className="absolute end-4 top-4" />}
                </motion.div>
              </div>
            </>
          )}
        </PresenceGate>
      )}
    </AnimatePresence>,
    document.body,
  );
}
