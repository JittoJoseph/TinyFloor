"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

/**
 * The nav on a phone: one button that opens a sheet of the same links under
 * the bar. The links come from the server with the page, and are drawn when
 * the sheet opens; it closes again when one of them is followed.
 */
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-foreground/[0.06] text-foreground"
      >
        {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
      </button>
      {open && (
        <div
          onClick={(event) => (event.target as HTMLElement).closest("a") && setOpen(false)}
          className="absolute inset-x-3 top-full mt-1 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-[22px] border border-border bg-card p-5 shadow-float"
        >
          {children}
        </div>
      )}
    </div>
  );
}
