import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { localeCodes } from '@/lib/i18n/routing';
import { localePath } from '@/lib/seo';
import { HUBS, LANDINGS, LANDINGS_UPDATED } from '@/lib/landings';
import { GUIDES, GUIDES_PATH, guideLocales, guidePath } from '@/lib/guides';
import { OUT_OF_OFFICE_PATH, SECRET_SANTA_PATH, STANDUP_PATH, TEAM_BUILDING_PATH, TOOLS, TOOLS_PATH, TWO_TRUTHS_PATH, WOULD_YOU_RATHER_PATH } from '@/lib/tools/catalog';
import { ICEBREAKERS_PATH, ICEBREAKERS_UPDATED } from '@/lib/tools/icebreakers';
import { OFFICE_COSTS_PATH, OFFICE_COSTS_UPDATED } from '@/lib/tools/office-costs';
import { OUT_OF_OFFICE_UPDATED } from '@/lib/tools/out-of-office';
import { SECRET_SANTA_UPDATED } from '@/lib/tools/secret-santa';
import { STANDUP_UPDATED } from '@/lib/tools/standup';
import { TEAM_BUILDING_UPDATED } from '@/lib/tools/team-building';
import { TIME_ZONES_PATH, TIME_ZONES_UPDATED } from '@/lib/tools/time-zones';
import { TWO_TRUTHS_UPDATED } from '@/lib/tools/two-truths';
import { WOULD_YOU_RATHER_UPDATED } from '@/lib/tools/would-you-rather';

/**
 * The day the home page, pricing, the indexes and about last changed (YYYY-MM-DD).
 * Bump it when their words or what they list change.
 */
const PAGES_UPDATED = '2026-10-26';

/** Each tool's own date, the one its page shows. */
const TOOL_UPDATED: Record<string, string> = {
  [ICEBREAKERS_PATH]: ICEBREAKERS_UPDATED,
  [OFFICE_COSTS_PATH]: OFFICE_COSTS_UPDATED,
  [OUT_OF_OFFICE_PATH]: OUT_OF_OFFICE_UPDATED,
  [SECRET_SANTA_PATH]: SECRET_SANTA_UPDATED,
  [STANDUP_PATH]: STANDUP_UPDATED,
  [TEAM_BUILDING_PATH]: TEAM_BUILDING_UPDATED,
  [TIME_ZONES_PATH]: TIME_ZONES_UPDATED,
  [TWO_TRUTHS_PATH]: TWO_TRUTHS_UPDATED,
  [WOULD_YOU_RATHER_PATH]: WOULD_YOU_RATHER_UPDATED,
};

const routes: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
  updated: string;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1, updated: PAGES_UPDATED },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.9, updated: PAGES_UPDATED },
  ...Object.values(HUBS).map((slug) => ({ path: `/${slug}`, changeFrequency: 'weekly' as const, priority: 0.7, updated: PAGES_UPDATED })),
  { path: '/about', changeFrequency: 'monthly', priority: 0.5, updated: PAGES_UPDATED },
  ...LANDINGS.map(({ slug, updated }) => ({
    path: `/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    updated: updated ?? LANDINGS_UPDATED,
  })),
  { path: GUIDES_PATH, changeFrequency: 'weekly', priority: 0.6, updated: PAGES_UPDATED },
  { path: TOOLS_PATH, changeFrequency: 'monthly', priority: 0.6, updated: PAGES_UPDATED },
];

const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// Every route in every locale. Each page declares its language versions in its
// own head. Every lastmod is a date kept in code and bumped when the words change:
// one that changed on every request would only teach crawlers to ignore it.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...routes.flatMap((route) =>
      localeCodes.map((locale) => ({
        url: absolute(localePath(locale, route.path)),
        lastModified: route.updated,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
    ),
    // The legal pages are in English only; the other languages' copies point here.
    ...['/privacy', '/terms', '/refunds'].map((path) => ({ url: absolute(path), changeFrequency: 'yearly' as const, priority: 0.3 })),
    // The guides and the free tools, each in the languages it's written in. A guide's
    // date is the day its words last changed, so it's a lastmod crawlers can trust.
    ...GUIDES.flatMap((guide) =>
      guideLocales(guide).map((locale) => ({
        url: absolute(localePath(locale, guidePath(guide))),
        lastModified: guide.updated,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ),
    ...TOOLS.flatMap((tool) =>
      tool.locales.map((locale) => ({
        url: absolute(localePath(locale, tool.path)),
        lastModified: TOOL_UPDATED[tool.path],
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ),
  ];
}
