import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/room/', '/join/'],
    },
    sitemap: 'https://spatialmeet-app.vercel.app/sitemap.xml',
  };
}
