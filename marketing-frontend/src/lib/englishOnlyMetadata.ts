import type { Metadata } from "next";
import { pageMetadata } from "web-shared/lib/seo";

/**
 * Metadata for a page written in English only (the legal pages, the free
 * tools): every language's copy points search engines at the English one, with
 * no language versions, rather than being indexed as eighteen duplicates.
 */
export function englishOnlyMetadata({ path, title, description, image, imageAlt }: { path: string; title: string; description: string; image?: string; imageAlt?: string }): Metadata {
  const english = pageMetadata({ locale: "en", path, title, description, image, imageAlt });
  return { ...english, alternates: { canonical: english.alternates?.canonical } };
}
