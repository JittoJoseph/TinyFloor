"use client";

import React, { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";

const textClass = " text-foreground";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={`rounded-[1.25rem] border border-border bg-card p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className={`${textClass} text-[15px] font-semibold tracking-tight`}>{title}</h2>
        {detail && <p className={`text-[13px] text-muted-foreground mt-0.5`}>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/90 ",
  secondary: "bg-card text-foreground border border-border hover:bg-muted",
  danger: "bg-card text-destructive border border-destructive/25 hover:bg-destructive/10",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
};

export function Button({
  variant = "secondary",
  busy = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`cursor-pointer inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

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
        <button
          type="button"
          data-close
          onClick={onClose}
          aria-label={tc("close")}
          className="cursor-pointer absolute top-4 end-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-foreground opacity-60" />
        </button>
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
