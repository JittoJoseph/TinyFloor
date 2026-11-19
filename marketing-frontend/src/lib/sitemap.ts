import { SITE_URL } from "web-shared/lib/site";
import { localeCodes } from "web-shared/lib/i18n/routing";
import { localePath } from "web-shared/lib/seo";
import { HUBS, LANDINGS, LANDINGS_UPDATED } from "web-shared/lib/landings";
import { GUIDES, GUIDES_PATH, guideLocales, guidePath } from "web-shared/lib/guides";
import { OUT_OF_OFFICE_PATH, STANDUP_PATH, TEAM_BUILDING_PATH, TOOLS, TOOLS_PATH, TWO_TRUTHS_PATH, WOULD_YOU_RATHER_PATH } from "@/lib/tools/catalog";
import { ICEBREAKERS_PATH, ICEBREAKERS_UPDATED } from "@/lib/tools/icebreakers";
import { OFFICE_COSTS_PATH, OFFICE_COSTS_UPDATED } from "@/lib/tools/office-costs";
import { OUT_OF_OFFICE_UPDATED } from "@/lib/tools/out-of-office";
import { STANDUP_UPDATED } from "@/lib/tools/standup";
import { TEAM_BUILDING_UPDATED } from "@/lib/tools/team-building";
import { TIME_ZONES_PATH, TIME_ZONES_UPDATED } from "@/lib/tools/time-zones";
import { TWO_TRUTHS_UPDATED } from "@/lib/tools/two-truths";
import { WOULD_YOU_RATHER_UPDATED } from "@/lib/tools/would-you-rather";
import { CHANGELOG_PAGES, CHANGELOG_UPDATED, changelogImage, changelogListPath, changelogOnPage, changelogPageCount, changelogPath } from "@/lib/changelog";
import { HOW_IT_WORKS_PATH, HOW_IT_WORKS_UPDATED } from "@/lib/how-it-works";
import { BLOG_LOCALES, BLOG_PATH, POSTS, postPath } from "@/lib/blog";
import { PRIVACY_UPDATED } from "@/components/legal/privacy";
import { REFUNDS_UPDATED } from "@/components/legal/refunds";
import { TERMS_UPDATED } from "@/components/legal/terms";
import LANDING_ARTICLES from "../../messages/landing-articles/en.json";

/**
 * The day the home page, pricing, the indexes and about last changed (YYYY-MM-DD).
 * Bump it when their words or what they list change.
 */
const PAGES_UPDATED = "2026-10-25";

/** Each tool's own date, the one its page shows. */
const TOOL_UPDATED: Record<string, string> = {
  [ICEBREAKERS_PATH]: ICEBREAKERS_UPDATED,
  [OFFICE_COSTS_PATH]: OFFICE_COSTS_UPDATED,
  [OUT_OF_OFFICE_PATH]: OUT_OF_OFFICE_UPDATED,
  [STANDUP_PATH]: STANDUP_UPDATED,
  [TEAM_BUILDING_PATH]: TEAM_BUILDING_UPDATED,
  [TIME_ZONES_PATH]: TIME_ZONES_UPDATED,
  [TWO_TRUTHS_PATH]: TWO_TRUTHS_UPDATED,
  [WOULD_YOU_RATHER_PATH]: WOULD_YOU_RATHER_UPDATED,
};

/** A page in a sitemap: where it is, the day its words last changed, and the pictures on it. */
type Page = { path: string; updated: string; images?: string[] };

/** A legal page's date as its page shows it ("14 November 2026"), as YYYY-MM-DD. */
const day = (shown: string) => new Date(`${shown} 12:00 UTC`).toISOString().slice(0, 10);

/** The pictures of the product in each page's own text (messages/landing-articles), the same in every language. */
const landingImages = (key: string) => {
  const sections = (LANDING_ARTICLES as Record<string, unknown>)[key];
  return Array.isArray(sections) ? sections.flatMap((section: { image?: { src: string } }) => (section.image ? [section.image.src] : [])) : [];
};

/** A page in every language the site has. */
const everyLanguage = (page: Page): Page[] => localeCodes.map((locale) => ({ ...page, path: localePath(locale, page.path) }));

/**
 * The sitemaps, one a part of the site, each listed in /sitemap.xml. Every
 * date is kept in code and bumped when the words change: one that changed on
 * every request would only teach crawlers to ignore it. Each page declares
 * its language versions in its own head, so they aren't repeated here.
 */
export const SITEMAPS = {
  // The product's own pages: home, pricing, the hubs, about and the pages written for a search, in every
  // language; then the ones in English only (the other languages' copies point to them).
  pages: (): Page[] => [
    ...[
      { path: "/", updated: PAGES_UPDATED },
      { path: "/pricing", updated: PAGES_UPDATED },
      ...Object.values(HUBS).map((slug) => ({ path: `/${slug}`, updated: PAGES_UPDATED })),
      { path: "/about", updated: PAGES_UPDATED },
      ...LANDINGS.map(({ key, slug, updated }) => ({ path: `/${slug}`, updated: updated ?? LANDINGS_UPDATED, images: landingImages(key) })),
    ].flatMap(everyLanguage),
    { path: HOW_IT_WORKS_PATH, updated: HOW_IT_WORKS_UPDATED },
    { path: "/privacy", updated: day(PRIVACY_UPDATED) },
    { path: "/terms", updated: day(TERMS_UPDATED) },
    { path: "/refunds", updated: day(REFUNDS_UPDATED) },
  ],
  // The guides, the index in every language and each guide in the ones it's written in.
  guides: (): Page[] => [
    ...everyLanguage({ path: GUIDES_PATH, updated: PAGES_UPDATED }),
    ...GUIDES.flatMap((guide) => guideLocales(guide).map((locale) => ({ path: localePath(locale, guidePath(guide)), updated: guide.updated }))),
  ],
  // The free tools, the same way.
  tools: (): Page[] => [
    ...everyLanguage({ path: TOOLS_PATH, updated: PAGES_UPDATED }),
    ...TOOLS.flatMap((tool) => tool.locales.map((locale) => ({ path: localePath(locale, tool.path), updated: TOOL_UPDATED[tool.path] }))),
  ],
  // The blog in the languages it has posts in, changing with its newest post, and each post with its cover.
  blog: (): Page[] => [
    ...BLOG_LOCALES.map((locale) => ({ path: localePath(locale, BLOG_PATH), updated: POSTS[0].updated })),
    ...POSTS.flatMap((post) =>
      post.locales.map((locale) => ({ path: localePath(locale, postPath(post)), updated: post.updated, images: [`/blog/${post.slug}.webp`] })),
    ),
  ],
  // The changelog, in English: each of its pages with the pictures of the changes on it (a page's date is
  // its newest change's), then each change with a page of its own, with its pictures.
  changelog: (): Page[] => [
    ...Array.from({ length: changelogPageCount() }, (_, index) => changelogOnPage(index + 1)).map((entries, index) => ({
      path: changelogListPath(index + 1),
      updated: index ? entries[0].date : CHANGELOG_UPDATED,
      images: entries.flatMap((entry) => changelogImage(entry) ?? []),
    })),
    ...CHANGELOG_PAGES().map((entry) => ({
      path: changelogPath(entry),
      updated: entry.date,
      images: [changelogImage(entry), ...(entry.body ?? []).map((section) => (section.image ? `/screens/${section.image.name}.webp` : null))].filter(
        (src): src is string => !!src,
      ),
    })),
  ],
} satisfies Record<string, () => Page[]>;

export type SitemapName = keyof typeof SITEMAPS;

const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const newest = (pages: Page[]) => pages.reduce((latest, page) => (page.updated > latest ? page.updated : latest), "");

/** Where a part's sitemap is served (app/sitemap-<name>.xml). */
export const sitemapPath = (name: SitemapName) => `/sitemap-${name}.xml`;

/**
 * Plain sitemap XML, in the protocol's order (loc, lastmod, then the
 * pictures). No stylesheet and nothing in the XHTML namespace, so a browser
 * shows it as its own readable tree rather than a run of text.
 */
const xml = (body: string[]) =>
  new Response(['<?xml version="1.0" encoding="UTF-8"?>', ...body].join("\n") + "\n", {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });

/** /sitemap.xml: the index of the parts, each with the day its newest page changed. */
export function sitemapIndex() {
  return xml([
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...(Object.keys(SITEMAPS) as SitemapName[]).map((name) =>
      ["  <sitemap>", `    <loc>${escape(absolute(sitemapPath(name)))}</loc>`, `    <lastmod>${newest(SITEMAPS[name]())}</lastmod>`, "  </sitemap>"].join("\n"),
    ),
    "</sitemapindex>",
  ]);
}

/** One part's sitemap: its pages, each once, with their pictures for image search. */
export function sitemap(name: SitemapName) {
  const seen = new Set<string>();
  const pages = SITEMAPS[name]().filter(({ path }) => !seen.has(path) && seen.add(path));
  const images = pages.some((page) => page.images?.length);
  return xml([
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${images ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>`,
    ...pages.map((page) =>
      [
        "  <url>",
        `    <loc>${escape(absolute(page.path))}</loc>`,
        `    <lastmod>${page.updated}</lastmod>`,
        ...[...new Set(page.images ?? [])].map((src) => `    <image:image>\n      <image:loc>${escape(absolute(src))}</image:loc>\n    </image:image>`),
        "  </url>",
      ].join("\n"),
    ),
    "</urlset>",
  ]);
}
