import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // The preview site is for trying changes; only the real site gets indexed.
  if (new URL(SITE_URL).hostname !== 'www.tinyfloor.com') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/room/', '/join/', '/invite/', '/dashboard', '/*/room/', '/*/join/', '/*/invite/', '/*/dashboard'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
