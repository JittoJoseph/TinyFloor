"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

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
