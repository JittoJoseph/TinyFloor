import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { localeCodes } from '@/lib/i18n/routing';
import { localePath } from '@/lib/seo';
import { LANDINGS } from '@/lib/landings';

const routes: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/rooms', changeFrequency: 'daily', priority: 0.8 },
  { path: '/people', changeFrequency: 'daily', priority: 0.6 },
  { path: '/create-room', changeFrequency: 'monthly', priority: 0.5 },
  ...LANDINGS.map(({ slug }) => ({
    path: `/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  })),
];

const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// Every route in every locale. Each page declares its language versions in its
// own head, and a lastmod that changes on every request would only teach
// crawlers to ignore it, so the sitemap stays a plain list of URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) =>
    localeCodes.map((locale) => ({
      url: absolute(localePath(locale, route.path)),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  );
}
