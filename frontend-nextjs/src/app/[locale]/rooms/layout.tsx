import { localizedMetadata } from '@/lib/seo';

export const generateMetadata = localizedMetadata({
  path: '/rooms',
  title: 'roomsTitle',
  description: 'roomsDescription',
});

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
