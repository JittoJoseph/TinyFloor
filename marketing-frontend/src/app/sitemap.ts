import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { localeCodes } from '@/lib/i18n/routing';
import { localePath } from '@/lib/seo';
import { HUBS, LANDINGS } from '@/lib/landings';
import { GUIDES, GUIDES_PATH, guidePath } from '@/lib/guides';

const routes: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.9 },
  ...Object.values(HUBS).map((slug) => ({ path: `/${slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  ...LANDINGS.map(({ slug }) => ({
    path: `/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
  { path: GUIDES_PATH, changeFrequency: 'weekly', priority: 0.6 },
  ...GUIDES.map((guide) => ({ path: guidePath(guide), changeFrequency: 'monthly' as const, priority: 0.6 })),
];

const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// Every route in every locale. Each page declares its language versions in its
// own head, and a lastmod that changes on every request would only teach
// crawlers to ignore it, so the sitemap stays a plain list of URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...routes.flatMap((route) =>
      localeCodes.map((locale) => ({
        url: absolute(localePath(locale, route.path)),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      })),
    ),
    // The legal pages are in English only; the other languages' copies point here.
    ...['/privacy', '/terms', '/refunds'].map((path) => ({ url: absolute(path), changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
}
