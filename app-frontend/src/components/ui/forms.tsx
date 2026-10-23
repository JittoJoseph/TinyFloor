"use client";

import React, { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { CloseButton } from "@/components/ui/CloseButton";

const textClass = " text-foreground";

export const fieldClass =
  "w-full h-11 px-3.5 rounded-xl bg-background border border-border text-[16px] sm:text-[14px] text-foreground placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-200 focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.06]";

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12.5px] font-medium text-muted-foreground mb-2"
    >
      {children}
    </label>
  );
}

/** A modal with a title, closed by its button, Escape or a click outside. */
export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const tc = useTranslations("common");
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("input, select, button:not([data-close])")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="entry-rise relative w-full max-w-md rounded-[1.5rem] bg-card border border-border p-5 sm:p-6 shadow-float"
      >
        <CloseButton label={tc("close")} onClick={onClose} className="absolute end-4 top-4" />
        <h2 id={titleId} className={`${textClass} text-lg font-semibold tracking-tight pe-8`}>
          {title}
        </h2>
        {description && <p className={`text-[13px] text-muted-foreground mt-1`}>{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[13px] text-destructive">{children}</p>;
}
