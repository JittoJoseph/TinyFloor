import { seoLayout } from '@/lib/seoLayout';

const route = seoLayout({
  path: '/create-room',
  title: 'createRoomTitle',
  description: 'createRoomDescription',
});

export const generateMetadata = route.generateMetadata;
export default route.Layout;
