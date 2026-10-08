import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // The preview site is for trying changes; only the real site gets indexed.
  if (new URL(SITE_URL).hostname !== 'www.tinyfloor.com') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  // The app's addresses only redirect to app.tinyfloor.com now, which keeps its own robots.txt.
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
