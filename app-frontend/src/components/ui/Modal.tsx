"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/ui/icons";
import { SPRING_PANEL } from "@/lib/ease";
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

/**
 * The app's modal: on a wide screen a card that settles into the middle (a
 * short fade and rise, nothing that unfolds or bounces), on a phone a sheet
 * from the bottom. Escape and the backdrop close it, focus stays inside while
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
    const frame = requestAnimationFrame(() => panel.current?.focus());
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

  const hidden = reduce ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, y: 12, scale: 0.985 };
  const shown = reduce ? { opacity: 1 } : phone ? { y: 0 } : { opacity: 1, y: 0, scale: 1 };
  const leaving = reduce ? { opacity: 0 } : phone ? { y: "100%" } : { opacity: 0, y: 6, scale: 0.99 };

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
                transition={{ duration: 0.2 }}
                {...gate}
                onClick={() => dismissible && onClose()}
                className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-[2px] dark:bg-black/55"
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
                  transition={reduce ? { duration: 0.15 } : { ...SPRING_PANEL, opacity: { duration: 0.18 } }}
                  {...gate}
                  className={cn(
                    "pointer-events-auto relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain border border-border bg-card shadow-[0_24px_64px_-24px_rgb(0_0_0/0.45)] outline-none",
                    "rounded-t-[26px] pb-[env(safe-area-inset-bottom)] sm:max-h-[calc(100dvh-3rem)] sm:max-w-[28rem] sm:rounded-[26px] sm:pb-0",
                    className,
                  )}
                >
                  {phone && <span aria-hidden className="mx-auto mt-2.5 block h-1 w-9 rounded-full bg-foreground/15" />}
                  {children}
                  {dismissible && (
                    <button
                      type="button"
                      aria-label={closeLabel}
                      onClick={onClose}
                      className="absolute end-3.5 top-3.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-4" />
                    </button>
                  )}
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
