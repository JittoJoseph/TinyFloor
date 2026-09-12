import { seoLayout } from '@/lib/seoLayout';

const route = seoLayout({
  path: '/people',
  title: 'peopleTitle',
  description: 'peopleDescription',
  type: 'CollectionPage',
});

export const generateMetadata = route.generateMetadata;
export default route.Layout;
