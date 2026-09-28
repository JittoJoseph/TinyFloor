"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, X } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/app/Logo";

/**
 * The nav on a phone: one button that opens a full-screen menu over the page.
 * The links come from the server with the page and are drawn when it opens,
 * in sections that fold open; the two ways in wait at the bottom, where a
 * thumb is. The page underneath doesn't scroll while it's open, and following
 * any link, pressing Escape or the close button shuts it. It is drawn on the
 * page's body: the floating bar blurs what's behind it, and a blur would
 * otherwise keep a full-screen layer inside the bar.
 */
export function MobileMenu({ label, actions, children }: { label: string; actions: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  // In the browser, after the page has hydrated: the menu goes on document.body, which the server has none of.
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = before;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-foreground/[0.06] text-foreground"
      >
        <Menu className="size-[18px]" />
      </button>
      {client &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                onClick={(event) => (event.target as HTMLElement).closest("a") && setOpen(false)}
                className="fixed inset-0 z-50 flex flex-col bg-background"
              >
                <div className="flex h-16 shrink-0 items-center justify-between px-5">
                  <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-foreground">
                    <Logo size={28} />
                    TinyFloor
                  </span>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => setOpen(false)}
                    className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-foreground/[0.06] text-foreground"
                  >
                    <X className="size-[18px]" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
                <div className="grid shrink-0 gap-2 border-t border-border bg-background px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                  {actions}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/**
 * A section of the phone menu that folds open, the first one open to begin
 * with. The sections share a name, so the browser keeps one open at a time:
 * opening another folds the last one away.
 */
export function MobileSection({ title, open = false, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details name="nav-section" open={open} className="group/section border-b border-border py-1">
      <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-1 text-[16px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 text-faint transition-transform duration-200 group-open/section:rotate-180" />
      </summary>
      <ul className="grid gap-0.5 pb-3">{children}</ul>
    </details>
  );
}
