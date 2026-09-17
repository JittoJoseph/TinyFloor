"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Loader2, X } from "lucide-react";

export const textClass = "font-body text-[var(--color-braun-text)]";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={`rounded-[1.5rem] border border-black/10 bg-white p-5 sm:p-6 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.45)] ${className}`}
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
        {detail && <p className={`${textClass} text-[13px] opacity-55 mt-0.5`}>{detail}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] hover:bg-[#1a1a1a] shadow-sm",
  secondary: "bg-white text-[var(--color-braun-text)] border border-black/10 hover:bg-[#f7f7f3]",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  ghost: "text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:bg-black/[0.04]",
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
      className={`cursor-pointer inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full font-body text-[13px] font-semibold transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export const fieldClass =
  "w-full h-11 px-3.5 rounded-xl bg-[#fbfbf9] border border-black/10 font-body text-[14px] text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-35 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:bg-white focus:border-[var(--color-braun-text)]/40 focus:ring-4 focus:ring-[var(--color-braun-text)]/5";

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-braun-text)] opacity-50 mb-2"
    >
      {children}
    </label>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "live"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-black/[0.05] text-[var(--color-braun-text)]/70",
    accent: "bg-[var(--color-braun-orange)]/10 text-[var(--color-braun-orange)]",
    live: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full font-body text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
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
        className="entry-rise relative w-full max-w-md rounded-[1.5rem] bg-white border border-black/10 p-5 sm:p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]"
      >
        <button
          type="button"
          data-close
          onClick={onClose}
          aria-label={tc("close")}
          className="cursor-pointer absolute top-4 end-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
        >
          <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
        </button>
        <h2 id={titleId} className={`${textClass} text-lg font-semibold tracking-tight pe-8`}>
          {title}
        </h2>
        {description && <p className={`${textClass} text-[13px] opacity-55 mt-1`}>{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

/** A read-only link with a copy button, for invites and guest links. */
export function CopyField({ value }: { value: string }) {
  const t = useTranslations("workspace");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#fbfbf9] border border-black/10 p-1.5 ps-3.5">
      <span dir="ltr" className="flex-1 truncate font-body text-[13px] text-[var(--color-braun-text)]/75">
        {value}
      </span>
      <Button variant="primary" onClick={copy} className="h-8 px-3 shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-body text-[13px] text-red-600">{children}</p>;
}
