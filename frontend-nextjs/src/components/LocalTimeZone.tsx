"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { NextIntlClientProvider, useLocale } from "next-intl";

const noop = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Times in the reader's own time zone. Everything is stored as UTC moments,
 * but the server renders in its own zone (UTC on Workers) and next-intl hands
 * that zone to the browser; once the page is live this swaps in the browser's.
 */
export function LocalTimeZone({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const timeZone = useSyncExternalStore(noop, browserZone, () => undefined);
  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
