import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { localeCodes } from '@/lib/i18n/routing';
import { languageAlternates, localePath } from '@/lib/seo';

const routes: Array<{
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/rooms', changeFrequency: 'daily', priority: 0.8 },
  { path: '/people', changeFrequency: 'daily', priority: 0.6 },
  { path: '/create-room', changeFrequency: 'monthly', priority: 0.5 },
];

const absolute = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;

// Every route in every locale, each entry carrying its hreflang alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.flatMap((route) => {
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(route.path)).map(([code, path]) => [
        code,
        absolute(path),
      ]),
    );

    return localeCodes.map((locale) => ({
      url: absolute(localePath(locale, route.path)),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    }));
  });
}
