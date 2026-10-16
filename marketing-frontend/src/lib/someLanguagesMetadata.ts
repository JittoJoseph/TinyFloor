import type { Metadata } from "next";
import { localePath, pageMetadata } from "@/lib/seo";

/**
 * Metadata for a page written in only some languages (the free tools): each of
 * those is its own page with the others as language versions, and English
 * stands in for every language it isn't written in.
 */
export function someLanguagesMetadata({
  locale,
  locales,
  path,
  title,
  description,
}: {
  locale: string;
  locales: string[];
  path: string;
  title: string;
  description: string;
}): Metadata {
  const page = pageMetadata({ locale, path, title, description });
  const languages = Object.fromEntries(locales.map((code) => [code, localePath(code, path)]));
  return { ...page, alternates: { canonical: page.alternates?.canonical, languages: { ...languages, "x-default": localePath("en", path) } } };
}
