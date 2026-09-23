import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/**
 * A legal page's metadata. It is written in English only, so every language's
 * copy points search engines at the English one, with no language versions,
 * rather than being indexed as eighteen duplicates.
 */
export function legalMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const english = pageMetadata({ locale: "en", path, title, description });
  return { ...english, alternates: { canonical: english.alternates?.canonical } };
}
