import { useFormatter, useNow, useTranslations } from "next-intl";

const MINUTE = 60 * 1000;
const WEEK = 7 * 24 * 60 * MINUTE;

/**
 * Locale-aware "5 minutes ago" for ISO timestamps. Under a minute reads as
 * "just now"; with `dateAfterWeek`, anything older than a week shows the date.
 * Re-renders once a minute so the labels stay current.
 */
export function useTimeAgo({ narrow = false, dateAfterWeek = false } = {}) {
  const t = useTranslations("common");
  const format = useFormatter();
  const now = useNow({ updateInterval: MINUTE });

  return (value?: string) => {
    if (!value) return t("unknown");
    const date = new Date(value);
    const age = now.getTime() - date.getTime();
    if (age < MINUTE) return t("justNow");
    if (dateAfterWeek && age >= WEEK) return format.dateTime(date);
    return format.relativeTime(date, { now, style: narrow ? "narrow" : "long" });
  };
}
