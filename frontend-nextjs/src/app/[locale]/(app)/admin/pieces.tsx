"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

/** The time the view was opened, so "how long ago" holds still while it's read. */
export function useOpenedAt() {
  return useState(() => Date.now())[0];
}

/** How long ago, in words, with the exact time on hover. */
export function When({ at }: { at: number }) {
  const locale = useLocale();
  const now = useOpenedAt();
  const seconds = Math.round((at - now) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const [unit, size] = units.find(([, span]) => Math.abs(seconds) >= span) ?? ["second", 1];
  const text = Math.abs(seconds) < 60 ? "just now" : new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
  return <time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString(locale)}>{text}</time>;
}

/** A dialog's button: quiet, solid for the main action, or red for one that can't be undone. */
export function DialogButton({
  children,
  onClick,
  disabled,
  solid,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  solid?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-10 cursor-pointer rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "bg-destructive text-white hover:bg-destructive/90" : solid ? "bg-foreground text-background hover:bg-foreground/85" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
