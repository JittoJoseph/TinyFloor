"use client";

import type { ComponentProps } from "react";
import { useLocale } from "next-intl";
import { appHref } from "@/lib/site";

/** A plain link to one of the app's pages, at the app's address, in the reader's language (or `locale`). */
export function AppAnchor({ href, locale, ...props }: Omit<ComponentProps<"a">, "href"> & { href: string; locale?: string }) {
  const current = useLocale();
  return <a {...props} href={appHref(locale || current, href)} />;
}
