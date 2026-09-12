import { seoLayout } from '@/lib/seoLayout';

const route = seoLayout({
  path: '/rooms',
  title: 'roomsTitle',
  description: 'roomsDescription',
  type: 'CollectionPage',
});

export const generateMetadata = route.generateMetadata;
export default route.Layout;
