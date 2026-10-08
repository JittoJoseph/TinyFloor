import type { MetadataRoute } from "next";
import { localeCodes } from "@/lib/i18n/routing";
import { absoluteUrl } from "@/lib/structured-data";

/** The lobby in every language: the app's only page for search (the site's pages are in www's sitemap). */
export default function sitemap(): MetadataRoute.Sitemap {
  return localeCodes.map((locale) => ({ url: absoluteUrl(locale, "/lobby"), changeFrequency: "weekly", priority: 0.8 }));
}
