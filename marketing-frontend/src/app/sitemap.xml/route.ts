import { sitemapIndex } from "@/lib/sitemap";

export const dynamic = "force-static";

/** The sitemap index: one sitemap a part of the site (lib/sitemap.ts). robots.txt points here. */
export const GET = () => sitemapIndex();
